"""Stage 1/2 logic that must hold without touching Supabase or Gemini."""

from __future__ import annotations

import math
from typing import Any

from app.catalog_text import build_desire_text, unhappy_attributes
from app.ranker import rank
from app.rules import heuristic_reasons, heuristic_order
from app.schemas import RecommendRequest
from app.vector_search import _apply_negative_override, blend_scores


def variation(**overrides: Any) -> dict[str, Any]:
    base = {
        "variation_id": "essential-zip-hoodie-black-m",
        "style_id": "essential-zip-hoodie",
        "sku_code": "SKU",
        "title": "Essential Full-Zip Hoodie",
        "brand": "Everyday",
        "apparel_type": "Hoodies",
        "design_type": "Zip Hoodies",
        "category_group": "outerwear",
        "fit_profile": "regular",
        "description": "A hoodie.",
        "size": "M",
        "size_order": 3,
        "unit_price": 55.0,
        "image_path": "items/black-zip-hoodie.png",
        "material_id": "cotton-fleece",
        "material_label": "Cotton fleece",
        "material_family": "natural",
        "hand_feel": "brushed and plush inside",
        "color_id": "black",
        "color_label": "Black",
        "color_family": "neutral",
        "quantity": 5,
        "matched_rules": [],
        "rule_score": 0,
    }
    base.update(overrides)
    return base


class StubGemini:
    """Stands in for GeminiClient without any network access."""

    def __init__(self, enabled: bool, payload: dict[str, Any] | None) -> None:
        self.enabled = enabled
        self._payload = payload
        self.prompts: list[str] = []

    async def rank_candidates(self, prompt: str, schema: dict[str, Any]):
        self.prompts.append(prompt)
        return self._payload


# --------------------------------------------------------------------------
# Neutral baseline policy
# --------------------------------------------------------------------------


def test_missing_dimensions_default_to_neutral_three():
    request = RecommendRequest(session_token="s", selected_item_id="x", fabric=1)
    assert request.survey_vector() == {"fabric": 1, "fit": 3, "colour": 3, "price": 3}


def test_full_vector_is_passed_through():
    request = RecommendRequest(
        session_token="s", selected_item_id="x", fabric=2, fit=5, colour=4, price=1
    )
    assert request.survey_vector() == {"fabric": 2, "fit": 5, "colour": 4, "price": 1}


# --------------------------------------------------------------------------
# Bipolar fit axis
# --------------------------------------------------------------------------


def test_fit_is_unhappy_at_both_ends():
    for fit in (1, 2, 4, 5):
        vector = {"fabric": 3, "fit": fit, "colour": 3, "price": 3}
        assert "fit" in unhappy_attributes(vector), f"fit={fit} should trigger"

    neutral = {"fabric": 3, "fit": 3, "colour": 3, "price": 3}
    assert unhappy_attributes(neutral) == []


def test_other_axes_only_trigger_downward():
    vector = {"fabric": 5, "fit": 3, "colour": 5, "price": 5}
    assert unhappy_attributes(vector) == []


def test_desire_text_asks_for_roomier_when_too_tight():
    current = variation()
    text = build_desire_text(current, {"fabric": 3, "fit": 5, "colour": 3, "price": 3})
    assert "too tight" in text and "roomier" in text


def test_desire_text_asks_for_closer_cut_when_too_loose():
    current = variation()
    text = build_desire_text(current, {"fabric": 3, "fit": 1, "colour": 3, "price": 3})
    assert "too loose" in text and "smaller size" in text


def test_desire_text_sets_price_ceiling_at_75_percent():
    current = variation(unit_price=120.0)
    text = build_desire_text(current, {"fabric": 3, "fit": 3, "colour": 3, "price": 1})
    assert "$90.00" in text


# --------------------------------------------------------------------------
# Dynamic search vector modification
# --------------------------------------------------------------------------


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def test_negative_override_pushes_away_from_rejected_item():
    desire = [1.0, 1.0, 0.0]
    current = [1.0, 0.0, 0.0]

    unchanged = _apply_negative_override(desire, current, complaint_count=0)
    penalised = _apply_negative_override(desire, current, complaint_count=3)

    # The more the shopper complained, the further the query should sit from the
    # garment they just rejected.
    assert cosine(penalised, current) < cosine(unchanged, current)


def test_negative_override_scales_with_complaint_count():
    desire = [1.0, 1.0, 0.0]
    current = [1.0, 0.0, 0.0]

    one = cosine(_apply_negative_override(desire, current, 1), current)
    three = cosine(_apply_negative_override(desire, current, 3), current)
    assert three < one


def test_negative_override_returns_unit_vector():
    result = _apply_negative_override([3.0, 4.0, 0.0], None, complaint_count=0)
    assert math.isclose(math.sqrt(sum(v * v for v in result)), 1.0, abs_tol=1e-6)


def test_negative_override_handles_zero_vector():
    assert _apply_negative_override([0.0, 0.0], None, 0) == [0.0, 0.0]


# --------------------------------------------------------------------------
# Score blending
# --------------------------------------------------------------------------


def test_blend_falls_back_to_rule_order_without_similarity():
    low = variation(variation_id="low", rule_score=20, unit_price=10.0)
    high = variation(variation_id="high", rule_score=80, unit_price=90.0)

    ordered = blend_scores([low, high], {})
    assert [row["variation_id"] for row in ordered] == ["high", "low"]


def test_similarity_can_reorder_candidates_with_equal_rules():
    a = variation(variation_id="a", rule_score=50, unit_price=50.0)
    b = variation(variation_id="b", rule_score=50, unit_price=50.0)

    ordered = blend_scores([a, b], {"a": 0.10, "b": 0.95})
    assert [row["variation_id"] for row in ordered] == ["b", "a"]


def test_rules_outweigh_a_marginal_similarity_edge():
    strong_rule = variation(variation_id="strong", rule_score=100, unit_price=50.0)
    strong_vector = variation(variation_id="similar", rule_score=10, unit_price=50.0)

    ordered = blend_scores([strong_rule, strong_vector], {"strong": 0.5, "similar": 1.0})
    assert ordered[0]["variation_id"] == "strong"


# --------------------------------------------------------------------------
# Explanations
# --------------------------------------------------------------------------


def test_size_up_reason_names_the_right_direction():
    current = variation(size="M", size_order=3)
    candidate = variation(
        variation_id="essential-zip-hoodie-black-l",
        size="L",
        size_order=4,
        matched_rules=["size_swap", "size_adjusted"],
    )
    reasons = heuristic_reasons(current, candidate, {"fabric": 3, "fit": 5, "colour": 3, "price": 3})
    assert any("one size up" in reason for reason in reasons)


def test_size_down_reason_names_the_right_direction():
    current = variation(size="M", size_order=3)
    candidate = variation(
        variation_id="essential-zip-hoodie-black-s",
        size="S",
        size_order=2,
        matched_rules=["size_swap", "size_adjusted"],
    )
    reasons = heuristic_reasons(current, candidate, {"fabric": 3, "fit": 1, "colour": 3, "price": 3})
    assert any("one size down" in reason for reason in reasons)


def test_budget_reason_quotes_a_real_saving():
    current = variation(unit_price=120.0)
    candidate = variation(variation_id="cheap", unit_price=60.0, matched_rules=["budget"])
    reasons = heuristic_reasons(current, candidate, {"fabric": 3, "fit": 3, "colour": 3, "price": 1})
    assert any("50% less" in reason for reason in reasons)


def test_reasons_are_never_empty():
    current = variation()
    candidate = variation(variation_id="other", matched_rules=[])
    assert heuristic_reasons(current, candidate, {"fabric": 3, "fit": 3, "colour": 3, "price": 3})


# --------------------------------------------------------------------------
# Stage 2 ranking
# --------------------------------------------------------------------------


async def test_rank_falls_back_when_llm_disabled():
    current = variation()
    candidates = [
        variation(variation_id="a", rule_score=80),
        variation(variation_id="b", rule_score=10),
    ]
    ranked, used_llm = await rank(
        StubGemini(enabled=False, payload=None),
        current,
        {"fabric": 3, "fit": 3, "colour": 3, "price": 3},
        heuristic_order(candidates),
        limit=2,
    )
    assert used_llm is False
    assert [row["variation_id"] for row in ranked] == ["a", "b"]
    assert all(row["reasons"] for row in ranked)


async def test_rank_uses_llm_ordering():
    current = variation()
    candidates = [variation(variation_id="a"), variation(variation_id="b")]
    stub = StubGemini(
        enabled=True,
        payload={
            "recommendations": [
                {"item_id": "b", "reasons": ["Softer cotton than the shell you tried"]},
                {"item_id": "a", "reasons": ["Cheaper alternative"]},
            ]
        },
    )
    ranked, used_llm = await rank(
        stub, current, {"fabric": 1, "fit": 3, "colour": 3, "price": 3}, candidates, limit=2
    )
    assert used_llm is True
    assert [row["variation_id"] for row in ranked] == ["b", "a"]
    assert ranked[0]["reasons"] == ["Softer cotton than the shell you tried"]


async def test_rank_discards_hallucinated_item_ids():
    current = variation()
    candidates = [variation(variation_id="real", rule_score=50)]
    stub = StubGemini(
        enabled=True,
        payload={
            "recommendations": [
                {"item_id": "totally-made-up-sku", "reasons": ["Nope"]},
                {"item_id": "real", "reasons": ["Genuine option"]},
            ]
        },
    )
    ranked, used_llm = await rank(
        stub, current, {"fabric": 3, "fit": 3, "colour": 3, "price": 3}, candidates, limit=3
    )
    assert [row["variation_id"] for row in ranked] == ["real"]
    assert used_llm is True


async def test_rank_tops_up_when_llm_returns_too_few():
    current = variation()
    candidates = [
        variation(variation_id="a", rule_score=90),
        variation(variation_id="b", rule_score=50),
        variation(variation_id="c", rule_score=10),
    ]
    stub = StubGemini(
        enabled=True, payload={"recommendations": [{"item_id": "c", "reasons": ["Pick me"]}]}
    )
    ranked, _ = await rank(
        stub, current, {"fabric": 3, "fit": 3, "colour": 3, "price": 3}, candidates, limit=3
    )
    assert [row["variation_id"] for row in ranked] == ["c", "a", "b"]


async def test_rank_falls_back_when_llm_returns_nothing_usable():
    current = variation()
    candidates = [variation(variation_id="a", rule_score=90)]
    stub = StubGemini(enabled=True, payload={"recommendations": []})
    ranked, used_llm = await rank(
        stub, current, {"fabric": 3, "fit": 3, "colour": 3, "price": 3}, candidates, limit=2
    )
    assert used_llm is False
    assert [row["variation_id"] for row in ranked] == ["a"]


async def test_prompt_lists_only_real_candidate_ids():
    current = variation()
    candidates = [variation(variation_id="only-this-one", rule_score=10)]
    stub = StubGemini(enabled=True, payload={"recommendations": []})
    await rank(stub, current, {"fabric": 1, "fit": 3, "colour": 3, "price": 3}, candidates, limit=1)

    prompt = stub.prompts[0]
    assert "item_id=only-this-one" in prompt
    assert "DIMENSIONS TO FIX: fabric" in prompt
