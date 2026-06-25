from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


class DocumentStatusBroadcaster:
    """Simple in-memory pub/sub.

    Keyed by (tenant_id, document_id). Works per backend instance.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._connections: Dict[tuple[str, str], set[WebSocket]] = {}

    async def subscribe(
        self, *, tenant_id: str, document_id: str, websocket: WebSocket
    ) -> None:
        key = (tenant_id, document_id)
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(key, set()).add(websocket)

    async def unsubscribe(
        self, *, tenant_id: str, document_id: str, websocket: WebSocket
    ) -> None:
        key = (tenant_id, document_id)
        async with self._lock:
            conns = self._connections.get(key)
            if not conns:
                return
            conns.discard(websocket)
            if not conns:
                self._connections.pop(key, None)

    async def publish(
        self,
        *,
        tenant_id: str,
        document_id: str,
        message: Dict[str, Any],
    ) -> None:
        key = (tenant_id, document_id)
        # snapshot connections under lock
        async with self._lock:
            conns = list(self._connections.get(key, set()))

        if not conns:
            return

        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        if dead:
            async with self._lock:
                conns_set = self._connections.get(key)
                if conns_set:
                    for ws in dead:
                        conns_set.discard(ws)
                    if not conns_set:
                        self._connections.pop(key, None)


broadcaster = DocumentStatusBroadcaster()


def _ws_get_token(websocket: WebSocket) -> Optional[str]:
    # FastAPI provides Authorization header in websocket scope.
    # We'll rely on the existing get_current_user which uses the `authorization` header.
    # Many reverse proxies don't forward headers; however, in this project we can
    # pass it from the browser via `Sec-WebSocket-Protocol` is non-trivial.
    # Instead, we accept that deployments should terminate JWT earlier or enable
    # proper header forwarding.
    return None


@router.websocket("/ws/documents/{document_id}")
async def ws_document_status(
    websocket: WebSocket,
    document_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    # Note: get_current_user expects an Authorization header.
    # If it isn't present, the websocket handshake will fail.
    await broadcaster.subscribe(
        tenant_id=current_user.tenant_id,
        document_id=document_id,
        websocket=websocket,
    )

    try:
        # Wait forever; messages come from server side.
        # We still read from the socket to detect client disconnects.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await broadcaster.unsubscribe(
            tenant_id=current_user.tenant_id,
            document_id=document_id,
            websocket=websocket,
        )
    except Exception:
        await broadcaster.unsubscribe(
            tenant_id=current_user.tenant_id,
            document_id=document_id,
            websocket=websocket,
        )
        raise

