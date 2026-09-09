from __future__ import annotations

from io import BytesIO
from pathlib import Path
import zipfile

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.config import settings
from app.core.security import get_current_user

from app.models.document import Document
from app.models.user import User
from app.services.llm_service import (
    ExtractionResult,
    extract_invoice_from_document_bytes,
)
from app.websocket.connection_manager import connection_manager
from app.core.rate_limiter import (
    enforce_tenant_rate_limit,
    tenant_rate_limit_dependency,
)
from app.api.activity import record_event


router = APIRouter()


# ---------------------------------------------------------------------------
# Upload validation configuration
# ---------------------------------------------------------------------------

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
}

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


# ---------------------------------------------------------------------------
# Dashboard cache helper
# ---------------------------------------------------------------------------

def _k_dashboard_stats(tenant_id: str) -> str:
    return f"dashboard_stats:{tenant_id}"


# ---------------------------------------------------------------------------
# Response model
# ---------------------------------------------------------------------------

class DocumentCreateResponse(BaseModel):
    document_id: str | None = None
    status: str
    extraction: ExtractionResult | None = None


# ---------------------------------------------------------------------------
# File validation helpers
# ---------------------------------------------------------------------------

def validate_filename(filename: str) -> str:
    """
    Validate filename and return the normalized extension.
    """

    if not filename or not filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="filename required",
        )

    extension = Path(filename).suffix.lower()

    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File extension is required.",
        )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. "
                "Allowed types: PDF, DOC, DOCX, TXT."
            ),
        )

    return extension


def validate_file_size(file_bytes: bytes) -> None:
    """
    Reject empty and oversized files.
    """

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail="File is too large. Maximum allowed size is 10 MB.",
        )


def validate_pdf(file_bytes: bytes) -> None:
    """
    Validate that a PDF is readable and contains at least one page.
    """

    try:
        reader = PdfReader(BytesIO(file_bytes))

        if len(reader.pages) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF contains no pages.",
            )

    except HTTPException:
        raise

    except (PdfReadError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed or corrupted PDF file.",
        ) from exc


def validate_doc(file_bytes: bytes) -> None:
    """
    Validate that a legacy DOC file has a valid OLE Compound Document signature.
    """
    if len(file_bytes) < 512 or not file_bytes.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed or corrupted DOC file.",
        )


def validate_docx(file_bytes: bytes) -> None:
    """
    Validate that a DOCX file is a valid zip archive containing document XML.
    """

    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as z:
            namelist = z.namelist()
            if "[Content_Types].xml" not in namelist and "word/document.xml" not in namelist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Malformed or corrupted DOCX file.",
                )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed or corrupted DOCX file.",
        ) from exc


def validate_txt(file_bytes: bytes) -> None:
    """
    Validate that a text file is readable text content and not empty or whitespace-only.
    """

    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or unreadable text file.",
            ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )


def validate_uploaded_file(
    filename: str,
    file_bytes: bytes,
    content_type: str | None,
) -> None:
    """
    Run all upload validations before any persistence or processing.
    """

    extension = validate_filename(filename)

    # Empty + maximum size checks
    validate_file_size(file_bytes)

    # MIME type validation when provided by the client.
    #
    # Some clients/proxies may omit or provide a generic content type,
    # so we only reject an explicitly unsupported MIME type.
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported content type. "
                "Allowed types: PDF, DOC, DOCX, TXT."
            ),
        )

    # File-type specific structural validation.
    if extension == ".pdf":
        validate_pdf(file_bytes)
    elif extension == ".doc":
        validate_doc(file_bytes)
    elif extension == ".docx":
        validate_docx(file_bytes)
    elif extension == ".txt":
        validate_txt(file_bytes)


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=DocumentCreateResponse,
)
async def upload_document(
    _rate_limited: None = Depends(
        tenant_rate_limit_dependency(
            endpoint_key="upload",
            current_user_dep=get_current_user,
        )
    ),
    filename: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):

    # -----------------------------------------------------------------------
    # Tenant isolation
    # -----------------------------------------------------------------------

    # Tenant is ALWAYS derived from the authenticated JWT.
    # Do not accept tenant_id from the request body.
    tenant_id = current_user.tenant_id

    if settings.skip_db:
        # In skip_db mode we still require a JWT so UI cannot upload into
        # arbitrary tenants.
        #
        # No persistence occurs, so extraction is performed directly.
        pass

    # -----------------------------------------------------------------------
    # Validate filename
    # -----------------------------------------------------------------------

    # The frontend sends filename separately as a multipart form field.
    # Fall back to UploadFile.filename if necessary.
    actual_filename = (
        filename.strip()
        if filename and filename.strip()
        else (file.filename or "")
    )

    if not actual_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="filename required",
        )

    # -----------------------------------------------------------------------
    # Read uploaded file
    # -----------------------------------------------------------------------

    content_type = file.content_type

    file_bytes = await file.read()

    # -----------------------------------------------------------------------
    # Validate BEFORE MongoDB / extraction / Kafka
    # -----------------------------------------------------------------------

    validate_uploaded_file(
        filename=actual_filename,
        file_bytes=file_bytes,
        content_type=content_type,
    )

    # -----------------------------------------------------------------------
    # skip_db mode
    # -----------------------------------------------------------------------

    if settings.skip_db:
        try:
            extraction = await extract_invoice_from_document_bytes(
                file_bytes=file_bytes,
                content_type=content_type,
                filename=actual_filename,
            )

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"invoice extraction failed: {exc}",
            ) from exc

        return DocumentCreateResponse(
            document_id=None,
            status="extracted",
            extraction=extraction,
        )

    # -----------------------------------------------------------------------
    # Persist document metadata
    # -----------------------------------------------------------------------

    doc = Document(
        tenant_id=tenant_id,
        filename=actual_filename,
        content_type=content_type,
        source_text=None,
    )

    await doc.insert()

    # -----------------------------------------------------------------------
    # Create extraction run
    # -----------------------------------------------------------------------

    from app.models.extraction_run import ExtractionRun

    run = ExtractionRun(
        tenant_id=tenant_id,
        document_id=str(doc.id),
        status="running",
    )

    await run.insert()

    # -----------------------------------------------------------------------
    # Synchronous extraction
    # -----------------------------------------------------------------------

    # UI requires extracted fields immediately after upload.
    # Therefore extraction is performed synchronously here.
    #
    # Kafka/review pipeline can still run afterward.
    try:

        extraction = await extract_invoice_from_document_bytes(
            file_bytes=file_bytes,
            content_type=content_type,
            filename=actual_filename,
        )

        # ---------------------------------------------------------------
        # Mark extraction as completed
        # ---------------------------------------------------------------

        run.status = "completed"

        # ExtractionRun.result is a dict.
        run.result = extraction.model_dump()

        run.error = None

        await run.save()

        # ---------------------------------------------------------------
        # Create review version
        # ---------------------------------------------------------------

        from app.services.extraction_service import create_review_version

        await create_review_version(
            tenant_id=tenant_id,
            document_id=str(doc.id),
            extraction_run_id=str(run.id),
            snapshot=run.result,
            action="ai_pass",
            reviewer_user_id=None,
        )

        # ---------------------------------------------------------------
        # Activity event
        # ---------------------------------------------------------------

        try:
            await record_event(
                event_type="document_uploaded",
                user_email=current_user.email,
                tenant_id=tenant_id,
                payload={
                    "document_id": str(doc.id),
                    "filename": actual_filename,
                    "content_type": content_type,
                    "extraction_run_id": str(run.id),
                    "extraction": extraction.model_dump(),
                },
            )

        except Exception:
            # Activity logging must not break document upload.
            pass

    except Exception as exc:

        run.status = "failed"
        run.error = str(exc)

        await run.save()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"invoice extraction failed: {exc}",
        ) from exc

    # -----------------------------------------------------------------------
    # Kafka event
    # -----------------------------------------------------------------------

    # Best-effort Kafka dispatch.
    # Synchronous extraction has already completed, so Kafka failure should
    # not make an otherwise successful upload fail.

    from app.kafka.producer import publish
    from app.kafka.topics import DOCUMENT_EVENTS

    try:

        # Optional trace propagation.
        from app.core.tracing import (
            inject_trace_into_headers,  # type: ignore
        )

        trace_headers = inject_trace_into_headers()

        await publish(
            topic=DOCUMENT_EVENTS,
            event_type="DOCUMENT_UPLOADED",
            payload={
                "document_id": str(doc.id),
                "filename": actual_filename,
                "content_type": content_type,
                "extraction_run_id": str(run.id),
                "tenant_id": tenant_id,
                "user_email": current_user.email,
            },
            tenant_id=tenant_id,
            request_app=None,
            headers=trace_headers,
        )

    except Exception:
        # Ignore Kafka errors because synchronous extraction already completed.
        pass

    # -----------------------------------------------------------------------
    # Return response
    # -----------------------------------------------------------------------

    return DocumentCreateResponse(
        document_id=str(doc.id),
        status="extracted",
        extraction=extraction,
    )


# ---------------------------------------------------------------------------
# Get document
# ---------------------------------------------------------------------------

@router.get("/{tenant_id}/{document_id}")
async def get_document(
    tenant_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:

    # -----------------------------------------------------------------------
    # Tenant isolation
    # -----------------------------------------------------------------------

    if tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="tenant mismatch",
        )

    # -----------------------------------------------------------------------
    # Find document
    # -----------------------------------------------------------------------

    doc = await Document.get(document_id)

    if not doc or doc.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="document not found",
        )

    # -----------------------------------------------------------------------
    # Activity event
    # -----------------------------------------------------------------------

    try:

        await record_event(
            event_type="document_retrieved",
            user_email=current_user.email,
            tenant_id=tenant_id,
            payload={
                "document_id": document_id,
                "filename": doc.filename,
                "content_type": doc.content_type,
            },
        )

    except Exception:
        pass

    # -----------------------------------------------------------------------
    # Response
    # -----------------------------------------------------------------------

    return {
        "document_id": str(doc.id),
        "tenant_id": doc.tenant_id,
        "filename": doc.filename,
        "content_type": doc.content_type,
        "source_text": doc.source_text,
    }