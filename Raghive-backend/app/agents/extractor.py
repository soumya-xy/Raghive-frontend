from __future__ import annotations

from typing import Any

import numpy as np

from app.models.state import GraphState, PlanSteps
from app.services.attribution import dual_score
from app.services.reranker import rerank
from app.services.serialization import retrieved_doc_to_chunk
from app.services.thresholds import get_thresholds
from app.services.vectorstore import query_chunks


def _metrics(chunks: list[dict[str, Any]]) -> dict[str, float]:
    if not chunks:
        return {"hit_rate": 0.0, "mrr": 0.0, "context_precision": 0.0}
    labels = [1 if c.get("kept") else 0 for c in chunks]
    k = len(labels)
    hit = float(max(labels))
    first_rel = next((i + 1 for i, r in enumerate(labels) if r == 1), None)
    mrr = 1.0 / first_rel if first_rel else 0.0
    precisions = []
    for i in range(1, k + 1):
        p_at_k = sum(labels[:i]) / i
        precisions.append(p_at_k * labels[i - 1])
    denom = sum(labels) or 1
    ctx = float(sum(precisions) / denom)
    return {
        "hit_rate": float(np.clip(hit, 0, 1)),
        "mrr": float(np.clip(mrr, 0, 1)),
        "context_precision": float(np.clip(ctx, 0, 1)),
    }


def _format_context(docs: list[dict[str, Any]]) -> str:
    seen = set()
    lines = []
    for d in docs:
        if not d.get("kept"):
            continue
        if d["id"] in seen:
            continue
        seen.add(d["id"])
        src = d.get("source") or "unknown"
        page = d.get("page")
        loc = f"{src}" + (f" p.{page}" if page else "")
        lines.append(f"[{d['id']} | {loc}] {d['text']}")
    return "\n\n".join(lines)


def _retrieve_for_query(sub_query: str, strictness: str, widen: bool = False) -> tuple[list[dict[str, Any]], dict[str, float], bool]:
    thr = get_thresholds(strictness)
    top_k = thr.top_k * 2 if widen else thr.top_k
    sim_t = max(0.35, thr.sim_threshold - 0.12) if widen else thr.sim_threshold
    attr_t = max(0.30, thr.attribution_threshold - 0.12) if widen else thr.attribution_threshold
    rerank_n = min(top_k, thr.rerank_n + (4 if widen else 0))

    candidates = query_chunks(sub_query, top_k=top_k)
    ranked = rerank(sub_query, candidates, top_n=rerank_n)
    scored = dual_score(sub_query, ranked)

    for doc in scored:
        s_sim = float(doc.get("similarity_score") or 0.0)
        a_ens = float(doc.get("attribution_score") or 0.0)
        keep = (s_sim >= sim_t) and (a_ens >= attr_t)
        doc["kept"] = keep
        if keep:
            doc["filter_reason"] = None
        elif s_sim < sim_t and a_ens < attr_t:
            doc["filter_reason"] = "below similarity and attribution thresholds"
        elif s_sim < sim_t:
            doc["filter_reason"] = "below relevance threshold"
        else:
            doc["filter_reason"] = "below attribution threshold"

    metrics = _metrics(scored)
    valid = any(d.get("kept") for d in scored)
    return scored, metrics, valid


def extractor_step_node(state: GraphState) -> GraphState:
    plan: PlanSteps = state["plan"]  # type: ignore[assignment]
    idx = int(state.get("current_step_index") or 0)
    strictness = state.get("verification_strictness") or "standard"
    sub_query = plan.sub_questions[idx].question

    docs, metrics, valid = _retrieve_for_query(sub_query, strictness, widen=False)
    retried_extract = False
    if not valid and docs:
        # Strategy (a): one widen retry, mirroring the Planner's self-correction.
        retried_extract = True
        docs, metrics, valid = _retrieve_for_query(sub_query, strictness, widen=True)

    if not docs:
        metrics = {"hit_rate": 0.0, "mrr": 0.0, "context_precision": 0.0}
        valid = False

    trace = dict(state.get("extractor_trace") or {"subQueries": []})
    sub_queries = list(trace.get("subQueries") or [])
    sub_queries.append(
        {
            "query": sub_query,
            "chunks": [retrieved_doc_to_chunk(d) for d in docs],
        }
    )
    trace["subQueries"] = sub_queries

    step_valid = list(state.get("extractor_step_valid") or [])
    step_valid.append(valid)

    prev_docs = list(state.get("retrieved_docs") or [])
    state.update(
        {
            "current_context": _format_context(prev_docs + docs),
            "retrieved_docs": prev_docs + docs,
            "retrieval_metrics": metrics,
            "extraction_valid": valid,
            "extractor_step_valid": step_valid,
            "extractor_trace": trace,
            "current_step_index": idx + 1,
            "history": [
                {
                    "agent": "extractor",
                    "step": idx,
                    "valid": valid,
                    "retried": retried_extract,
                    "metrics": metrics,
                }
            ],
        }
    )
    return state


def finalize_extractor_trace(state: GraphState) -> GraphState:
    from app.services.thresholds import get_thresholds

    trace = dict(state.get("extractor_trace") or {"subQueries": []})
    step_valid = list(state.get("extractor_step_valid") or [])
    all_chunks = []
    for sq in trace.get("subQueries") or []:
        all_chunks.extend(sq.get("chunks") or [])
    kept = [c for c in all_chunks if c.get("keptForReasoning")]
    labels = [1 if c.get("keptForReasoning") else 0 for c in all_chunks]
    metrics = _metrics([{"kept": bool(x)} for x in labels])
    thr = get_thresholds(state.get("verification_strictness") or "standard")
    extraction_valid = any(step_valid) if step_valid else bool(kept)
    evaluation_passed = (
        extraction_valid
        and metrics["hit_rate"] >= thr.metric_min_hit_rate
        and metrics["mrr"] >= thr.metric_min_mrr
        and metrics["context_precision"] >= thr.metric_min_context_precision
    )
    trace["evaluationPassed"] = evaluation_passed
    trace["hitRate"] = metrics["hit_rate"]
    trace["mrr"] = metrics["mrr"]
    trace["contextPrecision"] = metrics["context_precision"]
    state["extractor_trace"] = trace
    state["retrieval_metrics"] = metrics
    state["extraction_valid"] = extraction_valid
    state["current_context"] = _format_context(state.get("retrieved_docs") or [])
    return state
