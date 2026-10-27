from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    userId: str
    email: str
    displayName: str
    avatarUrl: Optional[str] = None
    createdAt: str


class UserPreferences(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    theme: Optional[Literal["light", "dark", "system"]] = "dark"
    density: Optional[Literal["comfortable", "compact"]] = "comfortable"
    alwaysShowTrace: Optional[bool] = False
    verificationStrictness: Optional[Literal["standard", "thorough"]] = "standard"
    showHeatmapsByDefault: Optional[bool] = True


class ChatSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    updatedAt: str
    pinned: bool = False
    messageCount: int = 0
    avgFaithfulness: Optional[float] = None


class Message(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    role: Literal["user", "assistant"]
    content: str
    createdAt: str
    trace: Optional[dict[str, Any]] = None
    pending: Optional[bool] = None


class CreateChatBody(BaseModel):
    title: Optional[str] = "New Conversation"


class PatchChatBody(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None


class SendMessageBody(BaseModel):
    content: str
    verificationStrictness: Optional[str] = None


class ResumeBody(BaseModel):
    action: Optional[str] = None
    regenerate: Optional[bool] = None
    editedSubQuestions: Optional[list[Any]] = None
    reason: Optional[str] = None


class AuthSessionBody(BaseModel):
    email: Optional[str] = None
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None


class UpdateProfileBody(BaseModel):
    displayName: Optional[str] = None
