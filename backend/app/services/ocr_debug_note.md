OCR fallback implementation details

File: backend/app/services/llm_service.py

Behavior:
1) Fast path: extract_text_from_document() tries PDF text layer (pypdf) or byte decode.
2) If the extracted text is empty/whitespace, _maybe_ocr_fallback() runs OCR:
   - Scanned PDF: pdf2image.convert_from_bytes -> pytesseract.image_to_string per page
   - Images: PIL.Image.open(BytesIO(...)) -> pytesseract.image_to_string

Errors:
- If OCR libraries are missing (pdf2image/pytesseract/Pillow), the API raises a 502 with the message.
- System-level Tesseract binary must be installed.

