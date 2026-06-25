from __future__ import annotations

import os
from typing import Any

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
# LoggingInstrumentor is optional; package name may vary across versions.

from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
# SQLAlchemyInstrumentor is optional and may not be installed.

from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagate import set_global_textmap



def _env_bool(key: str, default: bool = False) -> bool:
    v = os.getenv(key)
    if v is None:
        return default
    return v.lower() in {"1", "true", "yes", "on"}


def configure_otel(app: Any) -> None:
    """Configure OpenTelemetry tracing.

    Uses OTLP over HTTP exporter by default.

    Env vars (typical):
      OTEL_SERVICE_NAME (default: idc-backend)
      OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://otel-collector:4318)
      OTEL_EXPORTER_OTLP_PROTOCOL (ignored; we use proto/http)
      OTEL_TRACES_SAMPLER (default: parentbased_always_on)
      OTEL_ENABLED (default: true if endpoint set)
    """

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    otel_enabled = _env_bool("OTEL_ENABLED", default=bool(endpoint))
    if not otel_enabled:
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "idc-backend")

    resource = Resource.create({
        SERVICE_NAME: service_name,
    })

    tracer_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(tracer_provider)

    if not endpoint:
        # No exporter endpoint => keep tracing disabled.
        return

    exporter = OTLPSpanExporter(endpoint=endpoint)
    span_processor = BatchSpanProcessor(exporter)
    tracer_provider.add_span_processor(span_processor)

    # Enable W3C trace context propagation.
    set_global_textmap(TraceContextTextMapPropagator())

    # Instrument supported libraries.
    try:
        FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)
    except Exception:
        pass

    try:
        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass

    try:
        RequestsInstrumentor().instrument()
    except Exception:
        pass

    # Logging instrumentation is optional and may not be available in all OTEL versions.
    try:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor  # type: ignore

        LoggingInstrumentor().instrument(set_logging_format=True)
    except Exception:
        pass


    # Beanie uses motor->pymongo driver internally; best-effort.
    try:
        PymongoInstrumentor().instrument()
    except Exception:
        pass

    try:
        SQLAlchemyInstrumentor().instrument()
    except Exception:
        pass

