"""Digital Fitting Room Companion — Alternative Item Recommender API.

Two-stage pipeline per the specification:
  Stage 1  deterministic SQL heuristics over live store inventory (rules.py)
  Stage 2  pgvector similarity + Gemini ranking (vector_search.py, ranker.py)

Both stages degrade rather than fail: if Gemini is unreachable the deterministic
rule ordering is served instead, so the tablet always shows something.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .gemini_client import GeminiClient
from .ranker import rank
from .rate_limit import client_ip, recommend_limiter
from .rules import (
    NoCandidatesError,
    UnknownItemError,
    fetch_candidates,
    resolve_current_item,
)
from .schemas import (
    HealthResponse,
    ItemSummary,
    RecommendRequest,
    RecommendResponse,
    RecommendedItem,
)
from .supabase_client import SupabaseClient, SupabaseError
from .vector_search import blend_scores, similarity_scores

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

supabase = SupabaseClient()
gemini = GeminiClient()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    if settings.supabase_configured:
        await supabase.start()
    else:
        logger.warning("Supabase is not configured; /recommend will return 503.")
    if not settings.llm_enabled:
        logger.warning("GEMINI_API_KEY is unset; serving deterministic rankings.")
    yield
    await supabase.aclose()


app = FastAPI(
    title="Fitting Room Alternative Item Recommender",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _to_summary(row: dict[str, Any]) -> ItemSummary:
    return ItemSummary(
        item_id=row["variation_id"],
        style_id=row["style_id"],
        title=row["title"],
        brand=row["brand"],
        size=row["size"],
        color_label=row["color_label"],
        material_label=row["material_label"],
        apparel_type=row["apparel_type"],
        price=float(row["unit_price"]),
        image_path=row["image_path"],
    )


def _to_recommendation(row: dict[str, Any]) -> RecommendedItem:
    return RecommendedItem(
        **_to_summary(row).model_dump(),
        reasons=row.get("reasons", []),
        matched_rules=row.get("matched_rules") or [],
        in_stock=int(row.get("quantity", 0)),
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    embedded: int | None = None
    if settings.supabase_configured:
        try:
            embedded = await supabase.count("item_embeddings")
        except SupabaseError:
            embedded = None
    return HealthResponse(
        status="ok",
        supabase_configured=settings.supabase_configured,
        llm_enabled=settings.llm_enabled,
        embedded_items=embedded,
    )


@app.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest, http_request: Request) -> RecommendResponse:
    recommend_limiter.check(client_ip(http_request))

    settings = get_settings()
    if not settings.supabase_configured:
        raise HTTPException(status_code=503, detail="Catalog database is not configured.")

    started = time.perf_counter()
    vector = request.survey_vector()
    store_id = request.store_id or settings.default_store_id

    try:
        current = await resolve_current_item(supabase, request.selected_item_id)
        candidates, relax_level = await fetch_candidates(
            supabase, settings, store_id, current, vector
        )
    except UnknownItemError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except NoCandidatesError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SupabaseError as exc:
        logger.exception("Supabase call failed")
        raise HTTPException(status_code=502, detail="Catalog lookup failed.") from exc

    similarity = await similarity_scores(supabase, gemini, current, vector, candidates)
    ordered = blend_scores(candidates, similarity)
    ranked, used_llm = await rank(gemini, current, vector, ordered, request.limit)

    if used_llm:
        strategy = "llm"
    elif similarity:
        strategy = "vector"
    else:
        strategy = "heuristic"

    return RecommendResponse(
        session_token=request.session_token,
        current_item=_to_summary(current),
        recommendations=[_to_recommendation(row) for row in ranked],
        strategy=strategy,
        relax_level=relax_level,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )
