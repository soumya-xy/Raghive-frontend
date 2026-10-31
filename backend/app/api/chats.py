from __future__ import annotations

import json
from typing import Any, AsyncIterator, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import UserRow
from app.db.session import SessionLocal, get_db
from app.deps import get_current_user
from app.models.schemas import (
    CreateChatBody,
    PatchChatBody,
    ResumeBody,
    SendMessageBody,
)
from app.services.pipeline import resume_stream, run_query_stream
from app.services.serialization import load_state
from app.utils.sse import sse_pack

router = APIRouter()

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.get("/chats")
def list_chats(user: UserRow = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = crud.list_chats(db, user.id)
    return {"items": [crud.chat_to_summary(c) for c in chats], "nextCursor": None}


@router.post("/chats")
def create_chat(
    body: CreateChatBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.create_chat(db, user.id, body.title or "New Conversation")
    return crud.chat_to_summary(chat)


@router.get("/chats/{chat_id}")
def get_chat(
    chat_id: str,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = sorted(chat.messages, key=lambda m: m.created_at)
    return {
        "chat": crud.chat_to_summary(chat),
        "messages": [crud.message_to_schema(m) for m in messages],
    }


@router.patch("/chats/{chat_id}")
def patch_chat(
    chat_id: str,
    body: PatchChatBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    chat = crud.update_chat(
        db, chat, title=body.title, pinned=body.pinned, archived=body.archived
    )
    return crud.chat_to_summary(chat)


@router.delete("/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    crud.delete_chat(db, chat)
    return {"ok": True}


@router.get("/chats/{chat_id}/messages/{message_id}/trace")
def get_trace(
    chat_id: str,
    message_id: str,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    row = crud.get_message(db, chat_id, message_id)
    if not row or not row.trace_json:
        raise HTTPException(status_code=404, detail="Trace not found")
    return json.loads(row.trace_json)


def _persist_terminal(chat_id: str, user_id: str, assistant_id: str, event: dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        chat = crud.get_chat(db, user_id, chat_id)
        if not chat:
            return
        row = crud.get_message(db, chat_id, assistant_id)
        if not row:
            return
        if event.get("type") == "paused":
            state = event.get("state") or {}
            trace = {"planner": None, "extractor": None, "qa": None}
            from app.services.serialization import planner_trace_json, load_state as ls

            try:
                st = ls(state)
                trace["planner"] = planner_trace_json(st)
            except Exception:
                pass
            crud.update_message(
                db,
                row,
                content="Planner paused for human review.",
                trace=trace,
                pending=True,
                pipeline_state=state,
            )
            return
        if event.get("type") == "completed":
            state = event.get("state") or {}
            trace = event.get("trace") or {}
            answer = (trace.get("qa") or {}).get("answer") or state.get("answer") or ""
            faith = (trace.get("qa") or {}).get("faithfulnessScore")
            crud.update_message(
                db,
                row,
                content=answer,
                trace=trace,
                pending=False,
                clear_pipeline_state=True,
                faithfulness=faith,
            )
    finally:
        db.close()


def _persist_failure(chat_id: str, user_id: str, assistant_id: str, message: str) -> None:
    """Close out an assistant message whose pipeline crashed, so it is not stuck pending."""
    db = SessionLocal()
    try:
        chat = crud.get_chat(db, user_id, chat_id)
        if not chat:
            return
        row = crud.get_message(db, chat_id, assistant_id)
        if not row:
            return
        crud.update_message(
            db,
            row,
            content=f"Pipeline error: {message}",
            pending=False,
            clear_pipeline_state=True,
        )
    finally:
        db.close()


async def _sse_pipeline(
    chat_id: str,
    user_id: str,
    assistant_id: str,
    events: AsyncIterator[dict[str, Any]],
) -> AsyncIterator[str]:
    try:
        async for event in events:
            etype = event.get("type")
            if etype in ("paused", "completed"):
                _persist_terminal(chat_id, user_id, assistant_id, event)
                if etype == "paused":
                    yield sse_pack(
                        {
                            "type": "done",
                            "messageId": assistant_id,
                            "pending": True,
                        }
                    )
                else:
                    yield sse_pack({"type": "done", "messageId": assistant_id})
                continue
            # never leak raw graph state to the browser
            if "state" in event:
                event = {k: v for k, v in event.items() if k != "state"}
            yield sse_pack(event)
    except Exception as exc:
        _persist_failure(chat_id, user_id, assistant_id, str(exc))
        yield sse_pack({"type": "error", "message": str(exc)})


@router.post("/chats/{chat_id}/messages")
async def post_message(
    chat_id: str,
    body: SendMessageBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    crud.add_message(db, chat, role="user", content=body.content)
    assistant = crud.add_message(
        db,
        chat,
        role="assistant",
        content="",
        pending=True,
    )
    user_id = str(user.id)
    assistant_id = str(assistant.id)
    strictness = body.verificationStrictness or crud.get_preferences(user).verificationStrictness or "standard"

    async def gen():
        async for packed in _sse_pipeline(
            chat_id,
            user_id,
            assistant_id,
            run_query_stream(body.content, strictness),
        ):
            yield packed

    return StreamingResponse(gen(), media_type="text/event-stream", headers=SSE_HEADERS)


@router.post("/chats/{chat_id}/messages/{message_id}/resume")
async def resume_message(
    chat_id: str,
    message_id: str,
    body: ResumeBody,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = crud.get_chat(db, user.id, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    row = crud.get_message(db, chat_id, message_id)
    if not row or not row.pipeline_state_json:
        raise HTTPException(status_code=404, detail="No paused pipeline for this message")
    state = load_state(json.loads(row.pipeline_state_json))
    user_id = str(user.id)

    async def gen():
        async for packed in _sse_pipeline(
            chat_id,
            user_id,
            message_id,
            resume_stream(state, body.model_dump()),
        ):
            yield packed

    return StreamingResponse(gen(), media_type="text/event-stream", headers=SSE_HEADERS)


@router.post("/query")
async def stateless_query(body: SendMessageBody, user: UserRow = Depends(get_current_user)):
    strictness = body.verificationStrictness or "standard"

    async def gen():
        try:
            async for event in run_query_stream(body.content, strictness):
                if event.get("type") in ("paused", "completed"):
                    if event.get("type") == "completed":
                        yield sse_pack({"type": "done", "messageId": "ephemeral"})
                    else:
                        yield sse_pack({"type": "done", "messageId": "ephemeral", "pending": True})
                    continue
                event = {k: v for k, v in event.items() if k != "state"}
                yield sse_pack(event)
        except Exception as exc:
            yield sse_pack({"type": "error", "message": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream", headers=SSE_HEADERS)
