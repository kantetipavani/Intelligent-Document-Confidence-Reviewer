OCR dependencies (expected)

To enable OCR fallback in backend/app/services/llm_service.py:
- Python packages:
  - pytesseract
  - pdf2image
  - Pillow
- OS binary:
  - Tesseract OCR engine (tesseract)

If these are not installed, the upload endpoint will return 502 with a helpful message.
