from __future__ import annotations

from typing import Any

import numpy as np

from app.models.state import GraphState, PlanSteps
from app.services.attribution import dual_score
from app.services.hyde import hyde_hybrid_retrieve
from app.services.reranker import rerank
from app.services.serialization import retrieved_doc_to_chunk
from app.services.thresholds import get_thresholds


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


def _format_context(docs: list[dict[str, Any]], max_chunks: int = 6) -> str:
    """Format evidence context using Small-to-Big (Parent-Child) context resolution.
    
    Resolves retrieved child chunks to their enclosing parent paragraphs, collapses
    redundant hits from the same parent, and ranks parent paragraphs by the highest
    composite score of their constituent child matches.
    """
    kept_docs = [d for d in docs if d.get("kept")]
    if not kept_docs and docs:
        kept_docs = docs

    if not kept_docs:
        return "(no surviving evidence chunks)"

    parents_map: dict[str, dict[str, Any]] = {}
    for d in kept_docs:
        pid = str(d.get("parent_id") or d.get("id") or id(d))
        score = float(d.get("composite_score") or d.get("rerank_score") or d.get("similarity_score") or 0.0)
        p_text = d.get("parent_text") or d.get("text") or ""

        if pid not in parents_map:
            parents_map[pid] = {
                "parent_id": pid,
                "parent_text": p_text,
                "source": d.get("source") or "unknown",
                "page": d.get("page"),
                "max_score": score,
                "child_ids": [d.get("id")],
                "raw_table_json": d.get("raw_table_json")
                or (d.get("metadata", {}).get("raw_table_json") if isinstance(d.get("metadata"), dict) else None),
            }
        else:
            parents_map[pid]["child_ids"].append(d.get("id"))
            if score > parents_map[pid]["max_score"]:
                parents_map[pid]["max_score"] = score
            if len(p_text) > len(parents_map[pid]["parent_text"]):
                parents_map[pid]["parent_text"] = p_text

    sorted_parents = sorted(
        parents_map.values(),
        key=lambda p: float(p.get("max_score") or 0.0),
        reverse=True,
    )[:max_chunks]

    formatted_blocks = []
    for p in sorted_parents:
        src = p.get("source") or "unknown"
        page = p.get("page")
        loc = f"{src}" + (f" p.{page}" if page else "")
        pid = p["parent_id"]
        raw_table = p.get("raw_table_json")
        if raw_table:
            formatted_blocks.append(f"[{pid} | {loc} | STRUCTURAL_TABLE]\n{p['parent_text']}\n[TABLE_JSON]: {raw_table}")
        else:
            formatted_blocks.append(f"[{pid} | {loc}]\n{p['parent_text']}")

    return "\n\n".join(formatted_blocks)


def _retrieve_for_query(
    sub_query: str,
    strictness: str,
    widen: bool = False,
    original_query: str = "",
) -> tuple[list[dict[str, Any]], dict[str, float], bool]:
    thr = get_thresholds(strictness)
    top_k = thr.top_k * 2 if widen else thr.top_k
    sim_t = max(0.35, thr.sim_threshold - 0.12) if widen else thr.sim_threshold
    attr_t = max(0.30, thr.attribution_threshold - 0.12) if widen else thr.attribution_threshold
    rerank_n = min(top_k, thr.rerank_n + (4 if widen else 0))

    # Phase 1 Upgrade: Hybrid (BM25 + BGE-M3 RRF) + HyDE (Hypothetical Document Embeddings)
    candidates = hyde_hybrid_retrieve(sub_query, top_k=top_k)

    # Hybrid expansion: augment with original query chunks if sub-query pool is sparse
    if original_query and (len(candidates) < 4 or widen):
        extra = hyde_hybrid_retrieve(original_query, top_k=top_k)
        seen_ids = {c["id"] for c in candidates}
        for c in extra:
            if c["id"] not in seen_ids:
                candidates.append(c)
                seen_ids.add(c["id"])

    # High-capacity reranking via BAAI/bge-reranker-v2-gemma (8,192 token window)
    ranked = rerank(sub_query, candidates, top_n=rerank_n)
    scored = dual_score(sub_query, ranked)

    for doc in scored:
        s_sim = float(doc.get("similarity_score") or 0.0)
        a_ens = float(doc.get("attribution_score") or 0.0)
        # Deep interaction score from bge-reranker-v2-gemma
        r_gemma = float(doc.get("rerank_score") if doc.get("rerank_score") is not None else s_sim)

        # Production composite scoring on DGX:
        # Cross-encoder Gemma (50%) + Dense BGE-M3 / RRF (30%) + Ensemble Attribution (20%)
        composite = 0.50 * r_gemma + 0.30 * s_sim + 0.20 * a_ens
        doc["composite_score"] = float(np.clip(composite, 0.0, 1.0))
        doc["rerank_score"] = r_gemma

        # Gating logic: Prioritizes high-fidelity Gemma cross-encoder confidence
        keep = (
            (r_gemma >= 0.55 and a_ens >= attr_t)
            or (composite >= 0.50)
            or (s_sim >= sim_t and a_ens >= attr_t and r_gemma >= 0.40)
            or (r_gemma >= 0.70)
        )
        doc["kept"] = keep
        if keep:
            doc["filter_reason"] = None
        elif r_gemma < 0.40 and s_sim < sim_t:
            doc["filter_reason"] = "below gemma cross-encoder and similarity thresholds"
        elif a_ens < attr_t:
            doc["filter_reason"] = "below attribution threshold"
        else:
            doc["filter_reason"] = "below composite threshold"

    # Top-K Safety Fallback: Guarantee context is not starved if documents exist
    if scored and not any(d.get("kept") for d in scored):
        sorted_scored = sorted(
            scored,
            key=lambda d: float(d.get("composite_score") or d.get("rerank_score") or 0.0),
            reverse=True,
        )
        for d in sorted_scored[:2]:
            if float(d.get("composite_score") or 0.0) >= 0.20:
                d["kept"] = True
                d["filter_reason"] = "retained by gemma top-k safety fallback"

    metrics = _metrics(scored)
    valid = any(d.get("kept") for d in scored)
    return scored, metrics, valid


def extractor_step_node(state: GraphState) -> GraphState:
    plan: PlanSteps = state["plan"]  # type: ignore[assignment]
    idx = int(state.get("current_step_index") or 0)
    strictness = state.get("verification_strictness") or "standard"
    orig_q = state.get("original_question") or ""
    sub_query = plan.sub_questions[idx].question

    docs, metrics, valid = _retrieve_for_query(sub_query, strictness, widen=False, original_query=orig_q)
    retried_extract = False
    if not valid and docs:
        retried_extract = True
        docs, metrics, valid = _retrieve_for_query(sub_query, strictness, widen=True, original_query=orig_q)

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
