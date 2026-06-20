from __future__ import annotations

import json
import logging
from typing import Any

from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


def _redis_url() -> str:
    # docker-compose.yml provisions:
    #   redis://redis:6379/0 (celery broker)
    #   redis://redis:6379/1 (celery result)
    #   redis://redis:6379/2 (cache)
    return "redis://redis:6379/2"



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
    redis = await get_redis()
    full_key = _cache_key(key)
    try:
        await redis.delete(full_key)
    except Exception:
        logger.exception("cache invalidate failed for key=%s", full_key)

