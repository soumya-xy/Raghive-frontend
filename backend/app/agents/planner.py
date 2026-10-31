from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.models.state import GraphState, PlanSteps, SubQuestion
from app.services.attention import get_xai_tokenizer, run_attention_pass
from app.services.entities import extract_reference_entities
from app.services.llm import get_chat_llm, llm_available
from app.services.thresholds import get_thresholds
from app.services.verification import (
    attention_xai_check,
    decide_overall,
    entity_coverage_check,
    requirement_coverage_check,
    self_consistency_check,
)
from app.services.xai_verifier import verify_planner_focus

logger = logging.getLogger(__name__)

PLANNER_SYSTEM_PROMPT = """You are a query decomposition expert.
Break the user query into a dependency graph of sub-questions.
Think step by step.
Identify which sub-questions must be answered before others.
Be precise about what information needs to be retrieved.

Provide a self-assessed initial_confidence score between 0.0 and 1.0.
That score is a routing hint only — downstream verification will not use it as PASS/FAIL."""


def generate_plan(query: str, llm_client) -> PlanSteps:
    # Strategy 1: LangChain structured output
    try:
        structured_llm = llm_client.with_structured_output(PlanSteps)
        response = structured_llm.invoke(
            [
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ]
        )
        if isinstance(response, PlanSteps):
            return response
        return PlanSteps.model_validate(response)
    except Exception as exc:
        logger.warning("with_structured_output failed: %s; falling back to JSON completion", exc)

    # Strategy 2: Direct JSON prompt fallback for Groq / OpenAI-compatible models
    from app.services.llm import chat_complete

    json_prompt = (
        f"{PLANNER_SYSTEM_PROMPT}\n\n"
        "Return ONLY a JSON object with this exact structure:\n"
        "{\n"
        f'  "original_query": {json.dumps(query)},\n'
        '  "sub_questions": [\n'
        '    {"step_id": 1, "question": "...", "depends_on": [], "search_keywords": ["..."]}\n'
        '  ],\n'
        '  "chain_of_thought": "...",\n'
        '  "initial_confidence": 0.8\n'
        "}\n\n"
        f"User query: {query}"
    )
    raw = chat_complete("You are an expert query decomposer that outputs valid JSON only.", json_prompt)
    clean = raw.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?", "", clean).strip()
        if clean.endswith("```"):
            clean = clean[:-3].strip()
    return PlanSteps.model_validate_json(clean)


def _heuristic_plan(query: str) -> PlanSteps:
    parts = [p.strip() for p in re_split_questions(query)]
    if not parts:
        parts = [query]
    subs = []
    for i, part in enumerate(parts, start=1):
        q = part if part.endswith("?") else part.rstrip(".") + "?"
        subs.append(
            {
                "step_id": i,
                "question": q,
                "depends_on": [i - 1] if i > 1 else [],
                "search_keywords": [w for w in q.replace("?", "").split() if len(w) > 3][:6],
            }
        )
    return PlanSteps(
        original_query=query,
        sub_questions=subs,
        chain_of_thought="Heuristic decomposition used because the generation LLM was unreachable.",
        initial_confidence=0.7,
    )


def re_split_questions(query: str) -> list[str]:
    chunks = re.split(r"\s+and\s+|\?\s+", query, flags=re.I)
    return [c.strip(" ?") for c in chunks if len(c.strip(" ?")) > 6]


def _safe_generate(query: str) -> PlanSteps:
    if llm_available():
        try:
            return generate_plan(query, get_chat_llm())
        except Exception as exc:
            logger.warning("LLM plan generation error: %s; falling back to heuristic", exc)
    from app.config import get_settings

    if not get_settings().raghive_allow_heuristic_llm:
        raise RuntimeError("Generation LLM unreachable and RAGHIVE_ALLOW_HEURISTIC_LLM=false")
    return _heuristic_plan(query)


def _plan_text(plan: PlanSteps) -> str:
    return plan.chain_of_thought + " " + " ".join(sq.question for sq in plan.sub_questions)


def _run_suite(query: str, plan: PlanSteps, reference_entities: list[dict[str, Any]], strictness: str) -> tuple[dict[str, Any], dict[str, Any], float, str]:
    thr = get_thresholds(strictness)
    entity = entity_coverage_check(reference_entities, plan)
    requirement = requirement_coverage_check(query, plan)

    initial = plan.initial_confidence
    if initial is None or not (0.0 <= float(initial) <= 1.0):
        initial = 0.7  # malformed → treat as borderline, always trigger self-consistency
        plan.initial_confidence = initial

    run_sc = (
        (0.5 <= float(initial) <= 0.85 or strictness == "thorough")
        and entity["status"] != "FAIL"
    )
    skip_reason = "skipped - high initial confidence" if float(initial) > 0.85 else "skipped - entity coverage already FAIL"
    if strictness == "thorough" and entity["status"] == "FAIL":
        skip_reason = "skipped - entity coverage already FAIL"
    elif 0.5 <= float(initial) <= 0.85:
        skip_reason = "borderline self-report - would run if entity coverage passed"

    self_c = self_consistency_check(
        query,
        plan,
        generate_plan,
        run=run_sc,
        skip_reason=skip_reason if not run_sc else "",
        threshold=thr.self_consistency_threshold,
    )

    keywords = [e["text"] for e in reference_entities]
    attention_output = run_attention_pass(query, _plan_text(plan), keywords)
    xai_result = verify_planner_focus(reference_entities, attention_output, threshold=thr.xai_threshold)
    attn_check = attention_xai_check(xai_result, thr.xai_threshold)

    parts = {
        "entity_coverage": entity,
        "requirement_coverage": requirement,
        "self_consistency": self_c,
        "attention_xai": attn_check,
    }
    overall, flags, confidence, flag = decide_overall(parts)
    report = {
        **parts,
        "overall_status": overall,
        "flags": flags,
        "xai_result": xai_result,
    }
    return report, attention_output, confidence, flag


def planner_node(state: GraphState) -> GraphState:
    query = state["original_question"]
    strictness = state.get("verification_strictness") or "standard"
    human_reviewed = bool(state.get("human_reviewed"))

    tokenizer = get_xai_tokenizer()
    reference_entities = extract_reference_entities(query, tokenizer)
    keywords = [e["text"] for e in reference_entities]

    # ── Dynamic Query Complexity Router ──────────────────────────────────
    from app.services.router import QueryRoute, classify_query_complexity

    route_decision = classify_query_complexity(query, reference_entities)
    state["route_decision"] = route_decision.model_dump()

    # Fast-path for DIRECT_FACTOID queries
    if route_decision.route == QueryRoute.DIRECT_FACTOID and not human_reviewed:
        logger.info(
            "[router] Fast-path DIRECT_FACTOID engaged for query: '%s' (conf=%.2f)",
            query[:40],
            route_decision.confidence,
        )
        fast_plan = PlanSteps(
            original_query=query,
            sub_questions=[
                SubQuestion(
                    step_id=1,
                    question=query,
                    depends_on=[],
                    search_keywords=keywords or [w for w in query.split() if len(w) > 3][:6],
                )
            ],
            chain_of_thought=f"Fast-path single-hop factoid route selected for '{query}'. Directly targeted for precision retrieval.",
            initial_confidence=route_decision.confidence,
        )

        report = {
            "entity_coverage": {"status": "PASS", "missed": [], "coverage_pct": 1.0},
            "requirement_coverage": {"status": "PASS", "missed_requirements": [], "coverage_pct": 1.0},
            "self_consistency": {"status": "SKIP", "similarity": 1.0, "reason": "fast-path direct factoid route"},
            "attention_xai": {"status": "PASS", "overall_score": 0.95},
            "overall_status": "PASS",
            "flags": ["FAST_PATH_ROUTED"],
            "xai_result": {"overall_score": 0.95, "token_scores": []},
        }
        attention_output = {
            "attention_matrix": [[1.0]],
            "tokens": [query],
            "query_token_span": (0, 1),
            "plan_token_span": (0, 1),
            "token_received_attention": [1.0],
        }

        state.update(
            {
                "plan": fast_plan,
                "reference_entities": reference_entities,
                "keywords": keywords,
                "verification_report": report,
                "confidence": route_decision.confidence,
                "confidence_flag": "HIGH",
                "attention_weights": attention_output,
                "retried": False,
                "retry_reason": None,
                "awaiting_human_input": False,
                "human_reviewed": False,
                "history": [
                    {
                        "agent": "planner",
                        "analysis": fast_plan.chain_of_thought,
                        "confidence": route_decision.confidence,
                        "overall_status": "PASS",
                        "flags": ["FAST_PATH_ROUTED"],
                        "retried": False,
                        "route": route_decision.route.value,
                    }
                ],
            }
        )
        return state

    plan = _safe_generate(query)
    report, attention_output, confidence, flag = _run_suite(query, plan, reference_entities, strictness)

    retried = False
    retry_reason = None
    if report["overall_status"] == "FAIL" and not human_reviewed:
        bits = []
        missed = report["entity_coverage"].get("missed") or []
        if missed:
            bits.append(f"Previous attempt missed entities: {missed}.")
        missed_req = report["requirement_coverage"].get("missed_requirements") or []
        if missed_req:
            bits.append(f"Previous attempt did not address: {missed_req}.")
        retry_reason = "\n".join(bits).strip() or "Verification FAIL — regenerating with corrective feedback."
        retried = True
        plan = _safe_generate(query + "\n" + retry_reason)
        report, attention_output, confidence, flag = _run_suite(query, plan, reference_entities, strictness)

    awaiting = bool(retried and report["overall_status"] == "FAIL" and not human_reviewed)

    history_entry = {
        "agent": "planner",
        "analysis": plan.chain_of_thought,
        "confidence": confidence,
        "overall_status": report["overall_status"],
        "retried": retried,
    }

    matrix = attention_output["attention_matrix"]
    token_recv = attention_output["token_received_attention"]
    state.update(
        {
            "plan": plan,
            "reference_entities": reference_entities,
            "keywords": keywords,
            "verification_report": report,
            "confidence": confidence,
            "confidence_flag": flag,
            "attention_weights": {
                "matrix": matrix.tolist() if hasattr(matrix, "tolist") else matrix,
                "attention_matrix": matrix.tolist() if hasattr(matrix, "tolist") else matrix,
                "token_received_attention": token_recv.tolist() if hasattr(token_recv, "tolist") else token_recv,
                "tokens": attention_output["tokens"],
                "query_token_span": attention_output["query_token_span"],
                "plan_token_span": attention_output["plan_token_span"],
            },
            "retried": retried,
            "retry_reason": retry_reason,
            "awaiting_human_input": awaiting,
            "current_step_index": 0,
            "verification_strictness": strictness,
            "history": [history_entry],
        }
    )
    return state


def recheck_edited_plan(state: GraphState) -> GraphState:
    """Cheap checks after a human edit — do not block again."""
    query = state["original_question"]
    plan = state["plan"]
    assert isinstance(plan, PlanSteps)
    reference_entities = state.get("reference_entities") or []
    entity = entity_coverage_check(reference_entities, plan)
    xai = (state.get("verification_report") or {}).get("attention_xai") or {
        "status": "SKIPPED",
        "reason": "not re-run after human edit",
    }
    report = dict(state.get("verification_report") or {})
    report["entity_coverage"] = entity
    report["attention_xai"] = xai
    report["flags"] = list(report.get("flags") or []) + ["human_reviewed: true"]
    report["overall_status"] = "PASS"
    state["verification_report"] = report
    state["human_reviewed"] = True
    state["awaiting_human_input"] = False
    state["confidence_flag"] = "MEDIUM"
    run_checks = [entity, xai]
    passed = sum(1 for c in run_checks if c.get("status") in ("PASS", "STABLE"))
    state["confidence"] = passed / max(1, len(run_checks))
    return state
