from __future__ import annotations

import logging
import threading
from typing import Any, Optional

import numpy as np

from app.config import get_settings

logger = logging.getLogger(__name__)

_model = None
_tokenizer = None
_cross_encoder = None
_reranker_name = "none"
_device = "cpu"
_reranker_lock = threading.Lock()


def reranker_backend() -> str:
    if _reranker_name != "none":
        return _reranker_name
    settings = get_settings()
    return settings.reranker_model or "BAAI/bge-reranker-v2-gemma"


def _ensure() -> None:
    global _model, _tokenizer, _cross_encoder, _reranker_name, _device
    if _model is not None or _cross_encoder is not None or _reranker_name != "none":
        return

    with _reranker_lock:
        if _model is not None or _cross_encoder is not None or _reranker_name != "none":
            return

        settings = get_settings()
        model_name = settings.reranker_model or "BAAI/bge-reranker-v2-gemma"

        try:
            import torch

            _device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            _device = "cpu"

        # In lite mode on CPU, check if cached locally; if not, don't stall with 10GB download
        if settings.raghive_mode == "lite" and _device == "cpu":
            try:
                import torch
                from transformers import AutoModelForSequenceClassification, AutoTokenizer

                logger.info("Checking for locally cached %s...", model_name)
                _tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
                _model = AutoModelForSequenceClassification.from_pretrained(model_name, local_files_only=True)
                _model.to(_device)
                _model.eval()
                _reranker_name = model_name
                logger.info("Loaded locally cached cross-encoder %s", model_name)
                return
            except Exception:
                logger.info(
                    "RAGHIVE_MODE=lite on CPU without local cache for %s. Operating in BGE-M3 high-dimensional mode.",
                    model_name,
                )
                _reranker_name = "bge-m3-similarity"
                return

        # Primary: Native HuggingFace Sequence Classification with 8,192 token window
        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            dtype = (
                torch.bfloat16
                if (torch.cuda.is_available() and torch.cuda.is_bf16_supported())
                else (torch.float16 if torch.cuda.is_available() else torch.float32)
            )
            logger.info("Loading native cross-encoder %s on %s (dtype=%s)...", model_name, _device, dtype)
            _tokenizer = AutoTokenizer.from_pretrained(model_name)
            _model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                torch_dtype=dtype,
            )
            _model.to(_device)
            _model.eval()
            _reranker_name = model_name
            logger.info("Successfully loaded native cross-encoder %s", model_name)
            return
        except Exception as exc:
            logger.warning(
                "Native HF load failed for %s (%s). Attempting SentenceTransformer CrossEncoder fallback.",
                model_name,
                exc,
            )

        # Fallback: SentenceTransformer CrossEncoder
        try:
            from sentence_transformers import CrossEncoder

            _cross_encoder = CrossEncoder(model_name, max_length=8192, device=_device)
            _reranker_name = model_name
            logger.info("Successfully loaded SentenceTransformer CrossEncoder %s", model_name)
            return
        except Exception as exc2:
            logger.warning("CrossEncoder fallback failed for %s: %s. Using similarity-only sort.", model_name, exc2)

        _reranker_name = "similarity-only"


def rerank(query: str, chunks: list[dict[str, Any]], top_n: int) -> list[dict[str, Any]]:
    """Rerank candidates using BAAI/bge-reranker-v2-gemma with full 8,192 token capacity."""
    _ensure()
    if not chunks:
        return []

    # Fallback to similarity sort if cross-encoder weights could not be loaded
    if _model is None and _cross_encoder is None:
        ranked = sorted(chunks, key=lambda c: float(c.get("similarity_score", 0.0)), reverse=True)
        for c in ranked[:top_n]:
            if "rerank_score" not in c:
                c["rerank_score"] = float(c.get("similarity_score", 0.0))
        return ranked[:top_n]

    # Full text segments fed directly without character truncation
    pairs = [[query, str(c.get("text", ""))] for c in chunks]

    scores: list[float] = []

    with _reranker_lock:
        # Path A: Native HuggingFace AutoModel
        if _model is not None and _tokenizer is not None:
            import torch

            batch_size = 8
            for i in range(0, len(pairs), batch_size):
                batch_pairs = pairs[i : i + batch_size]
                with torch.no_grad():
                    inputs = _tokenizer(
                        batch_pairs,
                        padding=True,
                        truncation=True,
                        max_length=8192,
                        return_tensors="pt",
                    )
                    inputs = {k: v.to(_device) for k, v in inputs.items()}
                    logits = _model(**inputs, return_dict=True).logits.view(-1).float()
                    # Apply sigmoid normalization to obtain a calibrated [0.0, 1.0] probability
                    batch_scores = torch.sigmoid(logits).cpu().tolist()
                    if isinstance(batch_scores, float):
                        batch_scores = [batch_scores]
                    scores.extend(batch_scores)

        # Path B: CrossEncoder wrapper
        elif _cross_encoder is not None:
            raw_scores = _cross_encoder.predict(pairs)
            if hasattr(raw_scores, "tolist"):
                raw_scores = raw_scores.tolist()
            for s in raw_scores:
                val = float(s)
                # Map logit via sigmoid if output is unconstrained
                prob = float(1.0 / (1.0 + np.exp(-val))) if (val < 0.0 or val > 1.0) else val
                scores.append(prob)

    decorated = list(zip(chunks, scores))
    decorated.sort(key=lambda x: float(x[1]), reverse=True)

    out: list[dict[str, Any]] = []
    for chunk, score in decorated[:top_n]:
        item = dict(chunk)
        item["rerank_score"] = float(np.clip(score, 0.0, 1.0))
        out.append(item)

    return out
