# TODO_WEBSOCKET_STATUS

- [ ] Backend: add WebSocket endpoint for per-document status updates
- [ ] Backend: add in-memory connection registry keyed by (tenant_id, document_id)
- [] Backend: emit WS messages from extraction_consumer on status transitions (running/ready/failed)

- [] Backend: register WS route in FastAPI main app

- [] Frontend: replace polling loop (versions/latest) with WebSocket subscription

- [] Frontend: update UI state from WS payload (setFields + setIsExtracted)

- [] Manual test required: upload invoice and verify no repeated /versions/latest polling
- [ ] Manual test: upload invoice and verify WS updates UI (document_status->ready)

