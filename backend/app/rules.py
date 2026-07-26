"""Stage 1: deterministic heuristic filter.

The SQL in supabase/recommender-rpc.sql owns the hard boundaries (stock, size
+/- 1, material NOT IN, alternate colourway, 0.75x price ceiling). This module
drives that RPC, widens the filters when the pool starves, and turns the rule
annotations into shopper-facing copy.
"""

from __future__ import annotations

from typing import Any

from .config import Settings
from .supabase_client import SupabaseClient, SupabaseError

# 0 = every triggered filter, 1 = drop fabric/colour, 2 = availability only.
RELAX_LADDER = (0, 1, 2)


class NoCandidatesError(RuntimeError):
    pass


class UnknownItemError(RuntimeError):
    pass


async def resolve_current_item(
    client: SupabaseClient, selected_item_id: str
) -> dict[str, Any]:
    """Map a survey item id (or raw variation id) onto a catalog variation."""
    rows = await client.rpc(
        "get_try_on_variation", {"p_survey_item_id": selected_item_id}
    )
    if rows:
        return rows[0]

    # Fall back to treating the id as a variation id, which lets the API be
    # driven directly from the catalog during testing.
    rows = await client.select(
        "catalog_variations",
        {"variation_id": f"eq.{selected_item_id}", "limit": 1},
    )
    if rows:
        return rows[0]

    raise UnknownItemError(f"No catalog entry for '{selected_item_id}'.")


async def fetch_candidates(
    client: SupabaseClient,
    settings: Settings,
    store_id: str,
    current: dict[str, Any],
    vector: dict[str, int],
) -> tuple[list[dict[str, Any]], int]:
    """Run Stage 1, relaxing filters only as far as needed to fill the pool."""
    last: list[dict[str, Any]] = []
    for relax_level in RELAX_LADDER:
        rows = await client.rpc(
            "stage1_candidates",
            {
                "p_store_id": store_id,
                "p_current_variation_id": current["variation_id"],
                "p_fabric": vector["fabric"],
                "p_fit": vector["fit"],
                "p_colour": vector["colour"],
                "p_price": vector["price"],
                "p_relax_level": relax_level,
                "p_limit": 40,
            },
        )
        last = rows
        if len(rows) >= settings.min_candidate_pool:
            return rows, relax_level

    if not last:
        raise NoCandidatesError("No in-stock alternatives at this store.")
    return last, RELAX_LADDER[-1]


def _price_delta_phrase(current_price: float, candidate_price: float) -> str | None:
    if candidate_price >= current_price:
        return None
    saved = current_price - candidate_price
    pct = round(saved / current_price * 100)
    return f"${candidate_price:.2f} — {pct}% less than the ${current_price:.2f} you tried"


def heuristic_reasons(
    current: dict[str, Any], candidate: dict[str, Any], vector: dict[str, int]
) -> list[str]:
    """Deterministic explanation copy, used whenever the LLM is unavailable."""
    rules = set(candidate.get("matched_rules") or [])
    reasons: list[str] = []

    if "size_swap" in rules:
        direction = "up" if candidate["size_order"] > current["size_order"] else "down"
        reasons.append(
            f"The same {current['design_type'].lower().rstrip('s')} one size {direction} "
            f"— size {candidate['size']} instead of {current['size']}"
        )
    elif "size_adjusted" in rules:
        reasons.append(f"Pulled in size {candidate['size']} to correct the fit")

    if "alt_colourway" in rules:
        reasons.append(
            f"Identical style in {candidate['color_label'].lower()} "
            f"instead of {current['color_label'].lower()}"
        )
    elif "colour_change" in rules:
        reasons.append(
            f"{candidate['color_label']} moves away from the "
            f"{current['color_family']} you rated down"
        )

    if "fabric_pivot" in rules:
        reasons.append(
            f"{candidate['material_label']} ({candidate['hand_feel']}) instead of "
            f"{current['material_label']}"
        )
    elif "fabric_change" in rules:
        reasons.append(f"A different fabric: {candidate['material_label']}")

    if "budget" in rules:
        phrase = _price_delta_phrase(
            float(current["unit_price"]), float(candidate["unit_price"])
        )
        if phrase:
            reasons.append(phrase)

    if not reasons:
        reasons.append(
            f"A close match to the {current['title']} — "
            f"{candidate['material_label'].lower()}, {candidate['fit_profile']} fit"
        )

    # Stock and size are rendered separately on the card, so they stay out of
    # the reason list.
    return reasons


def heuristic_order(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rank by Stage 1 rule score, then by price, mirroring the SQL ordering."""
    return sorted(
        candidates,
        key=lambda row: (-int(row.get("rule_score", 0)), float(row["unit_price"])),
    )


__all__ = [
    "NoCandidatesError",
    "UnknownItemError",
    "SupabaseError",
    "fetch_candidates",
    "heuristic_order",
    "heuristic_reasons",
    "resolve_current_item",
]
