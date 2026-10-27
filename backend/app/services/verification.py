"""Four independent planner verification checks — never blended into a weighted float."""
from __future__ import annotations

import re
from typing import Any

from app.models.state import PlanSteps
from app.services.embeddings import cosine01, embed_texts
from app.services.llm import get_chat_llm, llm_available
from app.services.thresholds import Thresholds


def entity_coverage_check(reference_entities: list[dict[str, Any]], plan: PlanSteps) -> dict[str, Any]:
    missed = [
        e["text"]
        for e in reference_entities
        if not any(
            e["text"].lower() in sq.question.lower()
            or e["text"].lower() in [k.lower() for k in sq.search_keywords]
            for sq in plan.sub_questions
        )
    ]
    status = "FAIL" if missed else "PASS"
    reason = (
        f"Missed reference entities: {missed}"
        if missed
        else "Every reference entity appears in a sub-question or its search keywords."
    )
    return {"status": status, "missed": missed, "reason": reason}


def _split_requirements(query: str) -> list[str]:
    """Best-effort clause split. Weaker than entity coverage — heuristic, not a guarantee."""
    try:
        import spacy

        nlp = spacy.blank("en")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer")
        doc = nlp(query)
        parts = [s.text.strip() for s in doc.sents if s.text.strip()]
        if len(parts) == 1:
            text = parts[0]
        else:
            return [p for p in parts if len(p) > 8]
    except Exception:
        text = query
    pieces = re.split(r"\s+(?:and|then|plus|as well as)\s+|;\s+|\?\s+", text, flags=re.I)
    wh = re.split(r"\b(?=(?:who|what|when|where|why|how)\b)", text, flags=re.I)
    candidates = [p.strip(" ?") for p in pieces + wh if len(p.strip(" ?")) > 8]
    # de-dupe preserving order
    seen = set()
    out = []
    for c in candidates:
        key = c.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out if len(out) >= 2 else []


def requirement_coverage_check(query: str, plan: PlanSteps) -> dict[str, Any]:
    requirements = _split_requirements(query)
    if len(requirements) < 2:
        return {
            "status": "SKIPPED",
            "missed_requirements": [],
            "reason": "skipped - single-clause query; requirement coverage is a best-effort heuristic.",
        }
    missed = []
    for req in requirements:
        req_l = req.lower()
        tokens = [t for t in re.findall(r"[a-z0-9]{4,}", req_l)]
        hit = False
        for sq in plan.sub_questions:
            blob = (sq.question + " " + " ".join(sq.search_keywords)).lower()
            if req_l in blob or sum(1 for t in tokens if t in blob) >= max(1, len(tokens) // 2):
                hit = True
                break
        if not hit:
            missed.append(req)
    status = "FAIL" if missed else "PASS"
    return {
        "status": status,
        "missed_requirements": missed,
        "reason": (
            f"Unaddressed clauses (heuristic): {missed}"
            if missed
            else "Each parsed clause overlaps a sub-question (best-effort heuristic, not a guarantee)."
        ),
    }


def _plan_to_steps_model(plan: Any) -> PlanSteps:
    if isinstance(plan, PlanSteps):
        return plan
    return PlanSteps.model_validate(plan)


def compare_plans(plan_a: PlanSteps, plan_b: PlanSteps) -> dict[str, Any]:
    a_texts = [sq.question for sq in plan_a.sub_questions]
    b_texts = [sq.question for sq in plan_b.sub_questions]
    if a_texts and b_texts and len(a_texts) == len(b_texts):
        # Positional zip assumes step i corresponds across runs (dependency order).
        embs_a = embed_texts(a_texts)
        embs_b = embed_texts(b_texts)
        sims = [cosine01(embs_a[i], embs_b[i]) for i in range(len(a_texts))]
        return {"method": "step_level", "score": float(sum(sims) / len(sims))}
    a_full = plan_a.chain_of_thought + " " + " ".join(a_texts)
    b_full = plan_b.chain_of_thought + " " + " ".join(b_texts)
    ea, eb = embed_texts([a_full, b_full])
    return {"method": "whole_plan", "score": cosine01(ea, eb)}


def self_consistency_check(
    query: str,
    plan: PlanSteps,
    generate_plan_fn,
    *,
    run: bool,
    skip_reason: str,
    threshold: float,
) -> dict[str, Any]:
    if not run:
        return {
            "status": "SKIPPED",
            "semantic_similarity": None,
            "structural_agreement": None,
            "reason": skip_reason,
        }
    if not llm_available():
        return {
            "status": "SKIPPED",
            "semantic_similarity": None,
            "structural_agreement": None,
            "reason": "generation error - LLM unreachable",
        }
    try:
        llm = get_chat_llm()
        extra = []
        for _ in range(2):
            extra.append(_plan_to_steps_model(generate_plan_fn(query, llm.bind(temperature=0.7))))
        plans = [plan, *extra]
        pairs = [(0, 1), (0, 2), (1, 2)]
        scores = [compare_plans(plans[i], plans[j])["score"] for i, j in pairs]
        semantic = float(sum(scores) / len(scores))
        counts = [len(p.sub_questions) for p in plans]
        majority = max(set(counts), key=counts.count)
        structural = counts.count(majority) / len(counts)
        status = "STABLE" if semantic >= threshold else "UNSTABLE"
        return {
            "status": status,
            "semantic_similarity": semantic,
            "structural_agreement": structural,
            "reason": (
                f"{status}: semantic={semantic:.2f}, structural={structural:.2f}. "
                "STABLE means a reproducible reading, not that the reading is correct."
            ),
        }
    except Exception as exc:
        return {
            "status": "SKIPPED",
            "semantic_similarity": None,
            "structural_agreement": None,
            "reason": f"generation error: {exc}",
        }


def attention_xai_check(xai_result: dict[str, Any], threshold: float) -> dict[str, Any]:
    score = float(xai_result.get("overall_xai_score") or 0.0)
    ignored = list(xai_result.get("ignored_entities") or [])
    status = "PASS" if score >= threshold else "FAIL"
    return {
        "status": status,
        "overall_xai_score": score,
        "ignored_entities": ignored,
        "reason": (
            f"Independent proxy-model grounding score {score:.2f} "
            f"(threshold {threshold:.2f})"
            + (f"; ignored: {ignored}" if ignored else "")
            + ". This does not explain the 32B's computation."
        ),
    }


def decide_overall(report_parts: dict[str, dict[str, Any]]) -> tuple[str, list[str], float, str]:
    entity = report_parts["entity_coverage"]
    req = report_parts["requirement_coverage"]
    sc = report_parts["self_consistency"]
    xai = report_parts["attention_xai"]
    flags: list[str] = []

    def is_bad(check: dict[str, Any]) -> bool:
        return check.get("status") in ("FAIL", "UNSTABLE")

    if entity["status"] == "FAIL":
        overall = "FAIL"
        flags.append("entity coverage veto: missing named entities")
    else:
        non_entity_fails = sum(is_bad(c) for c in (req, sc, xai))
        if non_entity_fails >= 2:
            overall = "FAIL"
            flags.append("two or more non-entity checks failed/unstable")
        elif non_entity_fails == 1:
            overall = "WARNING"
            flags.append("exactly one of attention XAI / self-consistency / requirements is weak")
        else:
            overall = "PASS"

    run_checks = [c for c in (entity, req, sc, xai) if c.get("status") != "SKIPPED"]
    passed = sum(1 for c in run_checks if c.get("status") in ("PASS", "STABLE"))
    # confidence = unweighted fraction of independent checks passed — not a calibrated probability.
    confidence = (passed / len(run_checks)) if run_checks else 0.0
    flag = {"PASS": "HIGH", "WARNING": "MEDIUM", "FAIL": "LOW"}[overall]
    return overall, flags, confidence, flag
