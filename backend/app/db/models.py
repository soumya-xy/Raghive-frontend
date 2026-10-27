from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), default="")
    display_name: Mapped[str] = mapped_column(String(256), default="Researcher")
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    preferences_json: Mapped[str] = mapped_column(Text, default="{}")

    chats: Mapped[list["ChatRow"]] = relationship(back_populates="user")


class ChatRow(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(512), default="New Conversation")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped[UserRow] = relationship(back_populates="chats")
    messages: Mapped[list["MessageRow"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )


class MessageRow(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chat_id: Mapped[str] = mapped_column(ForeignKey("chats.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    trace_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending: Mapped[bool] = mapped_column(Boolean, default=False)
    pipeline_state_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    faithfulness: Mapped[float | None] = mapped_column(Float, nullable=True)

    chat: Mapped[ChatRow] = relationship(back_populates="messages")


class DocumentRow(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(512))
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
