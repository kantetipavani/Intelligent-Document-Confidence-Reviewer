# IDC Backend

FastAPI backend for invoice extraction with Anthropic Claude.

---

## Run In Under Minutes

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Create `backend/.env`:

```env
ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_MODEL=claude-3-5-haiku-latest
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=idc_dev
SKIP_DB=false
```

MongoDB is used for user/document/extraction persistence and audit events.

For a quick API-only smoke test without MongoDB, set:

```env
SKIP_DB=true
```

Optional runtime flags:

```env
KAFKA_ENABLED=false   # disable Kafka producer/consumers

# SMTP configuration for OTP / reset-password emails (see backend/.env.example)
# SMTP_HOST=...
# SMTP_PORT=...
# SMTP_EMAIL=...
# SMTP_PASSWORD=...
# SMTP_STRICT=true
```


4. Start the server from `backend/`:

```powershell
uvicorn app.main:app --reload --port 8000
```

5. Open API docs:

- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI JSON: http://127.0.0.1:8000/openapi.json

6. Upload an invoice PDF:

> Note: backend `POST /documents/upload` typically requires Bearer auth.

```powershell
curl.exe -X POST "http://127.0.0.1:8000/documents/upload" `
  -H "Authorization: Bearer $TOKEN" `
  -F "tenant_id=default" `
  -F "filename=invoice.pdf" `
  -F "user_email=user@example.com" `
  -F "file=@C:\path\to\invoice.pdf;type=application/pdf"
```

Response shape:

```json
{
  "document_id": "optional-mongo-id",
  "status": "extracted",
  "extraction": {
    "invoice_number": {"value": "INV-1001", "confidence": 0.96},
    "vendor_name": {"value": "Acme Supplies", "confidence": 0.91},
    "invoice_total": {"value": "INR 12,500.00", "confidence": 0.88}
  }
}
```

---

## Backend Features (End-to-end capabilities)

### Authentication & Account Security

- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Documents

- `POST /documents/upload` (upload file and trigger extraction)
- `GET /documents/{document_id}` (document + latest extraction metadata)
- `GET /documents/list` (paginated list; tenant scoped)
- `DELETE /documents/{document_id}`

Also included:
- Full-text search route scaffold: `app.api.document_search` (Atlas Search planned)

### Extraction (AI processing)

- `POST /extraction/extract` (trigger extraction for a document)
- `GET /extraction/{extraction_id}` (fetch an extraction run)

Realtime extraction updates are supported via WebSocket endpoints from `app.api.ws`.

### Versioning & Comparison

- `GET /versions/latest/{document_id}`
- `GET /versions/list/{document_id}`
- `POST /versions/compare`

### Reviews (approve / reject workflow)

- `POST /reviews/approve`
- `POST /reviews/reject`

### Activity & Audit Trail

- `GET /activity/by-email/{user_email}`
- `GET /activity/audit/{document_id}`

### Tenants

- `POST /tenants`
- `GET /tenants/{tenant_id}`

### Observability & Dashboards

- `GET /health`
- `GET /metrics` (Prometheus text exposition; optional dependency)
- OpenTelemetry integration:
  - `app/core/otel.py`
  - `app/core/tracing.py`
- Confidence dashboard & anomaly alerts mounted under:
  - `/dashboard` (confidence dashboard, anomalies dashboard, and alerts)

---

## Kafka + Workers (optional)

- Kafka support is optional and controlled by `KAFKA_ENABLED`.
- When enabled, producers/consumers support event-driven extraction/audit/review flows.
- A legacy in-process extraction worker loop is also started for compatibility.

---

## Tests

Tests mock the Anthropic call and do not require a live API key.

```powershell
pytest
```

