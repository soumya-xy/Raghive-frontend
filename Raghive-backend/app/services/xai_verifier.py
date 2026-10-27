"""
XAI verifier — independent grounding check via the attention proxy.

Adapted from MA_RAG_BTP/utils/xai_verifier.py. Parameter renamed from
"ground truth" to "reference entities" (GLiNER is not a hand-labeled set).
"""
from __future__ import annotations

from typing import Any

import numpy as np


def compute_entity_xai_score(token_positions: list[int], token_received_attention: np.ndarray) -> float:
    if not token_positions:
        return 0.0
    attn_values = []
    for pos in token_positions:
        if pos < len(token_received_attention):
            attn_values.append(token_received_attention[pos])
    if not attn_values:
        return 0.0
    attn_values = np.array(attn_values, dtype=np.float64)
    epsilon = 1e-8
    mean_sq = np.mean(attn_values ** 2)
    sq_mean = np.mean(attn_values) ** 2
    raw_score = mean_sq / (sq_mean + epsilon)
    median_attn = np.median(token_received_attention)
    entity_xai_score = raw_score / (median_attn + epsilon)
    return float(np.clip(entity_xai_score, 0.0, 1.0))


def verify_planner_focus(
    reference_entities: list[dict[str, Any]],
    attention_output: dict[str, Any],
    threshold: float = 0.6,
) -> dict[str, Any]:
    if not reference_entities:
        return {
            "overall_xai_score": 1.0,
            "entity_scores": [],
            "ignored_entities": [],
            "verification_passed": True,
        }

    token_received_attention = np.asarray(attention_output["token_received_attention"])
    entity_scores = []
    ignored_entities: list[str] = []

    for entity in reference_entities:
        positions = entity.get("token_positions", [])
        score = compute_entity_xai_score(positions, token_received_attention)
        attn_values = [
            float(token_received_attention[p])
            for p in positions
            if p < len(token_received_attention)
        ]
        status = "attended" if score >= threshold else "ignored"
        entity_scores.append(
            {
                "text": entity["text"],
                "token_positions": positions,
                "attn_values": attn_values,
                "xai_score": score,
                "status": status,
                "source": entity.get("source", "unknown"),
            }
        )
        if status == "ignored":
            ignored_entities.append(entity["text"])

    overall_score = float(np.mean([e["xai_score"] for e in entity_scores])) if entity_scores else 1.0
    return {
        "overall_xai_score": overall_score,
        "entity_scores": entity_scores,
        "ignored_entities": ignored_entities,
        "verification_passed": overall_score >= threshold,
    }
