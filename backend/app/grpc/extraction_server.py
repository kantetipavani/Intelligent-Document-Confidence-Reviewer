from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator

import grpc
from grpc import ServicerContext
from opentelemetry import trace as ot_trace

from app.models.extraction_run import ExtractionRun
from app.services.extraction_service import run_extraction_and_prepare_review_version


from app.grpc.generated.extraction_pb2 import ExtractRequest, ExtractResponse, ExtractStatus
from app.grpc.generated.extraction_pb2_grpc import ExtractionServiceServicer

logger = logging.getLogger(__name__)


def _fields_map_from_result(result: dict[str, Any]) -> dict[str, Any]:
    """Convert backend result dict into proto `map<string, Field>` shape.

    Proto expects:
      Field { value: string, confidence: double }

    Backend stores either:
      { "fields": { key: {value, confidence}, ... } }
    or (legacy) already-flattened field dicts.
    """

    if not result:
        return {}

    fields_obj: Any = result.get("fields") if isinstance(result, dict) else None
    if not isinstance(fields_obj, dict):
        fields_obj = {}

    out: dict[str, Any] = {}

    for key, v in fields_obj.items():
        if not isinstance(v, dict):
            continue

        val = v.get("value")
        conf = v.get("confidence")

        try:
            conf_f = float(conf) if conf is not None else 0.0
        except Exception:
            conf_f = 0.0

        out[str(key)] = {
            "value": "" if val is None else str(val),
            "confidence": max(0.0, min(1.0, conf_f)),
        }

    return out



class ExtractionServiceImpl(ExtractionServiceServicer):
    def __init__(self) -> None:
        self._tracer = ot_trace.get_tracer(__name__)

    def Extract(self, request: ExtractRequest, context: ServicerContext) -> ExtractResponse:
        # This method is synchronous; delegate to async implementation.
        return asyncio.get_event_loop().run_until_complete(self._extract_once(request))

    async def _extract_once(self, request: ExtractRequest) -> ExtractResponse:
        # Idempotency is enforced by run_extraction_and_prepare_review_version.
        tenant_id = request.tenant_id
        document_id = request.document_id
        extraction_run_id = request.extraction_run_id

        # Ensure run exists (best-effort). If it already exists, service is idempotent.
        run = await ExtractionRun.get(extraction_run_id)
        if not run:
            run = ExtractionRun(tenant_id=tenant_id, document_id=document_id, status="queued")
            await run.insert()

        with self._tracer.start_as_current_span("grpc.extract"): 
            try:
                await run_extraction_and_prepare_review_version(
                    tenant_id=tenant_id,
                    document_id=document_id,
                    extraction_run_id=extraction_run_id,
                )
            except Exception as exc:
                # run_extraction_and_prepare_review_version marks failed itself, but be defensive.
                await ExtractionRun.get(extraction_run_id)
                raise exc

        run = await ExtractionRun.get(extraction_run_id)
        result_fields = _fields_map_from_result(run.result or {})
        return ExtractResponse(
            extraction_run_id=extraction_run_id,
            status=run.status,
            result_fields=result_fields,
        )

    async def ExtractWithStatus(self, request: ExtractRequest, context: ServicerContext) -> AsyncIterator[ExtractStatus]:
        extraction_run_id = request.extraction_run_id
        tenant_id = request.tenant_id

        # queued -> running -> completed/failed
        yield ExtractStatus(
            extraction_run_id=extraction_run_id,
            phase="queued",
            error="",
            result_fields={},
        )

        # Start async extraction.
        run = await ExtractionRun.get(extraction_run_id)
        if not run:
            run = ExtractionRun(tenant_id=tenant_id, document_id=request.document_id, status="queued")
            await run.insert()

        yield ExtractStatus(
            extraction_run_id=extraction_run_id,
            phase="running",
            error="",
            result_fields={},
        )

        try:
            await run_extraction_and_prepare_review_version(
                tenant_id=request.tenant_id,
                document_id=request.document_id,
                extraction_run_id=request.extraction_run_id,
            )
            run = await ExtractionRun.get(extraction_run_id)

            yield ExtractStatus(
                extraction_run_id=extraction_run_id,
                phase="completed" if run.status == "completed" else run.status,
                error="",
                result_fields=_fields_map_from_result(run.result or {}),
            )
        except Exception as exc:
            logger.exception("grpc ExtractWithStatus failed")
            run = await ExtractionRun.get(extraction_run_id)
            yield ExtractStatus(
                extraction_run_id=extraction_run_id,
                phase="failed",
                error=str(exc),
                result_fields=_fields_map_from_result(getattr(run, "result", {}) or {}),
            )


async def serve_grpc(host: str, port: int) -> None:
    server = grpc.aio.server()
    # Import generated module so registration happens.
    from app.grpc.generated.extraction_pb2_grpc import add_ExtractionServiceServicer_to_server

    add_ExtractionServiceServicer_to_server(ExtractionServiceImpl(), server)

    listen_addr = f"{host}:{port}"
    server.add_insecure_port(listen_addr)
    await server.start()
    logger.info("gRPC extraction server listening on %s", listen_addr)
    await server.wait_for_termination()

