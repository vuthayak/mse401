"""Thin async wrapper around google-genai for embeddings and ranking.

Every method degrades to ``None`` rather than raising, so a missing key, a rate
limit, or a transient Gemini outage downgrades the pipeline to its deterministic
path instead of failing the shopper's request.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from .config import Settings, get_settings

logger = logging.getLogger(__name__)

# Gemini's free tier caps batch embedding requests, so documents go up in
# chunks during the one-off backfill.
EMBED_BATCH_SIZE = 32


class GeminiClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: genai.Client | None = None
        if self._settings.gemini_api_key:
            self._client = genai.Client(api_key=self._settings.gemini_api_key)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def embed_documents(self, texts: list[str]) -> list[list[float]] | None:
        return await self._embed(texts, task_type="RETRIEVAL_DOCUMENT")

    async def embed_query(self, text: str) -> list[float] | None:
        vectors = await self._embed([text], task_type="RETRIEVAL_QUERY")
        if not vectors:
            return None
        return vectors[0]

    async def _embed(
        self, texts: list[str], task_type: str
    ) -> list[list[float]] | None:
        if self._client is None or not texts:
            return None

        vectors: list[list[float]] = []
        try:
            for start in range(0, len(texts), EMBED_BATCH_SIZE):
                batch = texts[start : start + EMBED_BATCH_SIZE]
                response = await self._client.aio.models.embed_content(
                    model=self._settings.gemini_embed_model,
                    contents=batch,
                    config=types.EmbedContentConfig(task_type=task_type),
                )
                vectors.extend(list(item.values) for item in response.embeddings)
        except Exception:
            logger.exception("Gemini embedding request failed")
            return None

        return vectors

    async def rank_candidates(
        self, prompt: str, response_schema: dict[str, Any]
    ) -> dict[str, Any] | None:
        if self._client is None:
            return None

        try:
            response = await self._client.aio.models.generate_content(
                model=self._settings.gemini_chat_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    temperature=0.2,
                    max_output_tokens=1024,
                ),
            )
        except Exception:
            logger.exception("Gemini ranking request failed")
            return None

        text = (response.text or "").strip()
        if not text:
            return None

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Gemini returned non-JSON ranking payload")
            return None

        return parsed if isinstance(parsed, dict) else None
