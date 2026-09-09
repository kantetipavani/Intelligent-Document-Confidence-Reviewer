from __future__ import annotations

import asyncio
import json
import os
import types
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core import security as security_module
from app.core.config import settings
from app.core.security import create_access_token
from app.models.document import Document
from app.websocket.connection_manager import ConnectionManager, connection_manager


@pytest.fixture(autouse=True)
def disable_kafka_and_bg_workers(monkeypatch: pytest.MonkeyPatch):
    """Disable background tasks and Kafka during tests."""
    monkeypatch.setenv("KAFKA_ENABLED", "false")

    async def _noop_worker_loop(**kwargs):
        return

    monkeypatch.setattr(
        "app.workers.extraction_worker.extraction_worker_loop",
        _noop_worker_loop,
    )


def test_dashboard_websocket_tenant_isolation(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Verify that WebSocket events broadcast to Tenant A are never received
    by Tenant B on the /ws/dashboard channel.
    """
    from app.main import app

    token_alpha = create_access_token(
        subject="user_alpha@example.com",
        tenant_id="tenant_alpha",
        role="user",
    )
    token_beta = create_access_token(
        subject="user_beta@example.com",
        tenant_id="tenant_beta",
        role="user",
    )

    client = TestClient(app)

    with client.websocket_connect(f"/ws/dashboard?token={token_alpha}") as ws_alpha:
        # Client Alpha receives connection confirmation
        alpha_welcome = ws_alpha.receive_json()
        assert alpha_welcome["type"] == "connected"
        assert alpha_welcome["tenant_id"] == "tenant_alpha"

        with client.websocket_connect(f"/ws/dashboard?token={token_beta}") as ws_beta:
            # Client Beta receives connection confirmation
            beta_welcome = ws_beta.receive_json()
            assert beta_welcome["type"] == "connected"
            assert beta_welcome["tenant_id"] == "tenant_beta"

            # 1. Broadcast an event specifically to tenant_alpha
            alpha_event = {
                "event": "EXTRACTION_COMPLETE",
                "tenant_id": "tenant_alpha",
                "document_id": "doc-alpha-001",
                "invoice_number": "INV-ALPHA-100",
            }
            asyncio.run(connection_manager.broadcast_to_tenant("tenant_alpha", alpha_event))

            # Alpha MUST receive the event
            received_alpha = ws_alpha.receive_json()
            assert received_alpha["document_id"] == "doc-alpha-001"
            assert received_alpha["invoice_number"] == "INV-ALPHA-100"

            # 2. Broadcast an event specifically to tenant_beta
            beta_event = {
                "event": "EXTRACTION_COMPLETE",
                "tenant_id": "tenant_beta",
                "document_id": "doc-beta-999",
                "invoice_number": "INV-BETA-999",
            }
            asyncio.run(connection_manager.broadcast_to_tenant("tenant_beta", beta_event))

            # Beta MUST receive Beta's event
            received_beta = ws_beta.receive_json()
            assert received_beta["document_id"] == "doc-beta-999"
            assert received_beta["invoice_number"] == "INV-BETA-999"

            # Verify Alpha never received Beta's event by sending another Alpha event
            alpha_check_event = {"event": "PING_ALPHA", "seq": 2}
            asyncio.run(connection_manager.broadcast_to_tenant("tenant_alpha", alpha_check_event))

            next_alpha = ws_alpha.receive_json()
            assert next_alpha["event"] == "PING_ALPHA"
            # Alpha received its ping directly without any Beta event in between!


def test_document_websocket_cross_tenant_access_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Verify that a client belonging to Tenant Beta cannot connect to
    /ws/documents/{doc_id} for a document belonging to Tenant Alpha.
    """
    from app.main import app

    token_alpha = create_access_token(
        subject="user_alpha@example.com",
        tenant_id="tenant_alpha",
        role="user",
    )
    token_beta = create_access_token(
        subject="user_beta@example.com",
        tenant_id="tenant_beta",
        role="user",
    )

    doc_id = "doc-alpha-secret-001"

    # Mock Document.get to return a document belonging to tenant_alpha
    fake_doc = types.SimpleNamespace(
        id=doc_id,
        tenant_id="tenant_alpha",
        filename="confidential_invoice.pdf",
        content_type="application/pdf",
        source_text=None,
    )

    async def fake_get(id_val):
        if str(id_val) == doc_id:
            return fake_doc
        return None

    monkeypatch.setattr(Document, "get", fake_get)

    client = TestClient(app)

    # 1. Tenant Beta attempts to subscribe to Tenant Alpha's document
    # Should be rejected with close code 4003 (Forbidden)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/ws/documents/{doc_id}?token={token_beta}") as ws:
            pass

    assert exc_info.value.code == 4003

    # 2. Tenant Alpha connects to its own document -> Success
    with client.websocket_connect(f"/ws/documents/{doc_id}?token={token_alpha}") as ws_alpha:
        msg = ws_alpha.receive_json()
        assert msg["type"] == "document_status"
        assert msg["document_id"] == doc_id


@pytest.mark.asyncio
async def test_connection_manager_defense_in_depth_tenant_isolation() -> None:
    """
    Verify that ConnectionManager.broadcast_to_document filters out any
    connection whose tenant does not match the target document's tenant.
    """
    mgr = ConnectionManager()

    # Mock WebSockets
    ws_alpha = AsyncMock()
    ws_beta = AsyncMock()

    # Register both to the same document_id under different tenant tags
    await mgr.connect(document_id="doc-123", websocket=ws_alpha, tenant_id="tenant_alpha")
    await mgr.connect(document_id="doc-123", websocket=ws_beta, tenant_id="tenant_beta")

    # Broadcast targeting tenant_alpha only
    secret_payload = {"type": "EXTRACTION_COMPLETE", "sensitive_data": "secret_alpha"}
    await mgr.broadcast_to_document("doc-123", secret_payload, tenant_id="tenant_alpha")

    # Alpha was sent the message
    ws_alpha.send_json.assert_awaited_once_with(secret_payload)
    # Beta was NOT sent the message
    ws_beta.send_json.assert_not_awaited()


@pytest.mark.asyncio
async def test_kafka_extraction_consumer_rejects_tenant_mismatch(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Verify that the Kafka extraction consumer aborts processing with a tenant mismatch
    error if a message references a document belonging to another tenant.
    """
    from app.kafka.consumers.extraction_consumer import run_extraction_consumer

    # Document belongs to tenant_alpha in DB
    fake_doc = types.SimpleNamespace(
        id="doc-alpha-123",
        tenant_id="tenant_alpha",
        filename="invoice.pdf",
        content_type="application/pdf",
        source_text="Invoice text",
    )

    async def fake_get(id_val):
        if str(id_val) == "doc-alpha-123":
            return fake_doc
        return None

    monkeypatch.setattr(Document, "get", fake_get)

    # Fake message coming from Kafka for tenant_beta targeting doc-alpha-123
    fake_kafka_msg = types.SimpleNamespace(
        topic="document-events",
        partition=0,
        offset=10,
        value=json.dumps({
            "event_type": "DOCUMENT_UPLOADED",
            "tenant_id": "tenant_beta",  # MISMATCH: belongs to alpha
            "payload": {
                "document_id": "doc-alpha-123",
                "filename": "invoice.pdf",
            },
        }).encode("utf-8"),
    )

    class FakeKafkaConsumer:
        def __init__(self, *args, **kwargs):
            self.started = False
            self.commit_called = False
            self.seek_called = False

        async def start(self):
            self.started = True

        async def getone(self):
            return fake_kafka_msg

        async def stop(self):
            pass

        async def commit(self):
            self.commit_called = True

        async def seek(self, topic, partition, offset):
            self.seek_called = True

    consumer_instance = None

    def fake_consumer_factory(*args, **kwargs):
        nonlocal consumer_instance
        consumer_instance = FakeKafkaConsumer()
        return consumer_instance

    monkeypatch.setattr(
        "app.kafka.consumers.extraction_consumer.AIOKafkaConsumer",
        fake_consumer_factory,
    )

    # Run one cycle of consumer
    stop_event = asyncio.Event()

    consumer_task = asyncio.create_task(run_extraction_consumer(stop_event=stop_event))
    await asyncio.sleep(0.1)
    stop_event.set()
    await consumer_task

    # Verify that the message was NEVER committed as successful extraction
    assert consumer_instance is not None
    assert consumer_instance.commit_called is False
