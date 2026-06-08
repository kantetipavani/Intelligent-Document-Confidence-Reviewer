# TODO - Fix OCR / extraction failures

- [x] Implement OCR fallback in `backend/app/services/llm_service.py`:
  - [x] PDF text-layer extraction (pypdf) remains the fast path
  - [x] If extracted text is empty, run OCR:
    - [x] PDFs: pdf2image -> pytesseract per page
    - [x] Images: PIL -> pytesseract
- [x] Add OCR Python dependencies to `backend/requirements.txt`:
  - [x] pytesseract, pdf2image, Pillow
- [ ] Install system dependency: Tesseract OCR binary (`tesseract.exe`) and ensure it’s in PATH
- [ ] Install python deps (poetry or pip) and run tests
- [ ] Run a smoke test: upload a scanned PDF / image and verify `extraction.fields` is populated

