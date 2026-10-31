from __future__ import annotations

import asyncio
import copy
import logging
from typing import Any, AsyncIterator

from app.agents.extractor import extractor_step_node, finalize_extractor_trace, _format_context
from app.agents.planner import planner_node
from app.agents.reasoning import qa_node, stream_answer
from app.models.state import GraphState, PlanSteps, empty_state
from app.services.resume import apply_resume
from app.services.semantic_cache import get_pipeline_cache
from app.services.serialization import (
    dump_state,
    extractor_trace_json,
    planner_trace_json,
    qa_trace_json,
    reasoning_trace_json,
)

logger = logging.getLogger(__name__)

Event = dict[str, Any]


async def _run_planner(state: GraphState) -> GraphState:
    return await asyncio.to_thread(planner_node, state)


async def _run_finalize_extractor(state: GraphState) -> GraphState:
    return await asyncio.to_thread(finalize_extractor_trace, state)


async def _run_qa(state: GraphState, answer: str) -> GraphState:
    return await asyncio.to_thread(qa_node, state, answer)


# ---------------------------------------------------------------------------
# Planner stream
# ---------------------------------------------------------------------------

async def stream_from_planner(state: GraphState) -> AsyncIterator[Event]:
    yield {"type": "agent_status", "agent": "planner", "status": "started"}
    state = await _run_planner(state)
    report = state.get("verification_report") or {}
    if state.get("retried"):
        yield {
            "type": "agent_status",
            "agent": "planner",
            "status": "retrying",
            "reason": state.get("retry_reason") or "",
        }
    yield {"type": "planner_verification", "data": report}
    if state.get("awaiting_human_input"):
        yield {"type": "agent_status", "agent": "planner", "status": "awaiting_human_input"}
        yield {"type": "planner_result", "data": planner_trace_json(state)}
        yield {
            "type": "awaiting_human_input",
            "data": {
                "plan": planner_trace_json(state),
                "verificationReport": report,
            },
        }
        yield {"type": "paused", "state": dump_state(state)}
        return
    yield {"type": "agent_status", "agent": "planner", "status": "done"}
    yield {"type": "planner_result", "data": planner_trace_json(state)}
    async for event in stream_from_extractor(state):
        yield event


# ---------------------------------------------------------------------------
# PHASE 0 — B1: Parallel sub-query retrieval
# ---------------------------------------------------------------------------

async def _run_single_extractor_step(sub_q_idx: int, base_state: GraphState) -> GraphState:
    """Run extractor_step_node for one sub-question in its own isolated state copy."""
    worker = copy.copy(base_state)
    worker["current_step_index"] = sub_q_idx
    worker["extractor_trace"] = {"subQueries": []}
    worker["extractor_step_valid"] = []
    worker["retrieved_docs"] = []
    return await asyncio.to_thread(extractor_step_node, worker)


async def stream_from_extractor(state: GraphState) -> AsyncIterator[Event]:
    yield {"type": "agent_status", "agent": "extractor", "status": "started"}

    plan = state.get("plan")
    n = len(plan.sub_questions) if isinstance(plan, PlanSteps) else 0

    if n == 0:
        state = await _run_finalize_extractor(state)
        yield {"type": "agent_status", "agent": "extractor", "status": "done"}
        yield {"type": "extractor_result", "data": extractor_trace_json(state)}
        async for event in stream_from_qa(state):
            yield event
        return

    base_state = copy.copy(state)
    base_state["current_step_index"] = 0

    # ── Phase 1: parallel dispatch ──────────────────────────────────────────
    step_states: list[GraphState] = list(
        await asyncio.gather(*[_run_single_extractor_step(i, base_state) for i in range(n)])
    )

    # ── Phase 2: widened retry for steps that retrieved docs but kept none ──
    failed = [
        i for i, s in enumerate(step_states)
        if not (s.get("extractor_step_valid") or [False])[0]
        and s.get("retrieved_docs")
    ]
    if failed:
        yield {
            "type": "agent_status",
            "agent": "extractor",
            "status": "retrying",
            "reason": f"widening retrieval for {len(failed)} sub-question(s)",
        }
        logger.info("[extractor] Widened retry for sub-question indices: %s", failed)
        retry_states: list[GraphState] = list(
            await asyncio.gather(*[_run_single_extractor_step(i, base_state) for i in failed])
        )
        for orig_idx, rs in zip(failed, retry_states):
            step_states[orig_idx] = rs

    # ── Merge parallel results into main state (preserved order) ────────────
    all_sub_queries: list[dict] = []
    all_step_valid: list[bool] = []
    unique_docs_map: dict[str, dict] = {}

    for s in step_states:
        for doc in (s.get("retrieved_docs") or []):
            did = str(doc.get("id") or id(doc))
            score = float(doc.get("composite_score") or doc.get("similarity_score") or 0.0)
            if did not in unique_docs_map or score > float(unique_docs_map[did].get("composite_score") or 0.0):
                unique_docs_map[did] = doc
        sq_trace = (s.get("extractor_trace") or {}).get("subQueries") or []
        all_sub_queries.extend(sq_trace)
        sv = s.get("extractor_step_valid") or [False]
        all_step_valid.extend(sv)

    all_docs = list(unique_docs_map.values())
    state["retrieved_docs"] = all_docs
    state["extractor_trace"] = {"subQueries": all_sub_queries}
    state["extractor_step_valid"] = all_step_valid
    state["current_step_index"] = n
    state["extraction_valid"] = any(all_step_valid)
    state["current_context"] = _format_context(all_docs)

    # ── Finalize (aggregate metrics, evaluationPassed, etc.) ────────────────
    state = await _run_finalize_extractor(state)
    yield {"type": "agent_status", "agent": "extractor", "status": "done"}
    yield {"type": "extractor_result", "data": extractor_trace_json(state)}
    async for event in stream_from_qa(state):
        yield event


# ---------------------------------------------------------------------------
# QA stream
# ---------------------------------------------------------------------------

async def _iter_blocking(factory) -> AsyncIterator[Any]:
    """Pull items from a blocking generator one at a time, off the event loop."""
    loop = asyncio.get_running_loop()
    iterator = iter(factory())
    sentinel = object()
    while True:
        item = await loop.run_in_executor(None, next, iterator, sentinel)
        if item is sentinel:
            return
        yield item


async def stream_from_qa(state: GraphState) -> AsyncIterator[Event]:
    yield {"type": "agent_status", "agent": "qa", "status": "started"}
    pieces: list[str] = []
    async for tok in _iter_blocking(lambda: stream_answer(state)):
        pieces.append(tok)
        yield {"type": "token", "data": tok}
    answer = "".join(pieces).strip()
    state = await _run_qa(state, answer)
    yield {"type": "agent_status", "agent": "qa", "status": "done"}
    yield {"type": "qa_result", "data": qa_trace_json(state)}

    trace_json = reasoning_trace_json(state)
    dumped_state = dump_state(state)

    # Cache completed pipeline response in Semantic Cache
    try:
        q = state.get("original_question") or ""
        strictness = state.get("verification_strictness") or "standard"
        if q:
            get_pipeline_cache().put(
                query=q,
                strictness=strictness,
                payload={
                    "planner_result": planner_trace_json(state),
                    "extractor_result": extractor_trace_json(state),
                    "qa_result": qa_trace_json(state),
                    "answer": answer,
                    "state": dumped_state,
                    "trace": trace_json,
                },
            )
    except Exception as exc:
        logger.warning("[pipeline] Error saving to semantic cache: %s", exc)

    yield {"type": "completed", "state": dumped_state, "trace": trace_json}


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

async def run_query_stream(question: str, strictness: str) -> AsyncIterator[Event]:
    # Check Semantic Cache first
    cache = get_pipeline_cache()
    cached = cache.get(question, strictness)
    if cached:
        logger.info("[pipeline] Returning cached result for query: '%s' (type=%s, sim=%.3f)",
                    question[:40], cached.get("cache_hit_type"), cached.get("cache_similarity", 1.0))
        yield {"type": "agent_status", "agent": "planner", "status": "started"}
        yield {"type": "agent_status", "agent": "planner", "status": "done"}
        if cached.get("planner_result"):
            yield {"type": "planner_result", "data": cached["planner_result"]}

        yield {"type": "agent_status", "agent": "extractor", "status": "started"}
        yield {"type": "agent_status", "agent": "extractor", "status": "done"}
        if cached.get("extractor_result"):
            yield {"type": "extractor_result", "data": cached["extractor_result"]}

        yield {"type": "agent_status", "agent": "qa", "status": "started"}
        # Stream cached answer tokens
        ans = cached.get("answer") or ""
        for word in ans.split(" "):
            yield {"type": "token", "data": word + " "}
            await asyncio.sleep(0.01)

        yield {"type": "agent_status", "agent": "qa", "status": "done"}
        if cached.get("qa_result"):
            yield {"type": "qa_result", "data": cached["qa_result"]}

        completed_payload: dict[str, Any] = {
            "type": "completed",
            "state": cached.get("state") or {},
            "trace": cached.get("trace") or {},
            "cached": True,
            "cache_type": cached.get("cache_hit_type"),
            "cache_similarity": cached.get("cache_similarity"),
        }
        yield completed_payload
        return

    # Normal pipeline execution
    state = empty_state(question, strictness)
    async for event in stream_from_planner(state):
        yield event


async def resume_stream(state: GraphState, body: dict[str, Any]) -> AsyncIterator[Event]:
    state = apply_resume(state, body)
    if body.get("regenerate"):
        async for event in stream_from_planner(state):
            yield event
        return
    yield {"type": "agent_status", "agent": "planner", "status": "done"}
    yield {"type": "planner_result", "data": planner_trace_json(state)}
    async for event in stream_from_extractor(state):
        yield event
