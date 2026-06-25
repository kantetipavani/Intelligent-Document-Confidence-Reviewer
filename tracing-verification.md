# tracing-verification.md

## Goal
Verify a full distributed trace for one invoice upload:
- HTTP POST `/documents/upload`
- Kafka publish (`kafka.publish.document_uploaded`)
- Kafka consume/extraction (`extract_invoice_from_document_bytes` and `claude.extraction` if LLM enabled)
- MongoDB writes / audit log (`mongodb.write.audit_log`)

## How to verify
1. Start stack:
   - `docker compose up -d --build`
2. Open Jaeger UI:
   - http://localhost:16686
3. Trigger an upload:
   - Use frontend upload flow (or curl/requests).
4. In Jaeger, search for service `indcr-backend`.
5. Select the trace for that upload and confirm the span tree and timing.

## Notes
- This file will include a screenshot after verification.

