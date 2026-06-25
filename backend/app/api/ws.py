from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import _extract_bearer_token
from app.core.config import settings
from app.models.user import User
from app.websocket.connection_manager import connection_manager

from jose import JWTError, jwt

router = APIRouter()


def _validate_ws_token(token: str) -> dict:
    # JWT validation for WS: token comes via query param (?token=...)
    # Validate similarly to HTTP routes.
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as exc:
        raise exc


@router.websocket("/ws/documents/{document_id}")
async def document_websocket(websocket: WebSocket, document_id: str) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = _validate_ws_token(token)
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            await websocket.close(code=4001)
            return

        # Connect and register
        await connection_manager.connect(
            document_id=document_id,
            websocket=websocket,
            tenant_id=str(tenant_id),
        )

        # Send current status immediately (best-effort from DB)
        # Reuse existing HTTP status logic pattern without polling.
        try:
            from app.models.extraction_run import ExtractionRun
            from app.models.review_version import ReviewVersion
            from app.core.security import get_current_user

            # We don't have a User object here (WS can't send Authorization header).
            # So compute current status using tenant_id directly.
            runs = await ExtractionRun.find(
                {"tenant_id": str(tenant_id), "document_id": str(document_id)}
            ).sort("-created_at").limit(1).to_list()

            if not runs:
                await websocket.send_json(
                    {
                        "type": "document_status",
                        "document_id": document_id,
                        "status": "failed",
                    }
                )
            else:
                run = runs[0]
                if run.status in {"queued", "running"}:
                    await websocket.send_json(
                        {
                            "type": "document_status",
                            "document_id": document_id,
                            "status": "processing",
                        }
                    )
                elif run.status == "completed":
                    versions = await ReviewVersion.find(
                        {"tenant_id": str(tenant_id), "document_id": str(document_id)}
                    ).sort("-created_at").limit(1).to_list()
                    if versions:
                        extraction = versions[0].snapshot.get("fields", versions[0].snapshot) or versions[0].snapshot
                    else:
                        extraction = (run.result or {}).get("fields", run.result) if run.result else None
                    await websocket.send_json(
                        {
                            "type": "document_status",
                            "document_id": document_id,
                            "status": "ready",
                            "extraction": extraction,
                        }
                    )
                else:
                    await websocket.send_json(
                        {
                            "type": "document_status",
                            "document_id": document_id,
                            "status": "failed",
                        }
                    )
        except Exception:
            # If DB status fetch fails, still allow receiving next pushed update.
            await websocket.send_json(
                {
                    "type": "document_status",
                    "document_id": document_id,
                    "status": "processing",
                }
            )

        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        await connection_manager.disconnect(document_id, websocket)
    except Exception:
        await websocket.close(code=4001)


@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = _validate_ws_token(token)
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            await websocket.close(code=4001)
            return

        await websocket.accept()
        await connection_manager.connect_dashboard(websocket=websocket, tenant_id=str(tenant_id))
        await websocket.send_json({"type": "connected", "tenant_id": str(tenant_id)})

        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        await connection_manager.disconnect_dashboard(websocket)
    except Exception:
        await websocket.close(code=4001)

