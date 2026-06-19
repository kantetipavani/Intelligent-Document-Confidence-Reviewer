from __future__ import annotations

from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

router = APIRouter()


@router.get("")
async def metrics() -> Response:
    # Prometheus text format
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

