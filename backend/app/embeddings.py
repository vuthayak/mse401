"""One-off backfill of catalog embeddings into item_embeddings.

Usage (from backend/, with .env populated):

    python -m app.embeddings          # embed variations missing a vector
    python -m app.embeddings --all    # re-embed the whole catalog

Safe to re-run; rows are upserted by variation_id.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from .catalog_text import variation_embedding_text
from .config import get_settings
from .gemini_client import GeminiClient
from .supabase_client import SupabaseClient, SupabaseError

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("embeddings")

UPSERT_CHUNK = 25


async def backfill(rebuild: bool) -> int:
    settings = get_settings()
    if not settings.supabase_configured:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return 1
    if not settings.gemini_api_key:
        logger.error("GEMINI_API_KEY must be set to generate embeddings.")
        return 1

    supabase = SupabaseClient(settings)
    gemini = GeminiClient(settings)
    await supabase.start()

    try:
        variations = await supabase.select(
            "catalog_variations", {"select": "*", "order": "variation_id"}
        )
        if not variations:
            logger.error("Catalog is empty — run recommender-seed.sql first.")
            return 1

        targets = variations
        if not rebuild:
            existing = await supabase.select(
                "item_embeddings", {"select": "variation_id"}
            )
            done = {row["variation_id"] for row in existing}
            targets = [row for row in variations if row["variation_id"] not in done]

        if not targets:
            logger.info("All %d variations already embedded.", len(variations))
            return 0

        logger.info("Embedding %d of %d variations…", len(targets), len(variations))
        texts = [variation_embedding_text(row) for row in targets]
        vectors = await gemini.embed_documents(texts)

        if not vectors or len(vectors) != len(targets):
            logger.error("Gemini returned %s vectors for %d inputs.",
                         len(vectors) if vectors else 0, len(targets))
            return 1

        rows = [
            {
                "variation_id": target["variation_id"],
                "embedding": vector,
                "content": text,
            }
            for target, text, vector in zip(targets, texts, vectors)
        ]

        for start in range(0, len(rows), UPSERT_CHUNK):
            chunk = rows[start : start + UPSERT_CHUNK]
            await supabase.upsert("item_embeddings", chunk, on_conflict="variation_id")
            logger.info("  upserted %d/%d", min(start + UPSERT_CHUNK, len(rows)), len(rows))

        logger.info("Done. %d embeddings written (dim=%d).", len(rows), len(vectors[0]))
        return 0
    except SupabaseError as exc:
        logger.error("Supabase error: %s", exc)
        return 1
    finally:
        await supabase.aclose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill catalog embeddings.")
    parser.add_argument(
        "--all",
        action="store_true",
        dest="rebuild",
        help="re-embed every variation instead of only the missing ones",
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(backfill(args.rebuild)))


if __name__ == "__main__":
    main()
