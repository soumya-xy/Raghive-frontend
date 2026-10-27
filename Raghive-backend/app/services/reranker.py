from __future__ import annotations

from typing import Any

from app.config import get_settings

_reranker = None
_reranker_name = "none"


def reranker_backend() -> str:
    _ensure()
    return _reranker_name


def _ensure() -> None:
    global _reranker, _reranker_name
    if _reranker is not None or _reranker_name != "none":
        return
    settings = get_settings()
    for name in (settings.reranker_model, "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        try:
            from sentence_transformers import CrossEncoder

            _reranker = CrossEncoder(name)
            _reranker_name = name
            return
        except Exception:
            continue
    _reranker = None
    _reranker_name = "similarity-only"


def rerank(query: str, chunks: list[dict[str, Any]], top_n: int) -> list[dict[str, Any]]:
    _ensure()
    if not chunks:
        return []
    if _reranker is None:
        ranked = sorted(chunks, key=lambda c: c.get("similarity_score", 0.0), reverse=True)
        return ranked[:top_n]
    pairs = [(query, c["text"]) for c in chunks]
    scores = _reranker.predict(pairs)
    decorated = list(zip(chunks, scores))
    decorated.sort(key=lambda x: float(x[1]), reverse=True)
    out = []
    for chunk, score in decorated[:top_n]:
        item = dict(chunk)
        item["rerank_score"] = float(score)
        out.append(item)
    return out
