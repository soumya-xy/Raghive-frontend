"""Python snake_case state → frontend camelCase JSON. Do not rename locked fields."""
from __future__ import annotations

from typing import Any, Optional

import numpy as np

from app.models.state import GraphState, PlanSteps
from app.services.attention import slice_plan_to_query


def _finite(x: Any, default: float = 0.0) -> float:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return default
    if not np.isfinite(v):
        return default
    return float(np.clip(v, 0.0, 1.0))


def _as_plan(plan: Any) -> Optional[PlanSteps]:
    if plan is None:
        return None
    if isinstance(plan, PlanSteps):
        return plan
    try:
        return PlanSteps.model_validate(plan)
    except Exception:
        return None


def verification_checks_json(report: dict[str, Any]) -> dict[str, Any]:
    def pack(key_py: str) -> dict[str, Any]:
        c = report.get(key_py) or {}
        out = {"status": c.get("status") or "SKIPPED", "reason": c.get("reason")}
        for extra in (
            "missed",
            "missed_requirements",
            "semantic_similarity",
            "structural_agreement",
            "overall_xai_score",
            "ignored_entities",
        ):
            if extra in c and c[extra] is not None:
                camel = extra
                if extra == "missed_requirements":
                    camel = "missedRequirements"
                elif extra == "semantic_similarity":
                    camel = "semanticSimilarity"
                elif extra == "structural_agreement":
                    camel = "structuralAgreement"
                elif extra == "overall_xai_score":
                    camel = "overallXaiScore"
                elif extra == "ignored_entities":
                    camel = "ignoredEntities"
                out[camel] = c[extra]
        return out

    return {
        "entityCoverage": pack("entity_coverage"),
        "requirementCoverage": pack("requirement_coverage"),
        "selfConsistency": pack("self_consistency"),
        "attentionXai": pack("attention_xai"),
    }


def planner_trace_json(state: GraphState) -> dict[str, Any]:
    plan = _as_plan(state.get("plan"))
    steps = []
    if plan:
        for sq in plan.sub_questions:
            item: dict[str, Any] = {"id": str(sq.step_id), "text": sq.question}
            if sq.depends_on:
                item["dependsOn"] = [str(d) for d in sq.depends_on]
            steps.append(item)

    attn = state.get("attention_weights") or {}
    if attn.get("attention_matrix") is not None or attn.get("matrix") is not None:
        matrix, rows, cols = slice_plan_to_query(
            {
                "attention_matrix": attn.get("attention_matrix", attn.get("matrix")),
                "tokens": attn.get("tokens") or [],
                "query_token_span": attn.get("query_token_span") or (0, 0),
                "plan_token_span": attn.get("plan_token_span") or (0, 0),
            }
        )
    else:
        matrix, rows, cols = [[0.0]], ["(empty)"], ["(empty)"]

    return {
        "steps": steps,
        "keywords": list(state.get("keywords") or []),
        "confidence": _finite(state.get("confidence")),
        "confidenceLevel": state.get("confidence_flag") or "LOW",
        "attentionMatrix": matrix,
        "rowLabels": rows,
        "colLabels": cols,
        "retried": bool(state.get("retried")),
        "retryReason": state.get("retry_reason"),
        "verificationChecks": verification_checks_json(state.get("verification_report") or {}),
    }


def retrieved_doc_to_chunk(doc: dict[str, Any]) -> dict[str, Any]:
    chunk: dict[str, Any] = {
        "id": doc.get("id"),
        "sourceDocument": doc.get("source") or "unknown",
        "text": doc.get("text") or "",
        "similarityScore": _finite(doc.get("similarity_score")),
        "attributionScore": _finite(doc.get("attribution_score")),
        "keptForReasoning": bool(doc.get("kept")),
    }
    if doc.get("page") not in (None, 0):
        chunk["pageNumber"] = int(doc["page"])
    if doc.get("filter_reason"):
        chunk["filterReason"] = doc["filter_reason"]
    if doc.get("rerank_score") is not None:
        chunk["rerankScore"] = _finite(doc["rerank_score"])
    if doc.get("composite_score") is not None:
        chunk["compositeScore"] = _finite(doc["composite_score"])
    raw_tbl = doc.get("raw_table_json")
    if not raw_tbl and isinstance(doc.get("metadata"), dict):
        raw_tbl = doc["metadata"].get("raw_table_json")
    if raw_tbl:
        chunk["rawTableJson"] = raw_tbl
    return chunk


def extractor_trace_json(state: GraphState) -> dict[str, Any]:
    trace = dict(state.get("extractor_trace") or {"subQueries": []})
    metrics = state.get("retrieval_metrics") or {}
    # Ensure camelCase chunks even if a node already stored them that way.
    sub_queries = []
    for sq in trace.get("subQueries") or []:
        chunks = sq.get("chunks") or []
        normalized = []
        for ch in chunks:
            if "sourceDocument" in ch:
                ch = dict(ch)
                ch["similarityScore"] = _finite(ch.get("similarityScore"))
                ch["attributionScore"] = _finite(ch.get("attributionScore"))
                normalized.append(ch)
            else:
                normalized.append(retrieved_doc_to_chunk(ch))
        sub_queries.append({"query": sq.get("query") or "", "chunks": normalized})
    out: dict[str, Any] = {
        "subQueries": sub_queries,
        "evaluationPassed": bool(trace.get("evaluationPassed", state.get("extraction_valid"))),
    }
    if "hit_rate" in metrics or "hitRate" in trace:
        out["hitRate"] = _finite(trace.get("hitRate", metrics.get("hit_rate")))
        out["mrr"] = _finite(trace.get("mrr", metrics.get("mrr")))
        out["contextPrecision"] = _finite(trace.get("contextPrecision", metrics.get("context_precision")))
    return out


def qa_trace_json(state: GraphState) -> dict[str, Any]:
    qa = dict(state.get("qa_trace") or {})
    citations = []
    for c in qa.get("citations") or []:
        if "sentenceSpan" in c:
            span = c["sentenceSpan"]
            ids = c.get("evidenceChunkIds") or []
        else:
            span = c.get("sentence_span") or [0, 0]
            ids = c.get("evidence_chunk_ids") or []
        citations.append(
            {
                "sentenceSpan": [int(span[0]), int(span[1])],
                "evidenceChunkIds": list(ids),
            }
        )
    score = _finite(qa.get("faithfulness_score", qa.get("faithfulnessScore")))
    if score >= 0.85:
        tier = "HIGH"
    elif score >= 0.70:
        tier = "MEDIUM"
    else:
        tier = "LOW"
    return {
        "answer": qa.get("answer") or state.get("answer") or "",
        "faithfulnessScore": score,
        "citations": citations,
        "erasureTestChanged": bool(qa.get("erasure_test_changed", qa.get("erasureTestChanged"))),
        "belowGroundingThreshold": bool(
            qa.get("below_grounding_threshold", qa.get("belowGroundingThreshold"))
        ),
        "faithfulnessTier": qa.get("faithfulness_tier") or tier,
    }


def reasoning_trace_json(state: GraphState) -> dict[str, Any]:
    return {
        "planner": planner_trace_json(state) if state.get("plan") is not None else None,
        "extractor": extractor_trace_json(state) if (state.get("extractor_trace") or {}).get("subQueries") else None,
        "qa": qa_trace_json(state) if state.get("qa_trace") else None,
    }


def dump_state(state: GraphState) -> dict[str, Any]:
    payload = dict(state)
    plan = _as_plan(payload.get("plan"))
    if plan is not None:
        payload["plan"] = plan.model_dump()
    attn = payload.get("attention_weights")
    if attn and hasattr(attn.get("attention_matrix"), "tolist"):
        attn = dict(attn)
        attn["attention_matrix"] = attn["attention_matrix"].tolist()
        if hasattr(attn.get("token_received_attention"), "tolist"):
            attn["token_received_attention"] = attn["token_received_attention"].tolist()
        payload["attention_weights"] = attn
    return payload


def load_state(payload: dict[str, Any]) -> GraphState:
    data = dict(payload)
    if data.get("plan"):
        data["plan"] = PlanSteps.model_validate(data["plan"])
    return data  # type: ignore[return-value]
