"""Thin async PostgREST client.

Only three calls are ever made (two RPCs and an embeddings upsert), so a small
httpx wrapper is preferable to pulling in the full Supabase SDK.
"""

from __future__ import annotations

from typing import Any

import httpx

from .config import Settings, get_settings


class SupabaseError(RuntimeError):
    pass


class SupabaseClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client: httpx.AsyncClient | None = None

    @property
    def settings(self) -> Settings:
        return self._settings

    def _ensure_configured(self) -> None:
        if not self._settings.supabase_configured:
            raise SupabaseError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
            )

    async def start(self) -> None:
        self._ensure_configured()
        if self._client is None:
            key = self._settings.supabase_service_role_key
            self._client = httpx.AsyncClient(
                base_url=f"{self._settings.supabase_url}/rest/v1",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                timeout=self._settings.request_timeout_seconds,
            )

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            await self.start()
        assert self._client is not None
        return self._client

    async def rpc(self, function: str, payload: dict[str, Any]) -> Any:
        client = await self._http()
        response = await client.post(f"/rpc/{function}", json=payload)
        if response.status_code >= 400:
            raise SupabaseError(
                f"RPC {function} failed ({response.status_code}): {response.text}"
            )
        return response.json()

    async def upsert(
        self, table: str, rows: list[dict[str, Any]], on_conflict: str
    ) -> None:
        client = await self._http()
        response = await client.post(
            f"/{table}",
            params={"on_conflict": on_conflict},
            json=rows,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        if response.status_code >= 400:
            raise SupabaseError(
                f"Upsert into {table} failed ({response.status_code}): {response.text}"
            )

    async def select(
        self, table: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        client = await self._http()
        response = await client.get(f"/{table}", params=params or {})
        if response.status_code >= 400:
            raise SupabaseError(
                f"Select from {table} failed ({response.status_code}): {response.text}"
            )
        return response.json()

    async def count(self, table: str) -> int:
        client = await self._http()
        response = await client.get(
            f"/{table}",
            params={"select": "*"},
            headers={"Prefer": "count=exact", "Range": "0-0"},
        )
        if response.status_code >= 400:
            raise SupabaseError(
                f"Count on {table} failed ({response.status_code}): {response.text}"
            )
        content_range = response.headers.get("content-range", "")
        if "/" in content_range:
            total = content_range.split("/")[-1]
            if total.isdigit():
                return int(total)
        return len(response.json())
