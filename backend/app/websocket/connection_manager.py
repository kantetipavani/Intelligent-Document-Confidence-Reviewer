from __future__ import annotations

from collections import defaultdict
from typing import DefaultDict, Dict, Set

from fastapi import WebSocket


class ConnectionManager:
    """Singleton in-memory WS connection registry.

    - document_id -> set of active websocket connections
    - dashboard tenant broadcast uses tenant_id -> set of active dashboard websockets
    """

    def __init__(self) -> None:
        self.document_connections: DefaultDict[str, Set[WebSocket]] = defaultdict(set)
        self.dashboard_connections: DefaultDict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(
        self, *, document_id: str, websocket: WebSocket, tenant_id: str
    ) -> None:
        await websocket.accept()
        self.document_connections[document_id].add(websocket)

    async def disconnect(self, document_id: str, websocket: WebSocket) -> None:
        if document_id in self.document_connections:
            self.document_connections[document_id].discard(websocket)
            if not self.document_connections[document_id]:
                del self.document_connections[document_id]

    async def connect_dashboard(self, *, websocket: WebSocket, tenant_id: str) -> None:
        await websocket.accept()
        self.dashboard_connections[tenant_id].add(websocket)

    async def disconnect_dashboard(self, websocket: WebSocket) -> None:
        # remove from whichever tenant set it exists in
        for tenant_id in list(self.dashboard_connections.keys()):
            if websocket in self.dashboard_connections[tenant_id]:
                self.dashboard_connections[tenant_id].discard(websocket)
                if not self.dashboard_connections[tenant_id]:
                    del self.dashboard_connections[tenant_id]

    async def broadcast_to_document(self, document_id: str, message: dict) -> None:
        connections = list(self.document_connections.get(document_id, set()))
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                # best-effort cleanup
                await self.disconnect(document_id, ws)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict) -> None:
        connections = list(self.dashboard_connections.get(tenant_id, set()))
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect_dashboard(ws)


# Singleton instance
connection_manager = ConnectionManager()


