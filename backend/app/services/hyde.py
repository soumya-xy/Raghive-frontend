from __future__ import annotations

import logging
from typing import Any, Optional

import cachetools
import numpy as np

from app.services.hybrid_retriever import hybrid_query_chunks
from app.services.llm import chat_complete, llm_available

logger = logging.getLogger(__name__)

# LRU Cache for hypothetical documents to prevent redundant LLM generation
_hyde_cache = cachetools.LRUCache(maxsize=256)

HYDE_SYSTEM_PROMPT = (
    "You are an academic textbook and technical documentation author. "
    "Given a technical question, write a concise 2-to-3 sentence factual passage "
    "that directly explains the concepts or answers the question as it would appear "
    "in an authoritative reference manual or textbook. Do not add intro or outro fluff."
)


def generate_hypothetical_document(query: str) -> Optional[str]:
    """Generate a hypothetical document passage (HyDE) to bridge the query-passage gap."""
    clean_q = query.strip()
    if not clean_q or len(clean_q) < 5:
        return None

    if clean_q in _hyde_cache:
        return _hyde_cache[clean_q]

    if not llm_available():
        return None

    try:
        passage = chat_complete(
            system=HYDE_SYSTEM_PROMPT,
            user=f"Technical query: {clean_q}\n\nFactual passage:",
            temperature=0.2,
        )
        if passage and len(passage.strip()) > 15:
            _hyde_cache[clean_q] = passage.strip()
            logger.info("[hyde] Generated hypothetical passage for query: %s", clean_q[:50])
            return passage.strip()
    except Exception as exc:
        logger.warning("[hyde] HyDE generation failed: %s; falling back to direct query", exc)

    return None


def hyde_hybrid_retrieve(
    query: str,
    top_k: int = 12,
    enable_hyde: bool = True,
) -> list[dict[str, Any]]:
    """
    Retrieve candidate chunks using HyDE-augmented Hybrid Retrieval:
      1. Retrieve direct candidates for original query using Hybrid (BM25 + BGE-M3 RRF)
      2. If HyDE enabled, generate hypothetical textbook excerpt
      3. Retrieve candidates for hypothetical passage
      4. Fuse and deduplicate candidate pools, boosting chunks found by both
    """
    primary_candidates = hybrid_query_chunks(query, top_k=top_k)

    if not enable_hyde:
        return primary_candidates

    hypothetical_doc = generate_hypothetical_document(query)
    if not hypothetical_doc:
        return primary_candidates

    # Retrieve using hypothetical document
    hyde_candidates = hybrid_query_chunks(hypothetical_doc, top_k=top_k)

    # Merge candidate pools
    seen: dict[str, dict[str, Any]] = {}
    for c in primary_candidates:
        seen[c["id"]] = dict(c)

    for c in hyde_candidates:
        cid = c["id"]
        if cid not in seen:
            # Document caught through hypothetical passage
            doc_copy = dict(c)
            doc_copy["hyde_match"] = True
            seen[cid] = doc_copy
        else:
            # Document caught by both direct query and hypothetical passage -> boost similarity
            existing = seen[cid]
            orig_sim = float(existing.get("similarity_score") or 0.0)
            hyde_sim = float(c.get("similarity_score") or 0.0)
            boosted = float(np.clip(0.60 * orig_sim + 0.40 * hyde_sim + 0.08, 0.0, 1.0))
            existing["similarity_score"] = boosted
            existing["hyde_boosted"] = True

    # Re-sort candidates by boosted similarity_score
    merged = sorted(seen.values(), key=lambda d: float(d.get("similarity_score") or 0.0), reverse=True)
    return merged[:top_k]

