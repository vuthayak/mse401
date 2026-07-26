"""Attribute similarity via pgvector, with the survey vector steering the query.

Implements the spec's dynamic search vector modification: the shopper's stated
wants are embedded, then the garment they just rejected is subtracted in
proportion to how much they disliked it, pushing the nearest-neighbour search
away from the thing that failed.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from .catalog_text import build_desire_text, unhappy_attributes, variation_embedding_text
from .gemini_client import GeminiClient
from .supabase_client import SupabaseClient, SupabaseError

logger = logging.getLogger(__name__)

# How hard to push away from the rejected garment, per complaint. Capped so the
# query never inverts into "the opposite of everything in the catalog".
PENALTY_PER_COMPLAINT = 0.12
MAX_PENALTY = 0.36


def _normalize(vector: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        return vector
    return [value / magnitude for value in vector]


def _apply_negative_override(
    desire: list[float], current: list[float] | None, complaint_count: int
) -> list[float]:
    if not current or complaint_count == 0 or len(current) != len(desire):
        return _normalize(desire)

    penalty = min(PENALTY_PER_COMPLAINT * complaint_count, MAX_PENALTY)
    shifted = [d - penalty * c for d, c in zip(desire, current)]
    return _normalize(shifted)


async def similarity_scores(
    supabase: SupabaseClient,
    gemini: GeminiClient,
    current: dict[str, Any],
    vector: dict[str, int],
    candidates: list[dict[str, Any]],
) -> dict[str, float]:
    """Cosine similarity per candidate variation id, or {} if unavailable."""
    if not gemini.enabled or not candidates:
        return {}

    desire_text = build_desire_text(current, vector)
    current_text = variation_embedding_text(current)

    embeddings = await gemini.embed_documents([desire_text, current_text])
    if not embeddings or len(embeddings) < 2:
        return {}

    query_vector = _apply_negative_override(
        embeddings[0], embeddings[1], len(unhappy_attributes(vector))
    )

    candidate_ids = [row["variation_id"] for row in candidates]
    try:
        matches = await supabase.rpc(
            "search_similar_variations",
            {
                "p_query_embedding": query_vector,
                "p_candidate_ids": candidate_ids,
                "p_match_count": len(candidate_ids),
            },
        )
    except SupabaseError:
        logger.exception("pgvector similarity search failed")
        return {}

    return {row["variation_id"]: float(row["similarity"]) for row in matches or []}


def blend_scores(
    candidates: list[dict[str, Any]], similarity: dict[str, float]
) -> list[dict[str, Any]]:
    """Order by rule score and vector similarity together.

    Rule score is normalized against the strongest candidate so the two signals
    stay comparable; the deterministic rules keep the larger share because they
    encode hard retail constraints rather than a fuzzy style match.
    """
    if not similarity:
        return sorted(
            candidates,
            key=lambda row: (-int(row.get("rule_score", 0)), float(row["unit_price"])),
        )

    max_rule = max((int(row.get("rule_score", 0)) for row in candidates), default=0) or 1

    def combined(row: dict[str, Any]) -> float:
        rule_component = int(row.get("rule_score", 0)) / max_rule
        vector_component = similarity.get(row["variation_id"], 0.0)
        return 0.65 * rule_component + 0.35 * vector_component

    ranked = sorted(candidates, key=lambda row: (-combined(row), float(row["unit_price"])))
    for row in ranked:
        row["similarity"] = round(similarity.get(row["variation_id"], 0.0), 4)
    return ranked
