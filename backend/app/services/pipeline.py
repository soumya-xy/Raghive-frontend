from __future__ import annotations

from typing import Any, AsyncIterator

from app.agents.extractor import extractor_step_node, finalize_extractor_trace
from app.agents.planner import planner_node
from app.agents.reasoning import qa_node, stream_answer
from app.models.state import GraphState, PlanSteps, empty_state
from app.services.resume import apply_resume
from app.services.serialization import (
    dump_state,
    extractor_trace_json,
    planner_trace_json,
    qa_trace_json,
    reasoning_trace_json,
)


Event = dict[str, Any]


async def _run_planner(state: GraphState) -> GraphState:
    import asyncio

    return await asyncio.to_thread(planner_node, state)


async def _run_extractor_step(state: GraphState) -> GraphState:
    import asyncio

    return await asyncio.to_thread(extractor_step_node, state)


async def _run_finalize_extractor(state: GraphState) -> GraphState:
    import asyncio

    return await asyncio.to_thread(finalize_extractor_trace, state)


async def _run_qa(state: GraphState, answer: str) -> GraphState:
    import asyncio

    return await asyncio.to_thread(qa_node, state, answer)


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


async def stream_from_extractor(state: GraphState) -> AsyncIterator[Event]:
    yield {"type": "agent_status", "agent": "extractor", "status": "started"}
    plan = state.get("plan")
    n = len(plan.sub_questions) if isinstance(plan, PlanSteps) else 0
    state["current_step_index"] = int(state.get("current_step_index") or 0)
    while int(state.get("current_step_index") or 0) < n:
        prev = int(state["current_step_index"])
        state = await _run_extractor_step(state)
        if not state.get("extraction_valid"):
            yield {
                "type": "agent_status",
                "agent": "extractor",
                "status": "retrying",
                "reason": f"zero surviving chunks for step {prev}",
            }
    state = await _run_finalize_extractor(state)
    yield {"type": "agent_status", "agent": "extractor", "status": "done"}
    yield {"type": "extractor_result", "data": extractor_trace_json(state)}
    async for event in stream_from_qa(state):
        yield event


async def _iter_blocking(factory) -> AsyncIterator[Any]:
    """Pull items from a blocking generator one at a time, off the event loop.

    Unlike collecting the whole generator first, this yields each token as soon
    as the LLM produces it, so the SSE stream is genuinely incremental.
    """
    import asyncio

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
    yield {"type": "completed", "state": dump_state(state), "trace": reasoning_trace_json(state)}


async def run_query_stream(question: str, strictness: str) -> AsyncIterator[Event]:
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
