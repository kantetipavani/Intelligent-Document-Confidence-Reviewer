# IDC Backend

FastAPI backend for invoice extraction with Anthropic Claude.

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

MongoDB is used for document/audit persistence. For a quick API-only smoke test without MongoDB, set:

```env
SKIP_DB=true
```

4. Start the server from `backend/`:

```powershell
uvicorn app.main:app --reload
```

5. Upload an invoice PDF:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/documents/upload" `
  -F "tenant_id=default" `
  -F "filename=invoice.pdf" `
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

## Tests

Tests mock the Anthropic call and do not require a live API key.

```powershell
pytest
```
