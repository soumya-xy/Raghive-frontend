from __future__ import annotations

import hashlib
import logging
import time
from typing import Any, Optional

import cachetools
import numpy as np

from app.services.embeddings import cosine, embed_query

logger = logging.getLogger(__name__)


def _query_key(query: str, strictness: str = "standard") -> str:
    norm = " ".join(query.lower().strip().split())
    return hashlib.sha256(f"{norm}|{strictness}".encode("utf-8")).hexdigest()


class SemanticPipelineCache:
    """
    Two-tier cache for RAGHive multi-agent pipeline results:
      Tier 1: Exact query hash matching via TTLCache (O(1), <0.1ms)
      Tier 2: Semantic vector similarity matching via BGE-M3 embeddings (<2ms)
    """

    def __init__(
        self,
        maxsize: int = 256,
        ttl_seconds: int = 3600,
        similarity_threshold: float = 0.85,
    ):
        self._exact_cache: cachetools.TTLCache = cachetools.TTLCache(maxsize=maxsize, ttl=ttl_seconds)
        self._semantic_entries: list[dict[str, Any]] = []
        self._maxsize = maxsize
        self._similarity_threshold = similarity_threshold

    def clear(self) -> None:
        """Clear all cached entries (called on re-index or document upload)."""
        self._exact_cache.clear()
        self._semantic_entries.clear()
        logger.info("[cache] Semantic and exact pipeline caches cleared.")

    def get(
        self,
        query: str,
        strictness: str = "standard",
        min_similarity: Optional[float] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Look up a previous query result.
        Returns the cached payload or None if no match meets the threshold.
        """
        threshold = min_similarity if min_similarity is not None else self._similarity_threshold
        key = _query_key(query, strictness)

        # 1. Tier 1: Exact Hash Hit
        if key in self._exact_cache:
            entry = self._exact_cache[key]
            logger.info("[cache] Tier 1 exact cache HIT for query: '%s'", query[:40])
            payload = dict(entry["payload"])
            payload["cache_hit_type"] = "exact"
            payload["cache_similarity"] = 1.0
            return payload

        # 2. Tier 2: Semantic Vector Cosine Hit
        if not self._semantic_entries:
            return None

        try:
            q_emb = embed_query(query)
            best_sim = -1.0
            best_entry: Optional[dict[str, Any]] = None

            for item in self._semantic_entries:
                if item["strictness"] != strictness:
                    continue
                sim = cosine(q_emb, item["embedding"])
                if sim > best_sim:
                    best_sim = sim
                    best_entry = item

            if best_sim >= threshold and best_entry is not None:
                logger.info(
                    "[cache] Tier 2 semantic cache HIT (similarity=%.3f >= %.2f) for query: '%s' matching '%s'",
                    best_sim,
                    threshold,
                    query[:40],
                    best_entry["query"][:40],
                )
                payload = dict(best_entry["payload"])
                payload["cache_hit_type"] = "semantic"
                payload["cache_similarity"] = float(best_sim)
                payload["matched_query"] = best_entry["query"]
                return payload
        except Exception as exc:
            logger.warning("[cache] Semantic cache lookup error: %s", exc)

        return None

    def put(
        self,
        query: str,
        payload: dict[str, Any],
        strictness: str = "standard",
    ) -> None:
        """Store a completed pipeline result in both exact and semantic caches."""
        if not query.strip():
            return

        key = _query_key(query, strictness)
        cache_item = {
            "query": query,
            "strictness": strictness,
            "payload": payload,
            "timestamp": time.time(),
        }

        # Store in Tier 1 exact
        self._exact_cache[key] = cache_item

        # Store in Tier 2 semantic
        try:
            q_emb = embed_query(query)
            cache_item["embedding"] = q_emb

            # Evict oldest if full
            if len(self._semantic_entries) >= self._maxsize:
                self._semantic_entries.pop(0)

            self._semantic_entries.append(cache_item)
            logger.info("[cache] Stored query in semantic cache: '%s'", query[:40])
        except Exception as exc:
            logger.warning("[cache] Could not store semantic vector in cache: %s", exc)


# Global singleton instance
_pipeline_cache = SemanticPipelineCache()


def get_pipeline_cache() -> SemanticPipelineCache:
    return _pipeline_cache
