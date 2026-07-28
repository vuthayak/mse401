"""Simple in-memory sliding-window rate limiter for /recommend.

CORS alone is not authentication — curl ignores it — so this caps Gemini
cost abuse from a public SPA. Limits are per client IP (or X-Forwarded-For
when behind Render's proxy).
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: float) -> None:
        self._max_requests = max_requests
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]
            cutoff = now - self._window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= self._max_requests:
                raise HTTPException(
                    status_code=429,
                    detail="Too many recommendation requests. Try again shortly.",
                )
            bucket.append(now)


# 30 requests / minute / IP — enough for a kiosk demo, tight enough to blunt abuse.
recommend_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60.0)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
