from __future__ import annotations

import json
import logging
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


def _redis_url() -> str:
    """Return Redis URL for this service.

    Supports overriding via environment variable so the same code works for:
    - local dev (Redis on host)
    - docker-compose (Redis reachable via hostname "redis")

    Expected override examples:
      REDIS_URL=redis://redis:6379/2
      REDIS_URL=redis://localhost:6379/2
    """

    # Allow deployments to override Redis endpoint/DB.
    # Falls back to existing local-dev default.
    # Also accept common env var name REDIS_URL.
    # Prefer env var REDIS_URL if present; pydantic settings can also override via settings.redis_url.
    import os

    return (
        os.environ.get("REDIS_URL")
        or getattr(settings, "redis_url", "")
        or "redis://localhost:6379/2"
    )






_redis_client: Redis | None = None


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(
            _redis_url(),
            decode_responses=True,  # store JSON as string
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    return _redis_client



def _cache_key(key: str) -> str:
    # Single namespace so we can invalidate deterministically.
    return f"idc:{key}"


async def get_cached(key: str) -> Any | None:
    redis = await get_redis()
    full_key = _cache_key(key)

    try:
        raw = await redis.get(full_key)
    except Exception:
        logger.exception("cache get failed for key=%s", full_key)
        return None

    if raw is None:
        return None

    try:
        return json.loads(raw)
    except Exception:
        # If data wasn't JSON, return raw.
        return raw


async def set_cached(key: str, value: Any, ttl: int) -> None:
    redis = await get_redis()
    full_key = _cache_key(key)

    try:
        payload = json.dumps(value, separators=(",", ":"), default=str)
        await redis.set(full_key, payload, ex=ttl)
    except Exception:
        logger.exception("cache set failed for key=%s", full_key)


async def invalidate(key: str) -> None:
    """Invalidate a cache key.

    Must never break primary API requests.
    If Redis is down/unreachable, we just log and return.
    """

    try:
        redis = await get_redis()
        full_key = _cache_key(key)
        await redis.delete(full_key)
    except Exception:
        # Never propagate Redis errors to callers.
        logger.exception("cache invalidate failed for key=%s", _cache_key(key))


