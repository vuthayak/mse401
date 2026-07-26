"""Request/response contracts for the recommender API."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

Likert = Annotated[int, Field(ge=1, le=5)]

# Per the spec's neutral baseline policy, an unrated dimension is treated as
# "satisfactory" rather than rejected.
NEUTRAL_RATING = 3


class RecommendRequest(BaseModel):
    session_token: str = Field(min_length=1, max_length=128)
    # A survey item id (e.g. "nike-windbreaker") or a catalog variation id.
    selected_item_id: str = Field(min_length=1, max_length=128)
    fabric: Likert | None = None
    fit: Likert | None = None
    colour: Likert | None = None
    price: Likert | None = None
    store_id: str | None = None
    limit: Annotated[int, Field(ge=1, le=6)] = 3

    def survey_vector(self) -> dict[str, int]:
        return {
            "fabric": self.fabric if self.fabric is not None else NEUTRAL_RATING,
            "fit": self.fit if self.fit is not None else NEUTRAL_RATING,
            "colour": self.colour if self.colour is not None else NEUTRAL_RATING,
            "price": self.price if self.price is not None else NEUTRAL_RATING,
        }


class ItemSummary(BaseModel):
    item_id: str
    style_id: str
    title: str
    brand: str
    size: str
    color_label: str
    material_label: str
    apparel_type: str
    price: float
    image_path: str


class RecommendedItem(ItemSummary):
    reasons: list[str]
    matched_rules: list[str]
    in_stock: int


class RecommendResponse(BaseModel):
    session_token: str
    current_item: ItemSummary
    recommendations: list[RecommendedItem]
    # How the final ordering was produced.
    strategy: Literal["llm", "vector", "heuristic"]
    # 0 = every triggered filter applied; higher means Stage 1 had to widen.
    relax_level: int
    latency_ms: int


class HealthResponse(BaseModel):
    status: Literal["ok"]
    supabase_configured: bool
    llm_enabled: bool
    embedded_items: int | None = None
