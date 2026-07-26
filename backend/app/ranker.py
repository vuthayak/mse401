"""Stage 2: LLM feedback-driven tuning engine.

Gemini never chooses from the open catalog — it only reorders and explains the
pool Stage 1 already proved is in stock and rule-compliant. Anything it returns
that is not in that pool is discarded, so a hallucinated SKU can never reach a
shopper.
"""

from __future__ import annotations

import logging
from typing import Any

from .catalog_text import describe_current_item, describe_feedback, unhappy_attributes
from .gemini_client import GeminiClient
from .rules import heuristic_reasons

logger = logging.getLogger(__name__)

RANKING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string"},
                    "reasons": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "maxItems": 3,
                    },
                },
                "required": ["item_id", "reasons"],
            },
        }
    },
    "required": ["recommendations"],
}

SYSTEM_PROMPT = """You are the stylist for an in-store fitting room tablet.

A shopper tried one garment, rated it on four dimensions (1-5), and declined to
buy it. Your job is to rank the pre-approved alternatives below and explain each
one in the shopper's own terms.

Hard rules:
- Only ever return item_id values from the candidate list. Never invent one.
- Return exactly {limit} recommendations, best first.
- Every candidate is already in stock in the size shown; do not question that.
- Address the dimensions the shopper rated poorly. Ignore the ones they liked.
- Each reason is one short sentence, under 90 characters, concrete and specific
  (name the fabric, colour, size or price). No marketing fluff, no emoji.
- Never claim a garment is cheaper, roomier, or a different fabric unless the
  candidate data below actually says so.
"""


def _candidate_block(candidates: list[dict[str, Any]]) -> str:
    lines = []
    for row in candidates:
        similarity = row.get("similarity")
        similarity_note = (
            f", style_similarity={similarity:.3f}" if similarity is not None else ""
        )
        lines.append(
            f"- item_id={row['variation_id']} | {row['title']} by {row['brand']} "
            f"| size {row['size']} | {row['color_label']} ({row['color_family']}) "
            f"| {row['material_label']} ({row['material_family']}, {row['hand_feel']}) "
            f"| {row['fit_profile']} fit | ${float(row['unit_price']):.2f} "
            f"| stock={row['quantity']} "
            f"| triggered_rules={','.join(row.get('matched_rules') or []) or 'none'}"
            f"{similarity_note}"
        )
    return "\n".join(lines)


def build_prompt(
    current: dict[str, Any],
    vector: dict[str, int],
    candidates: list[dict[str, Any]],
    limit: int,
) -> str:
    complaints = unhappy_attributes(vector) or ["nothing in particular"]
    return "\n".join(
        [
            SYSTEM_PROMPT.format(limit=limit),
            "",
            f"GARMENT TRIED: {describe_current_item(current)}",
            f"  category: {current['apparel_type']} / {current['design_type']}",
            f"  fabric feel: {current['hand_feel']}",
            f"  fit profile: {current['fit_profile']}",
            "",
            f"SHOPPER RATINGS: {describe_feedback(vector)}",
            f"DIMENSIONS TO FIX: {', '.join(complaints)}",
            "",
            "CANDIDATES (all in stock, all passed the store's rule filter):",
            _candidate_block(candidates),
        ]
    )


def _fallback(
    current: dict[str, Any],
    vector: dict[str, int],
    candidates: list[dict[str, Any]],
    limit: int,
) -> list[dict[str, Any]]:
    chosen = []
    for row in candidates[:limit]:
        item = dict(row)
        item["reasons"] = heuristic_reasons(current, row, vector)
        chosen.append(item)
    return chosen


async def rank(
    gemini: GeminiClient,
    current: dict[str, Any],
    vector: dict[str, int],
    candidates: list[dict[str, Any]],
    limit: int,
) -> tuple[list[dict[str, Any]], bool]:
    """Return (ranked items with reasons, whether the LLM produced them)."""
    if not gemini.enabled or not candidates:
        return _fallback(current, vector, candidates, limit), False

    prompt = build_prompt(current, vector, candidates, limit)
    payload = await gemini.rank_candidates(prompt, RANKING_SCHEMA)
    if not payload:
        return _fallback(current, vector, candidates, limit), False

    by_id = {row["variation_id"]: row for row in candidates}
    ranked: list[dict[str, Any]] = []
    seen: set[str] = set()

    for entry in payload.get("recommendations", []):
        item_id = entry.get("item_id")
        source = by_id.get(item_id)
        if source is None or item_id in seen:
            continue
        reasons = [
            reason.strip()
            for reason in entry.get("reasons", [])
            if isinstance(reason, str) and reason.strip()
        ]
        item = dict(source)
        item["reasons"] = reasons or heuristic_reasons(current, source, vector)
        ranked.append(item)
        seen.add(item_id)
        if len(ranked) == limit:
            break

    if not ranked:
        logger.warning("Gemini returned no usable candidate ids; using rule order")
        return _fallback(current, vector, candidates, limit), False

    # Top up from the rule-ordered pool if the model returned too few.
    for row in candidates:
        if len(ranked) >= limit:
            break
        if row["variation_id"] in seen:
            continue
        item = dict(row)
        item["reasons"] = heuristic_reasons(current, row, vector)
        ranked.append(item)
        seen.add(row["variation_id"])

    return ranked, True
