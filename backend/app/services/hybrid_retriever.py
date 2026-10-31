from __future__ import annotations

import logging
import re
from typing import Any, Optional

import numpy as np
from rank_bm25 import BM25Okapi

from app.services.vectorstore import get_collection, query_chunks

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    """Tokenize text into lowercase alphanumeric tokens for BM25."""
    return [w.lower() for w in re.findall(r"\w+", text) if len(w) > 1]


class BM25CorpusIndex:
    """In-memory BM25 index over documents currently stored in ChromaDB."""

    def __init__(self):
        self._index: Optional[BM25Okapi] = None
        self._ids: list[str] = []
        self._docs: list[str] = []
        self._metas: list[dict[str, Any]] = []
        self._corpus_token_count: int = 0
        self._last_doc_count: int = -1

    def invalidate(self) -> None:
        """Force a rebuild on the next query."""
        self._index = None
        self._last_doc_count = -1

    def _ensure_index(self) -> bool:
        """Build or refresh BM25 index if collection contents changed."""
        try:
            col = get_collection()
            count = col.count()
            if count == 0:
                self._index = None
                return False

            if self._index is not None and count == self._last_doc_count:
                return True

            data = col.get(include=["documents", "metadatas"])
            ids = data.get("ids") or []
            docs = data.get("documents") or []
            metas = data.get("metadatas") or []

            if not ids or not docs:
                self._index = None
                return False

            tokenized_corpus = [_tokenize(doc) for doc in docs]
            self._index = BM25Okapi(tokenized_corpus)
            self._ids = list(ids)
            self._docs = list(docs)
            self._metas = [dict(m) if m else {} for m in metas]
            self._last_doc_count = len(ids)
            logger.info("[hybrid] Built in-memory BM25 index over %d documents.", len(ids))
            return True
        except Exception as exc:
            logger.warning("[hybrid] Failed to build BM25 index: %s", exc)
            self._index = None
            return False

    def query(self, query: str, top_k: int = 15) -> list[dict[str, Any]]:
        """Retrieve top_k candidates using BM25 sparse matching."""
        if not self._ensure_index() or self._index is None:
            return []

        tokens = _tokenize(query)
        if not tokens:
            return []

        try:
            scores = self._index.get_scores(tokens)
            if len(scores) == 0 or np.max(scores) <= 0:
                return []

            top_indices = np.argsort(scores)[::-1][:top_k]
            max_score = float(np.max(scores)) or 1.0

            results: list[dict[str, Any]] = []
            for rank_0, idx in enumerate(top_indices):
                score = float(scores[idx])
                if score <= 0.0:
                    continue
                meta = self._metas[idx] if idx < len(self._metas) else {}
                page = meta.get("page") or 0
                results.append(
                    {
                        "id": self._ids[idx],
                        "source": meta.get("source") or "unknown",
                        "page": int(page) if page else None,
                        "text": self._docs[idx],
                        "bm25_score": score,
                        "bm25_norm": float(np.clip(score / max_score, 0.0, 1.0)),
                        "bm25_rank": rank_0 + 1,
                        "raw_table_json": meta.get("raw_table_json"),
                        "metadata": meta,
                    }
                )
            return results
        except Exception as exc:
            logger.warning("[hybrid] BM25 query error: %s", exc)
            return []


# Global singleton instance of the BM25 index
_bm25_corpus = BM25CorpusIndex()


def get_bm25_index() -> BM25CorpusIndex:
    return _bm25_corpus


def rrf_fuse(
    dense_candidates: list[dict[str, Any]],
    sparse_candidates: list[dict[str, Any]],
    k: int = 60,
    dense_weight: float = 0.60,
    sparse_weight: float = 0.40,
    top_k: int = 12,
) -> list[dict[str, Any]]:
    """
    Reciprocal Rank Fusion (RRF) combining dense (BGE-M3) and sparse (BM25) candidates.

    RRF(d) = (dense_weight / (k + rank_dense(d))) + (sparse_weight / (k + rank_sparse(d)))
    """
    by_id: dict[str, dict[str, Any]] = {}
    dense_ranks: dict[str, int] = {}
    sparse_ranks: dict[str, int] = {}

    for rank, doc in enumerate(dense_candidates, start=1):
        did = doc["id"]
        dense_ranks[did] = rank
        if did not in by_id:
            by_id[did] = dict(doc)

    for rank, doc in enumerate(sparse_candidates, start=1):
        did = doc["id"]
        sparse_ranks[did] = rank
        if did not in by_id:
            by_id[did] = dict(doc)
        else:
            # Enrich with BM25 metadata
            by_id[did]["bm25_score"] = doc.get("bm25_score", 0.0)
            by_id[did]["bm25_rank"] = rank

    rrf_scores: dict[str, float] = {}
    max_possible_rrf = (dense_weight / (k + 1)) + (sparse_weight / (k + 1))

    for did in by_id:
        score = 0.0
        if did in dense_ranks:
            score += dense_weight / (k + dense_ranks[did])
        if did in sparse_ranks:
            score += sparse_weight / (k + sparse_ranks[did])
        # Normalized to roughly [0.0, 1.0]
        norm_score = float(np.clip(score / max_possible_rrf, 0.0, 1.0))
        rrf_scores[did] = norm_score

    # Sort candidates by combined RRF score descending
    sorted_ids = sorted(by_id.keys(), key=lambda did: rrf_scores[did], reverse=True)[:top_k]

    fused_results: list[dict[str, Any]] = []
    for did in sorted_ids:
        doc = by_id[did]
        # Blend original similarity with RRF score to maintain downstream compatibility
        orig_sim = float(doc.get("similarity_score") or 0.0)
        rrf_sim = rrf_scores[did]
        # Blended similarity: heavily informed by RRF rank fusion
        doc["similarity_score"] = float(np.clip(0.65 * rrf_sim + 0.35 * orig_sim, 0.0, 1.0))
        doc["rrf_score"] = rrf_sim
        doc["dense_rank"] = dense_ranks.get(did)
        doc["sparse_rank"] = sparse_ranks.get(did)
        fused_results.append(doc)

    return fused_results


def hybrid_query_chunks(query: str, top_k: int = 12) -> list[dict[str, Any]]:
    """
    Perform Hybrid Retrieval:
      1. Dense retrieval using BGE-M3 (1024-dim) via ChromaDB
      2. Sparse retrieval using BM25Okapi over the corpus
      3. Reciprocal Rank Fusion (RRF) to merge candidate pools
    """
    # Query more candidates from each arm for richer fusion pool
    retrieve_pool = max(top_k * 2, 16)
    dense_candidates = query_chunks(query, top_k=retrieve_pool)
    bm25_candidates = _bm25_corpus.query(query, top_k=retrieve_pool)

    if not bm25_candidates:
        # Fallback to pure dense if BM25 had no matches
        return dense_candidates[:top_k]

    if not dense_candidates:
        # Fallback to pure sparse if dense had no matches
        return bm25_candidates[:top_k]

    return rrf_fuse(dense_candidates, bm25_candidates, top_k=top_k)

