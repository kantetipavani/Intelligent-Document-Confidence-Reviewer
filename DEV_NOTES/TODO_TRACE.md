# TODO_TRACE.md

- [x] Add OpenTelemetry setup module: `backend/app/core/otel.py`
- [x] Add Kafka trace propagation helper: `backend/app/core/trace_kafka.py`
- [x] Enable OTel in FastAPI startup: `backend/app/main.py`
- [x] Inject trace context into Kafka headers on HTTP upload: `backend/app/api/documents.py`
- [x] Support Kafka headers in Kafka producer: `backend/app/kafka/producer.py`
- [x] Continue trace context from Kafka headers and add consumer spans: `backend/app/kafka/consumers/extraction_consumer.py`
- [ ] Add `pip`/poetry deps for OpenTelemetry packages in `backend/pyproject.toml`
- [ ] Run backend once with OTEL env vars and verify traces in collector/UI

