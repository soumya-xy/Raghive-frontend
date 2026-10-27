from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Strictness = Literal["standard", "thorough"]


@dataclass(frozen=True)
class Thresholds:
    sim_threshold: float
    attribution_threshold: float
    xai_threshold: float
    self_consistency_threshold: float
    grounding_threshold: float
    erasure_sim_threshold: float
    citation_share: float
    metric_min_hit_rate: float
    metric_min_mrr: float
    metric_min_context_precision: float
    top_k: int
    rerank_n: int


_STANDARD = Thresholds(
    sim_threshold=0.52,
    attribution_threshold=0.48,
    xai_threshold=0.60,
    self_consistency_threshold=0.75,
    grounding_threshold=0.70,
    erasure_sim_threshold=0.85,
    citation_share=0.15,
    metric_min_hit_rate=0.50,
    metric_min_mrr=0.33,
    metric_min_context_precision=0.50,
    top_k=12,
    rerank_n=8,
)

_THOROUGH = Thresholds(
    sim_threshold=0.68,
    attribution_threshold=0.62,
    xai_threshold=0.75,
    self_consistency_threshold=0.85,
    grounding_threshold=0.85,
    erasure_sim_threshold=0.80,
    citation_share=0.12,
    metric_min_hit_rate=0.70,
    metric_min_mrr=0.50,
    metric_min_context_precision=0.65,
    top_k=20,
    rerank_n=12,
)


def get_thresholds(strictness: str | None) -> Thresholds:
    if (strictness or "standard").lower() == "thorough":
        return _THOROUGH
    return _STANDARD
