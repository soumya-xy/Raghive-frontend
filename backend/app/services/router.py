from __future__ import annotations

import re
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class QueryRoute(str, Enum):
    CONVERSATIONAL = "conversational"
    DIRECT_FACTOID = "direct_factoid"
    MULTI_HOP_COMPLEX = "multi_hop_complex"


class RouteDecision(BaseModel):
    route: QueryRoute
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    fast_path: bool
    detected_entities: list[str] = Field(default_factory=list)


# Conversational greeting & identity patterns
_CONVERSATIONAL_EXACT = {
    "hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon",
    "good evening", "howdy", "sup", "yo", "bye", "goodbye", "cya", "see you",
    "thanks", "thank you", "thx", "appreciate it", "who are you", "what are you",
    "what can you do", "help", "help me", "introduce yourself",
}

_CONVERSATIONAL_REGEX = re.compile(
    r"^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|who\s+are\s+you|what\s+can\s+you\s+do|help\s*me?|thank\s*you|thanks)[\s!?.]*$",
    re.IGNORECASE,
)

# Comparison & analytical keywords that mandate multi-hop DAG decomposition
_MULTI_HOP_KEYWORDS = [
    "compare", "comparison", "versus", "vs", "vs.", "difference between",
    "differences between", "differ from", "contrast", "trade-off", "tradeoff",
    "tradeoffs", "pros and cons", "advantages and disadvantages", "better than",
    "how do both", "which is better", "when to use", "relationship between",
    "how does .* affect", "what happens if .* and", "step by step",
    "lifecycle", "workflow", "trace the execution",
]

_MULTI_HOP_REGEX = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in _MULTI_HOP_KEYWORDS) + r")\b",
    re.IGNORECASE,
)

# Direct definition & single-concept patterns
_FACTOID_PREFIX_REGEX = re.compile(
    r"^(what\s+(is|are|does|do|was|were)\b|define\b|explain\b|describe\b|meaning\s+of\b|list\s+the\b|give\s+the\b|overview\s+of\b|what\s+stands\s+for\b)",
    re.IGNORECASE,
)

_MULTI_QUESTION_JOINER = re.compile(
    r"\b(and\s+why|and\s+how|and\s+explain|and\s+also|as\s+well\s+as\s+how|furthermore)\b|\?\s*[^?]+",
    re.IGNORECASE,
)


def classify_query_complexity(
    query: str,
    extracted_entities: Optional[list[dict[str, Any]]] = None,
) -> RouteDecision:
    """
    Classify query complexity to route dynamically between:
      1. CONVERSATIONAL: Instant greeting/assistance without retrieval.
      2. DIRECT_FACTOID: Targeted single-hop lookup. Skips planner LLM decomposition;
         executes single-pass high-precision retrieval + QA in < 1.5s.
      3. MULTI_HOP_COMPLEX: Deep multi-aspect question. Engages full MARAG Planner DAG.
    """
    cleaned = query.strip()
    words = cleaned.split()
    word_count = len(words)
    lower_q = cleaned.lower()

    entity_names = [e["text"] for e in (extracted_entities or []) if e.get("text")]

    # --- 1. Conversational Route ---
    normalized = re.sub(r"[^\w\s]", "", lower_q).strip()
    if normalized in _CONVERSATIONAL_EXACT or _CONVERSATIONAL_REGEX.match(cleaned):
        # Double-check it doesn't contain a technical domain entity
        tech_markers = {"dbms", "database", "sql", "acid", "transaction", "schema", "table", "index", "b+", "lock"}
        if not any(tm in lower_q for tm in tech_markers):
            return RouteDecision(
                route=QueryRoute.CONVERSATIONAL,
                confidence=0.98,
                reason="Conversational greeting or agent identity query detected.",
                fast_path=True,
                detected_entities=[],
            )

    # --- 2. Multi-Hop Complex Route ---
    # Case A: Explicit comparative or trade-off terms
    multi_match = _MULTI_HOP_REGEX.search(cleaned)
    if multi_match:
        return RouteDecision(
            route=QueryRoute.MULTI_HOP_COMPLEX,
            confidence=0.92,
            reason=f"Comparative/analytical indicator detected: '{multi_match.group(0)}'. Full DAG decomposition required.",
            fast_path=False,
            detected_entities=entity_names,
        )

    # Case B: Multiple distinct questions or joiners ("and why", "and how")
    joiner_match = _MULTI_QUESTION_JOINER.search(cleaned)
    if joiner_match:
        return RouteDecision(
            route=QueryRoute.MULTI_HOP_COMPLEX,
            confidence=0.88,
            reason="Multi-clause question or secondary inquiry clause detected.",
            fast_path=False,
            detected_entities=entity_names,
        )

    # Case C: Multiple distinct entities being cross-analyzed (e.g. 2PL and Timestamp Ordering)
    if len(entity_names) >= 2 and word_count > 10:
        return RouteDecision(
            route=QueryRoute.MULTI_HOP_COMPLEX,
            confidence=0.85,
            reason=f"Multiple distinct entities detected ({', '.join(entity_names[:3])}). Multi-hop plan recommended.",
            fast_path=False,
            detected_entities=entity_names,
        )

    # --- 3. Direct Factoid Route (Fast Path) ---
    # Single-hop definition, concept explanation, or lookup
    if _FACTOID_PREFIX_REGEX.match(cleaned) or word_count <= 8:
        return RouteDecision(
            route=QueryRoute.DIRECT_FACTOID,
            confidence=0.95,
            reason="Single-concept definition/lookup query. Fast-path single-hop retrieval engaged.",
            fast_path=True,
            detected_entities=entity_names,
        )

    # Default fallback: If medium length without complex markers, treat as direct factoid
    if word_count <= 14 and len(entity_names) <= 1:
        return RouteDecision(
            route=QueryRoute.DIRECT_FACTOID,
            confidence=0.80,
            reason="Single-focus technical query without comparative clauses. Fast-path retrieval selected.",
            fast_path=True,
            detected_entities=entity_names,
        )

    # Otherwise, multi-hop complex DAG decomposition
    return RouteDecision(
        route=QueryRoute.MULTI_HOP_COMPLEX,
        confidence=0.75,
        reason="Complex or multi-faceted prompt requiring multi-agent planning.",
        fast_path=False,
        detected_entities=entity_names,
    )

