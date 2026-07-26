"""Runtime configuration, read once from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def _split_csv(raw: str) -> list[str]:
    return [part.strip() for part in raw.split(",") if part.strip()]


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    gemini_api_key: str | None
    gemini_chat_model: str
    gemini_embed_model: str
    default_store_id: str
    cors_origins: list[str] = field(default_factory=list)
    # Stage 1 widens its filters until it has at least this many candidates.
    min_candidate_pool: int = 3
    request_timeout_seconds: float = 12.0

    @property
    def llm_enabled(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_chat_model=os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash"),
        gemini_embed_model=os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001"),
        default_store_id=os.getenv("DEFAULT_STORE_ID", "kw-flagship"),
        cors_origins=_split_csv(os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)),
        min_candidate_pool=int(os.getenv("MIN_CANDIDATE_POOL", "3")),
        request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "12")),
    )
