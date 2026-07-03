from __future__ import annotations

import types

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core import rate_limiter


class DummyRedis:
    def __init__(self):
        self.store: dict[str, int] = {}
        self._ttl: dict[str, int] = {}

    async def eval(self, lua: str, numkeys: int, key: str, window_seconds: int):
        # Simulate fixed-window behavior.
        if key not in self.store:
            self.store[key] = 0
        self.store[key] += 1
        self._ttl[key] = int(window_seconds)
        return self.store[key]

    async def ttl(self, key: str):
        return self._ttl.get(key, -1)


@pytest.fixture
def dummy_redis(monkeypatch: pytest.MonkeyPatch):
    redis = DummyRedis()
    async def _get_redis():
        return redis

    monkeypatch.setattr(rate_limiter, "get_redis", _get_redis)
    return redis


@pytest.mark.asyncio
async def test_upload_throttles_per_tenant(dummy_redis, monkeypatch: pytest.MonkeyPatch):
    # Set tight limits so the test is deterministic.
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_window_seconds", 60)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_upload_default", 2)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_trigger_default", 2)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_overrides_json", "")

    tenant_a = "tenantA"
    tenant_b = "tenantB"

    # tenantA: allow 2 then block on 3rd
    await rate_limiter.enforce_tenant_rate_limit(
        tenant_id=tenant_a,
        endpoint_key="upload",
    )
    await rate_limiter.enforce_tenant_rate_limit(
        tenant_id=tenant_a,
        endpoint_key="upload",
    )

    with pytest.raises(HTTPException) as exc:
        await rate_limiter.enforce_tenant_rate_limit(
            tenant_id=tenant_a,
            endpoint_key="upload",
        )

    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers
    assert int(exc.value.headers["Retry-After"]) >= 1

    # tenantB should not be affected.
    await rate_limiter.enforce_tenant_rate_limit(
        tenant_id=tenant_b,
        endpoint_key="upload",
    )


@pytest.mark.asyncio
async def test_tenant_override_upload_and_trigger(dummy_redis, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_window_seconds", 60)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_upload_default", 10)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_trigger_default", 10)

    # tenantA: upload=1 trigger=1
    monkeypatch.setattr(
        rate_limiter.settings,
        "rate_limit_overrides_json",
        '{"tenantA": {"upload": 1, "trigger": 1}}',
    )

    # Upload limit = 1
    await rate_limiter.enforce_tenant_rate_limit(tenant_id="tenantA", endpoint_key="upload")
    with pytest.raises(HTTPException) as exc_upload:
        await rate_limiter.enforce_tenant_rate_limit(tenant_id="tenantA", endpoint_key="upload")

    assert exc_upload.value.status_code == 429
    assert "Retry-After" in exc_upload.value.headers

    # Trigger limit = 1
    await rate_limiter.enforce_tenant_rate_limit(tenant_id="tenantA", endpoint_key="trigger")
    with pytest.raises(HTTPException) as exc_trigger:
        await rate_limiter.enforce_tenant_rate_limit(tenant_id="tenantA", endpoint_key="trigger")

    assert exc_trigger.value.status_code == 429
    assert "Retry-After" in exc_trigger.value.headers

