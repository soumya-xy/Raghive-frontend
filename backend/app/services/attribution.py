"""
NormEnsembleXAI for retrieved chunks.

A_ens = normalized ensemble of:
  1. gradient-based signal (input-embedding sensitivity when a local encoder
     exposing gradients is available; otherwise a cosine × lexical proxy)
  2. leave-one-out perturbation of the retrieved set

This is what makes "kept because it actually matters" distinct from
"kept because it looked similar."
"""
from __future__ import annotations

import logging
import re
from typing import Any

import numpy as np

from app.services.embeddings import cosine01, embed_query, embed_texts

logger = logging.getLogger(__name__)


def _calibrate_signals(values: list[float], floor: float = 0.25) -> list[float]:
    if not values:
        return []
    lo, hi = min(values), max(values)
    if hi - lo < 1e-6:
        return [float(np.clip(v if 0.0 <= v <= 1.0 else 0.5, floor, 1.0)) for v in values]
    # Soft relative scaling that preserves a floor rather than zeroing out lower-ranked chunks
    return [float(np.clip(floor + (1.0 - floor) * ((v - lo) / (hi - lo)), 0.0, 1.0)) for v in values]


def _lexical_overlap(query: str, text: str) -> float:
    # Match words of 3+ alphanumeric characters, excluding very common stop words
    stopwords = {"the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "what", "how", "why"}
    q = {w for w in re.findall(r"[a-z0-9]{3,}", query.lower()) if w not in stopwords}
    t = {w for w in re.findall(r"[a-z0-9]{3,}", text.lower()) if w not in stopwords}
    if not q:
        return 0.0
    return len(q & t) / len(q)


def gradient_signals(query: str, chunks: list[dict[str, Any]], query_emb: np.ndarray, chunk_embs: np.ndarray) -> list[float]:
    """
    Prefer a real gradient pass through the embedding encoder when the loaded
    SentenceTransformer exposes parameters; otherwise use a cosine×lexical proxy.
    """
    from app.config import get_settings

    if get_settings().raghive_mode == "lite":
        scores = []
        for i, chunk in enumerate(chunks):
            sim = cosine01(query_emb, chunk_embs[i])
            lex = _lexical_overlap(query, str(chunk.get("text", "")))
            scores.append(float(np.clip(0.65 * sim + 0.35 * lex, 0.0, 1.0)))
        return scores

    try:
        return _encoder_gradients(query, [str(c.get("text", "")) for c in chunks])
    except Exception as exc:
        logger.debug("Encoder gradient pass using proxy fallback: %s", exc)
        scores = []
        for i, chunk in enumerate(chunks):
            sim = cosine01(query_emb, chunk_embs[i])
            lex = _lexical_overlap(query, str(chunk.get("text", "")))
            scores.append(float(np.clip(0.65 * sim + 0.35 * lex, 0.0, 1.0)))
        return scores


def _encoder_gradients(query: str, texts: list[str]) -> list[float]:
    from app.services.embeddings import _embedder

    if _embedder is None or _embedder == "hash":
        raise RuntimeError("no differentiable encoder")
    import torch

    model = _embedder
    model.eval()
    scores: list[float] = []

    # Detect device
    device = getattr(model, "device", "cpu")
    q_tok = model.tokenize([query])
    q_tok = {k: v.to(device) if hasattr(v, "to") else v for k, v in q_tok.items()}

    with torch.enable_grad():
        q_emb = model.forward(q_tok)["sentence_embedding"]
        q_emb = torch.nn.functional.normalize(q_emb, p=2, dim=1)
        for text in texts:
            t_tok = model.tokenize([text])
            t_tok = {k: v.to(device) if hasattr(v, "to") else v for k, v in t_tok.items()}
            for v in t_tok.values():
                if hasattr(v, "requires_grad"):
                    v.requires_grad_(False)
            t_emb = model.forward(t_tok)["sentence_embedding"]
            t_emb = torch.nn.functional.normalize(t_emb, p=2, dim=1)
            sim = torch.sum(q_emb * t_emb)
            if t_emb.requires_grad:
                grad = torch.autograd.grad(sim, t_emb, retain_graph=False)[0]
                scores.append(float(grad.abs().mean().detach().cpu()))
            else:
                scores.append(float(sim.detach().cpu()))
    return scores


def loo_signals(query_emb: np.ndarray, chunk_embs: np.ndarray) -> list[float]:
    n = chunk_embs.shape[0]
    if n == 0:
        return []
    if n == 1:
        return [1.0]
    full = chunk_embs.mean(axis=0)
    full_sim = cosine01(query_emb, full)
    out: list[float] = []
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        reduced = chunk_embs[mask].mean(axis=0)
        drop = full_sim - cosine01(query_emb, reduced)
        out.append(max(0.0, float(drop)))
    return out


def dual_score(query: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not chunks:
        return []
    query_emb = embed_query(query)
    chunk_embs = embed_texts([str(c.get("text", "")) for c in chunks])
    sims = [cosine01(query_emb, chunk_embs[i]) for i in range(len(chunks))]
    raw_grads = gradient_signals(query, chunks, query_emb, chunk_embs)
    grads = _calibrate_signals(raw_grads, floor=0.30)
    loos = _calibrate_signals(loo_signals(query_emb, chunk_embs), floor=0.25)
    scored: list[dict[str, Any]] = []
    for i, chunk in enumerate(chunks):
        a_ens = 0.5 * grads[i] + 0.5 * loos[i]
        item = dict(chunk)
        item["similarity_score"] = float(np.clip(sims[i], 0.0, 1.0))
        item["attribution_score"] = float(np.clip(a_ens, 0.0, 1.0))
        scored.append(item)
    return scored
