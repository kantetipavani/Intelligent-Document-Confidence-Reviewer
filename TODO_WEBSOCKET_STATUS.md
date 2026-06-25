# TODO_WEBSOCKET_STATUS

- [ ] Backend: add WebSocket endpoint for per-document status updates
- [ ] Backend: add in-memory connection registry keyed by (tenant_id, document_id)
- [x] Backend: emit WS messages from extraction_consumer on status transitions (running/ready/failed)

- [x] Backend: register WS route in FastAPI main app

- [x] Frontend: replace polling loop (versions/latest) with WebSocket subscription

- [x] Frontend: update UI state from WS payload (setFields + setIsExtracted)

- [ ] Manual test: upload invoice and verify no repeated /versions/latest polling


