from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core import security as security_module


class DummyUser:
    def __init__(self, email: str, tenant_id: str, role: str = "user"):
        self.email = email
        self.tenant_id = tenant_id
        self.role = role


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_logout_requires_auth(monkeypatch: pytest.MonkeyPatch, client: TestClient):
    # Ensure the auth dependency is actually enforced by returning 401 when no token is provided.
    resp = client.post("/auth/logout")
    assert resp.status_code in (401, 422)


def test_reviews_approve_requires_rbac(
    monkeypatch: pytest.MonkeyPatch,
    client: TestClient,
):
    # Mock get_current_user
    monkeypatch.setattr(security_module, "get_current_user", lambda: DummyUser("u1", "t1", role="user"))

    # Mock document lookup
    from app.models.document import Document

    class DummyDoc:
        tenant_id = "t1"

    monkeypatch.setattr(Document, "get", lambda _id: DummyDoc())

    # Attempt approve with role=user should fail with 403
    resp = client.post(
        "/reviews/approve",
        headers=_auth_headers("dummy"),
        json={"document_id": "doc1", "extraction": {}},
    )
    assert resp.status_code == 403

