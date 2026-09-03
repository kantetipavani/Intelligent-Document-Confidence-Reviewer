from __future__ import annotations

import math
import os
from collections import defaultdict
from typing import DefaultDict, List, Optional

from locust import HttpUser, task, between, events

class INDCRUser(HttpUser):
    wait_time = between(1, 3)

    tenant_id: Optional[str] = None
    document_id: Optional[str] = None

    def on_start(self):
        """Login once per user and discover tenant from /auth/me."""
        response = self.client.post(
            "/auth/login",
            json={
                "email": "string1@gmail.com",
                "password": "123456",
            },
        )

        if response.status_code == 200:
            self.token = response.json().get("access_token")
        else:
            self.token = None

        self.headers = (
            {"Authorization": f"Bearer {self.token}"}
            if self.token
            else {}
        )

        # Discover tenant_id (needed for /documents/{tenant_id}/{document_id})
        if self.headers:
            me = self.client.get("/auth/me", headers=self.headers)
            if me.status_code == 200:
                self.tenant_id = me.json().get("tenant_id")

    def _ensure_uploaded_document(self) -> None:
        if self.document_id and self.tenant_id:
            return

        # If DB is running, we can upload; tenant scoping is handled by JWT.
        files = {"file": ("test.txt", b"hello world", "text/plain")}
        # API requires filename field too.
        data = {"filename": "test.txt"}

        resp = self.client.post(
            "/documents/upload",
            headers=self.headers,
            files=files,
            data=data,
        )

        if resp.status_code != 200:
            # Let failure count as error in Locust.
            return

        self.document_id = resp.json().get("document_id")
        if not self.tenant_id:
            me = self.client.get("/auth/me", headers=self.headers)
            if me.status_code == 200:
                self.tenant_id = me.json().get("tenant_id")

    # 1. login (weight 1)
    @task(1)
    def login(self):
        self.client.post(
            "/auth/login",
            json={
                "email": "string1@gmail.com",
                "password": "123456",
            },
        )

    # 2. upload_document (weight 2)
    @task(2)
    def upload_document(self):
        self._ensure_uploaded_document()

    # 3. get_document (weight 4)
    @task(4)
    def get_document(self):
        self._ensure_uploaded_document()
        if not (self.tenant_id and self.document_id):
            return
        self.client.get(
            f"/documents/{self.tenant_id}/{self.document_id}",
            headers=self.headers,
        )

    # 4. get_activity (weight 2)
    @task(2)
    def get_activity(self):
        self.client.get("/activity/me", headers=self.headers)



# -----------------------------
# HARD THRESHOLD (Redis test only)
# -----------------------------
# Requirement: with Redis, p95 latency on GET /documents must be under 400ms.
# We compute p95 from the per-request response_time samples we observe.

_LATENCY_SAMPLES_MS: DefaultDict[str, List[float]] = defaultdict(list)


def _p95_ms(samples_ms: List[float]) -> float:
    if not samples_ms:
        return float("nan")
    s = sorted(samples_ms)
    # Locust/most tools use nearest-rank/quantile conventions; we use:
    # p95 = value at ceil(0.95 * N) - 1 index
    n = len(s)
    idx = max(0, min(n - 1, int(math.ceil(0.95 * n)) - 1))
    return s[idx]


@events.request.add_listener
def collect_latency(
    request_type,
    name,
    response_time,
    response_length,
    response,
    context,
    exception,
    start_time,
    url,
    **kwargs,
):
    if os.getenv("TEST_MODE") != "with_redis":
        return

    # Locust may normalize the request `name`.
    # We match on both `name` and `url` to be robust.
    is_get_documents = (name == "GET /documents") or (url and url.endswith("/documents"))

    if is_get_documents and exception is None:
        _LATENCY_SAMPLES_MS["GET /documents"].append(float(response_time))

@events.test_stop.add_listener
def enforce_p95_threshold(environment, **kwargs):
    if os.getenv("TEST_MODE") != "with_redis":
        return

    samples = _LATENCY_SAMPLES_MS.get("GET /documents", [])
    p95 = _p95_ms(samples)

    threshold_ms = 400.0
    count = len(samples)

    print(f"[p95-threshold] GET /documents samples={count} p95={p95:.2f}ms threshold={threshold_ms:.2f}ms")

    # Hard threshold: fail run if breached.
    if not (p95 < threshold_ms):
        raise SystemExit(1)

