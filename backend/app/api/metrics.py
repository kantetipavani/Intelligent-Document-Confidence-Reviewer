from __future__ import annotations

from fastapi import APIRouter, Response
try:
    # Optional dependency: tests (and some dev environments) may not install Prometheus.
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
except ModuleNotFoundError:  # pragma: no cover
    CONTENT_TYPE_LATEST = "text/plain"

    def generate_latest() -> bytes:  # type: ignore[misc]
        return b""


router = APIRouter()


@router.get("")
async def metrics() -> Response:
    # Prometheus text format
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


