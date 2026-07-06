from __future__ import annotations

import json

import logging
from dataclasses import dataclass
from typing import Any, Callable, Mapping

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.cache import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TenantRateLimits:
    window_seconds: int
    upload: int
    trigger: int


def _parse_overrides() -> Mapping[str, Any]:
    raw = getattr(settings, "rate_limit_overrides_json", "")
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            return {}
        return parsed
    except Exception:
        return {}


def _limits_for_tenant(tenant_id: str) -> TenantRateLimits:
    overrides = _parse_overrides()
    tenant_override = overrides.get(tenant_id, {}) if isinstance(overrides, dict) else {}

    window_seconds = getattr(settings, "rate_limit_window_seconds", 60)
    default_upload = getattr(settings, "rate_limit_upload_default", 10)
    default_trigger = getattr(settings, "rate_limit_trigger_default", 10)

    upload = int(tenant_override.get("upload", default_upload))
    trigger = int(tenant_override.get("trigger", default_trigger))

    return TenantRateLimits(
        window_seconds=int(window_seconds),
        upload=upload,
        trigger=trigger,
    )


def _endpoint_bucket_name(endpoint_key: str) -> str:
    # Ensure only a small set of known bucket names are used.
    if endpoint_key == "upload":
        return "upload"
    if endpoint_key == "trigger":
        return "trigger"
    return "generic"


async def _get_window_counter(
    redis: Redis,
    key: str,
    window_seconds: int,
) -> tuple[int, int]:
    """Return (count, ttl_seconds_remaining)."""

    # Use atomic increment + TTL initialization via a Lua script.
    # If the key does not exist, set TTL to the window.
    #
    # Redis does not expose an atomic INCR+EXPIRE without scripting.
    lua = """
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return current
    """

    count: int = int(await redis.eval(lua, 1, key, window_seconds))

    ttl = await redis.ttl(key)
    ttl_seconds = int(ttl) if ttl is not None else window_seconds

    # ttl can be -1 if no expiry; treat as full window.
    if ttl_seconds < 0:
        ttl_seconds = window_seconds

    return count, ttl_seconds





async def enforce_tenant_rate_limit(
    *,
    tenant_id: str,
    endpoint_key: str,
) -> None:
    limits = _limits_for_tenant(tenant_id)

    window_seconds = limits.window_seconds
    request_limit = limits.upload if endpoint_key == "upload" else limits.trigger

    # Fail-open if misconfigured to non-positive values.
    if request_limit <= 0 or window_seconds <= 0:
        return

    redis: Redis | None = None
    try:
        redis = await get_redis()
    except Exception:
        logger.exception("rate limiter: failed to get redis client; failing open")
        return

    bucket = _endpoint_bucket_name(endpoint_key)
    redis_key = f"idc:rl:{tenant_id}:{bucket}"

    try:
        count, ttl_seconds = await _get_window_counter(
            redis=redis,
            key=redis_key,
            window_seconds=window_seconds,
        )
    except Exception as exc:
        # Fail-open and avoid noisy stack traces for expected "redis not running" cases.
        logger.warning("rate limiter: redis error; failing open: %s", exc)
        return

    if count > request_limit:
        retry_after = max(1, ttl_seconds)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="rate limit exceeded",
            headers={"Retry-After": str(retry_after)},
        )


def tenant_rate_limit_dependency(*, endpoint_key: str, current_user_dep: Callable[..., Any]):
    """Create a FastAPI dependency that enforces rate limit using current_user_dep."""

    async def _dep(
        request: Request,
        current_user: Any = Depends(current_user_dep),
    ) -> None:
        await enforce_tenant_rate_limit(tenant_id=current_user.tenant_id, endpoint_key=endpoint_key)

    return _dep


