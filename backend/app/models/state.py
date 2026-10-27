from __future__ import annotations

from typing import Any, Optional, TypedDict
from pydantic import BaseModel, Field


class SubQuestion(BaseModel):
    step_id: int
    question: str
    depends_on: list[int] = Field(default_factory=list)
    search_keywords: list[str] = Field(default_factory=list)


class PlanSteps(BaseModel):
    original_query: str = ""
    sub_questions: list[SubQuestion] = Field(default_factory=list)
    chain_of_thought: str = ""
    initial_confidence: float = 0.5


class GraphState(TypedDict, total=False):
    original_question: str
    verification_strictness: str
    plan: Optional[PlanSteps | dict[str, Any]]
    reference_entities: list[dict[str, Any]]
    keywords: list[str]
    verification_report: dict[str, Any]
    confidence: float
    confidence_flag: str
    attention_weights: dict[str, Any]
    retried: bool
    retry_reason: Optional[str]
    awaiting_human_input: bool
    human_reviewed: bool
    human_diff: Optional[dict[str, Any]]
    current_step_index: int
    current_context: str
    retrieved_docs: list[dict[str, Any]]
    retrieval_metrics: dict[str, Any]
    extraction_valid: bool
    extractor_step_valid: list[bool]
    extractor_trace: dict[str, Any]
    answer: str
    qa_trace: dict[str, Any]
    qa_valid: bool
    history: list[dict[str, Any]]


def empty_state(original_question: str, strictness: str = "standard") -> GraphState:
    return {
        "original_question": original_question,
        "verification_strictness": strictness,
        "plan": None,
        "reference_entities": [],
        "keywords": [],
        "verification_report": {},
        "confidence": 0.0,
        "confidence_flag": "LOW",
        "attention_weights": {},
        "retried": False,
        "retry_reason": None,
        "awaiting_human_input": False,
        "human_reviewed": False,
        "human_diff": None,
        "current_step_index": 0,
        "current_context": "",
        "retrieved_docs": [],
        "retrieval_metrics": {},
        "extraction_valid": False,
        "extractor_step_valid": [],
        "extractor_trace": {"subQueries": []},
        "answer": "",
        "qa_trace": {},
        "qa_valid": False,
        "history": [],
    }
