from __future__ import annotations

import os
from typing import Any

try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
except ModuleNotFoundError:  # pragma: no cover
    trace = None  # type: ignore[assignment]



def _env_bool(key: str, default: bool = False) -> bool:
    v = os.getenv(key)
    if v is None:
        return default
    return v.lower() in {"1", "true", "yes", "on"}


def configure_tracing(app: Any) -> None:
    """Configure OpenTelemetry tracing.

    Requirements:
      - OTEL_EXPORTER_OTLP_ENDPOINT should point to an OTLP collector.
        Example: http://otel-collector:4317 (gRPC)
        Note: we use OTLP gRPC exporter.
      - OTEL_SERVICE_NAME optional.

    If OTEL_EXPORTER_OTLP_ENDPOINT is unset, tracing is a no-op.
    """

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    enabled = _env_bool("OTEL_ENABLED", default=bool(endpoint))
    if not enabled or not endpoint:
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "indcr-backend").strip() or "indcr-backend"
    resource = Resource(attributes={SERVICE_NAME: service_name})

    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))

    # Instrument libraries.
    try:
        FastAPIInstrumentor().instrument_app(app, tracer_provider=provider)
    except Exception:
        # Do not fail the server on optional instrumentation.
        pass

    try:
        PymongoInstrumentor().instrument()
    except Exception:
        pass


def get_tracer_provider() -> TracerProvider | None:
    provider = trace.get_tracer_provider()
    # type: ignore[attr-defined]
    return provider if isinstance(provider, TracerProvider) else None

