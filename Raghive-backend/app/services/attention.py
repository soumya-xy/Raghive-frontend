"""
Attention extraction via a lightweight proxy model.

This is an *independent grounding verification* via Qwen2.5-0.5B (or a
lexical fallback). It does **not** explain why the 32B generated a plan —
vLLM does not expose per-layer attention, so a smaller local model is used
as a proxy. Adapted from MA_RAG_BTP/utils/attention_extractor.py.
"""
from __future__ import annotations

import gc
import math
import re
from typing import Any, Optional

import numpy as np

from app.config import get_settings

_tokenizer = None
_tokenizer_name: Optional[str] = None


def get_xai_tokenizer():
    """Module-level tokenizer singleton — must match the attention proxy."""
    global _tokenizer, _tokenizer_name
    settings = get_settings()
    if _tokenizer is not None and _tokenizer_name == settings.xai_model_name:
        return _tokenizer
    try:
        from transformers import AutoTokenizer

        _tokenizer = AutoTokenizer.from_pretrained(settings.xai_model_name)
        _tokenizer_name = settings.xai_model_name
        return _tokenizer
    except Exception:
        _tokenizer = WhitespaceTokenizer()
        _tokenizer_name = "whitespace-fallback"
        return _tokenizer


class WhitespaceTokenizer:
    """Minimal tokenizer used when HuggingFace weights are unavailable."""

    def __call__(self, text: str, return_tensors=None, add_special_tokens=True, return_offsets_mapping=False):
        tokens = _ws_tokens(text)
        ids = list(range(len(tokens)))
        offsets = []
        pos = 0
        lower = text
        for tok in tokens:
            idx = lower.find(tok, pos)
            if idx < 0:
                idx = pos
            offsets.append((idx, idx + len(tok)))
            pos = idx + len(tok)
        out: dict[str, Any] = {"input_ids": ids, "offset_mapping": offsets}
        if return_tensors == "pt":
            import numpy as np

            class _T:
                def __init__(self, arr):
                    self._arr = np.array([arr])

                def to(self, _device):
                    return self

                @property
                def shape(self):
                    return self._arr.shape

                def __getitem__(self, idx):
                    return self._arr[idx]

            out["input_ids"] = _T(ids)
        return out

    def decode(self, ids):
        if isinstance(ids, int):
            return str(ids)
        return " ".join(str(i) for i in ids)


def _ws_tokens(text: str) -> list[str]:
    return re.findall(r"\S+", text) or [text]


def load_hf_model(model_name: str, use_4bit: bool = False):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    kwargs: dict[str, Any] = {
        "device_map": "auto",
        "attn_implementation": "eager",
    }
    if use_4bit:
        try:
            from transformers import BitsAndBytesConfig

            kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
            )
        except Exception:
            kwargs["torch_dtype"] = torch.float16
    else:
        kwargs["torch_dtype"] = torch.float16
    model = AutoModelForCausalLM.from_pretrained(model_name, **kwargs)
    model.eval()
    return model, tokenizer


def unload_hf_model(model) -> None:
    del model
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def extract_attention_weights(query: str, plan_text: str, model, tokenizer) -> dict[str, Any]:
    import torch

    query = query.replace("?", "")
    text = f"Query: {query}\nPlan: {plan_text}"
    inputs = tokenizer(text, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    query_prefix = "Query:"
    query_part = f"Query: {query}"
    query_and_plan_prefix = f"Query: {query}\nPlan:"

    query_prefix_len = len(tokenizer(query_prefix, add_special_tokens=False)["input_ids"])
    query_part_len = len(tokenizer(query_part, add_special_tokens=False)["input_ids"])
    query_and_plan_prefix_len = len(
        tokenizer(query_and_plan_prefix, add_special_tokens=False)["input_ids"]
    )
    query_token_span = (query_prefix_len, query_part_len)
    plan_token_span = (query_and_plan_prefix_len, inputs["input_ids"].shape[1])

    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    attentions = outputs.attentions
    last_4_layers = attentions[-4:]
    stacked = torch.stack(last_4_layers)
    agg_attention = stacked.mean(dim=0).squeeze(0).mean(dim=0)
    attention_matrix = agg_attention.cpu().float().numpy()
    token_received_attention = attention_matrix.mean(axis=0)
    input_ids = inputs["input_ids"][0].cpu().tolist()
    tokens = [tokenizer.decode([idx]) for idx in input_ids]
    return {
        "attention_matrix": attention_matrix,
        "token_received_attention": token_received_attention,
        "input_ids": input_ids,
        "tokens": tokens,
        "query_token_span": query_token_span,
        "plan_token_span": plan_token_span,
        "proxy": True,
    }


def lexical_attention_fallback(query: str, plan_text: str, keywords: list[str]) -> dict[str, Any]:
    """
    Deterministic stand-in used when the 0.5B proxy cannot be loaded.
    Overlap between plan tokens and query/keyword tokens — not a 32B explanation.
    """
    q_tokens = _ws_tokens(query)
    p_tokens = _ws_tokens(plan_text)
    tokens = ["Query:"] + q_tokens + ["Plan:"] + p_tokens
    q_start, q_end = 1, 1 + len(q_tokens)
    p_start, p_end = q_end + 1, len(tokens)
    n = len(tokens)
    matrix = np.zeros((n, n), dtype=np.float32)
    kw_l = [k.lower() for k in keywords]
    for i, tok in enumerate(tokens):
        tl = tok.lower().strip(".,;:!?")
        for j, src in enumerate(tokens):
            sl = src.lower().strip(".,;:!?")
            if not sl:
                continue
            score = 0.05
            if tl == sl:
                score = 0.9
            elif tl in sl or sl in tl:
                score = 0.55
            elif any(k in sl or sl in k for k in kw_l if k):
                score = max(score, 0.35)
            matrix[i, j] = score
    # row-normalize
    row_sums = matrix.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    matrix = matrix / row_sums
    return {
        "attention_matrix": matrix,
        "token_received_attention": matrix.mean(axis=0),
        "input_ids": list(range(n)),
        "tokens": tokens,
        "query_token_span": (q_start, q_end),
        "plan_token_span": (p_start, p_end),
        "proxy": False,
    }


def run_attention_pass(query: str, plan_text: str, keywords: list[str]) -> dict[str, Any]:
    settings = get_settings()
    try:
        model, tokenizer = load_hf_model(settings.xai_model_name, use_4bit=True)
        try:
            return extract_attention_weights(query, plan_text, model, tokenizer)
        finally:
            unload_hf_model(model)
    except Exception:
        return lexical_attention_fallback(query, plan_text, keywords)


def slice_plan_to_query(attention_weights: dict[str, Any]) -> tuple[list[list[float]], list[str], list[str]]:
    matrix = np.array(attention_weights["matrix"] if "matrix" in attention_weights else attention_weights["attention_matrix"])
    tokens = attention_weights["tokens"]
    q_start, q_end = attention_weights["query_token_span"]
    p_start, p_end = attention_weights["plan_token_span"]
    sliced = matrix[p_start:p_end, q_start:q_end]
    if sliced.size == 0:
        return [[0.0]], ["(empty)"], ["(empty)"]
    # cap for the UI
    max_r, max_c = 48, 48
    if sliced.shape[0] > max_r or sliced.shape[1] > max_c:
        sliced = _pool(sliced, max_r, max_c)
        row_labels = _pool_labels(tokens[p_start:p_end], sliced.shape[0])
        col_labels = _pool_labels(tokens[q_start:q_end], sliced.shape[1])
    else:
        row_labels = tokens[p_start:p_end]
        col_labels = tokens[q_start:q_end]
    return np.clip(sliced, 0, 1).tolist(), [str(x) for x in row_labels], [str(x) for x in col_labels]


def _pool(mat: np.ndarray, rows: int, cols: int) -> np.ndarray:
    r = max(1, mat.shape[0] // rows)
    c = max(1, mat.shape[1] // cols)
    out = []
    for i in range(0, mat.shape[0], r):
        row = []
        for j in range(0, mat.shape[1], c):
            row.append(float(mat[i : i + r, j : j + c].mean()))
        out.append(row)
        if len(out) >= rows:
            break
    return np.array(out, dtype=np.float32)[:rows, :cols]


def _pool_labels(labels: list[str], n: int) -> list[str]:
    if len(labels) <= n:
        return labels
    step = max(1, len(labels) // n)
    return [labels[i] for i in range(0, len(labels), step)][:n]
