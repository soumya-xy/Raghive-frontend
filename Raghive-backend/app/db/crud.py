from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import ChatRow, DocumentRow, MessageRow, UserRow
from app.models.schemas import ChatSummary, Message, UserPreferences, UserProfile


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def ensure_user(
    db: Session,
    user_id: str,
    email: str = "",
    display_name: str = "Researcher",
    avatar_url: Optional[str] = None,
) -> UserRow:
    row = db.get(UserRow, user_id)
    if row is None:
        row = UserRow(
            id=user_id,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    changed = False
    if email and row.email != email:
        row.email = email
        changed = True
    if display_name and row.display_name != display_name:
        row.display_name = display_name
        changed = True
    if avatar_url and row.avatar_url != avatar_url:
        row.avatar_url = avatar_url
        changed = True
    if changed:
        db.commit()
        db.refresh(row)
    return row


def user_to_profile(row: UserRow) -> UserProfile:
    return UserProfile(
        userId=row.id,
        email=row.email,
        displayName=row.display_name,
        avatarUrl=row.avatar_url,
        createdAt=_iso(row.created_at),
    )


def get_preferences(row: UserRow) -> UserPreferences:
    try:
        data = json.loads(row.preferences_json or "{}")
    except json.JSONDecodeError:
        data = {}
    return UserPreferences.model_validate(data)


def patch_preferences(db: Session, row: UserRow, patch: UserPreferences) -> UserPreferences:
    current = get_preferences(row).model_dump(exclude_none=True)
    current.update(patch.model_dump(exclude_none=True))
    row.preferences_json = json.dumps(current)
    db.commit()
    return UserPreferences.model_validate(current)


def _avg_faithfulness(chat: ChatRow) -> Optional[float]:
    scores = [m.faithfulness for m in chat.messages if m.faithfulness is not None]
    if not scores:
        return None
    return float(sum(scores) / len(scores))


def chat_to_summary(chat: ChatRow) -> ChatSummary:
    return ChatSummary(
        id=chat.id,
        title=chat.title,
        updatedAt=_iso(chat.updated_at),
        pinned=chat.pinned,
        messageCount=len(chat.messages),
        avgFaithfulness=_avg_faithfulness(chat),
    )


def message_to_schema(row: MessageRow) -> Message:
    trace = None
    if row.trace_json:
        try:
            trace = json.loads(row.trace_json)
        except json.JSONDecodeError:
            trace = None
    return Message(
        id=row.id,
        role=row.role,  # type: ignore[arg-type]
        content=row.content,
        createdAt=_iso(row.created_at),
        trace=trace,
        pending=row.pending or None,
    )


def list_chats(db: Session, user_id: str) -> list[ChatRow]:
    stmt = (
        select(ChatRow)
        .options(selectinload(ChatRow.messages))
        .where(ChatRow.user_id == user_id, ChatRow.archived.is_(False))
        .order_by(ChatRow.pinned.desc(), ChatRow.updated_at.desc())
    )
    return list(db.scalars(stmt).all())


def get_chat(db: Session, user_id: str, chat_id: str) -> Optional[ChatRow]:
    stmt = (
        select(ChatRow)
        .options(selectinload(ChatRow.messages))
        .where(ChatRow.id == chat_id, ChatRow.user_id == user_id)
    )
    return db.scalars(stmt).first()


def create_chat(db: Session, user_id: str, title: str = "New Conversation") -> ChatRow:
    ensure_user(db, user_id)
    row = ChatRow(id=new_id("chat"), user_id=user_id, title=title or "New Conversation")
    db.add(row)
    db.commit()
    db.refresh(row)
    row.messages = []
    return row


def update_chat(
    db: Session,
    chat: ChatRow,
    *,
    title: Optional[str] = None,
    pinned: Optional[bool] = None,
    archived: Optional[bool] = None,
) -> ChatRow:
    if title is not None:
        chat.title = title
    if pinned is not None:
        chat.pinned = pinned
    if archived is not None:
        chat.archived = archived
    chat.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(chat)
    return chat


def delete_chat(db: Session, chat: ChatRow) -> None:
    db.delete(chat)
    db.commit()


def add_message(
    db: Session,
    chat: ChatRow,
    *,
    role: str,
    content: str,
    trace: Optional[dict[str, Any]] = None,
    pending: bool = False,
    pipeline_state: Optional[dict[str, Any]] = None,
    faithfulness: Optional[float] = None,
    message_id: Optional[str] = None,
) -> MessageRow:
    row = MessageRow(
        id=message_id or new_id("msg"),
        chat_id=chat.id,
        role=role,
        content=content,
        trace_json=json.dumps(trace) if trace is not None else None,
        pending=pending,
        pipeline_state_json=json.dumps(pipeline_state) if pipeline_state is not None else None,
        faithfulness=faithfulness,
    )
    db.add(row)
    chat.updated_at = datetime.now(timezone.utc)
    if chat.title in ("New Conversation", "") and role == "user" and content:
        chat.title = content.strip()[:72]
    db.commit()
    db.refresh(row)
    return row


def update_message(
    db: Session,
    row: MessageRow,
    *,
    content: Optional[str] = None,
    trace: Optional[dict[str, Any]] = None,
    pending: Optional[bool] = None,
    pipeline_state: Optional[dict[str, Any]] = None,
    faithfulness: Optional[float] = None,
) -> MessageRow:
    if content is not None:
        row.content = content
    if trace is not None:
        row.trace_json = json.dumps(trace)
    if pending is not None:
        row.pending = pending
    if pipeline_state is not None:
        row.pipeline_state_json = json.dumps(pipeline_state)
    if faithfulness is not None:
        row.faithfulness = faithfulness
    db.commit()
    db.refresh(row)
    return row


def get_message(db: Session, chat_id: str, message_id: str) -> Optional[MessageRow]:
    stmt = select(MessageRow).where(MessageRow.id == message_id, MessageRow.chat_id == chat_id)
    return db.scalars(stmt).first()


def record_document(db: Session, user_id: str, filename: str, chunk_count: int) -> DocumentRow:
    row = DocumentRow(
        id=new_id("doc"),
        user_id=user_id,
        filename=filename,
        chunk_count=chunk_count,
    )
    db.add(row)
    db.commit()
    return row


def chat_count(db: Session, user_id: str) -> int:
    return int(db.scalar(select(func.count()).select_from(ChatRow).where(ChatRow.user_id == user_id)) or 0)
