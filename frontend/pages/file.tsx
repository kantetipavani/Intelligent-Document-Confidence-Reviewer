import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useExtractionFieldsFromWebSocket } from "../hooks/useExtractionFieldsFromWebSocket";
import { validateFileAsync } from "../utils/fileValidation";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

type ExtractedField = {
  name: string;
  value: string;
  confidence: number;
};

export default function InvoicePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{
    type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
    title: string;
    message: string;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "empty" | "malformed" | "oversized" | "unsupported" | "general";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [isExtracted, setIsExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const { fields: wsFields, isReady: wsReady } =
    useExtractionFieldsFromWebSocket({
      documentId,
      token,
      enabled: !!documentId,
    });

  /*
   * WebSocket extraction result
   */
  useEffect(() => {
    if (wsReady && wsFields.length > 0) {
      setFields(wsFields);
      setIsExtracted(true);
      setLoading(false);
    }
  }, [wsReady, wsFields]);

  /*
   * Normalize confidence value.
   *
   * Backend may return:
   * 0.95  -> 95%
   * 95    -> 95%
   */
  const normalizeConfidence = (value: unknown): number => {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    if (numericValue <= 1) {
      return Math.round(numericValue * 100);
    }

    return Math.round(
      Math.max(0, Math.min(100, numericValue))
    );
  };

  const clearInvalidFile = (input?: HTMLInputElement | null) => {
    if (input) {
      input.value = "";
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFile(null);
    setIsExtracted(false);
    setFields([]);
    setDocumentId(null);
    setLoading(false);
  };

  const processFile = async (
    file: File | null | undefined,
    inputElement?: HTMLInputElement | null
  ) => {
    // Reset old extraction data & errors
    setSelectedFile(null);
    setIsExtracted(false);
    setFields([]);
    setDocumentId(null);
    setFileError(null);
    setValidationError(null);

    if (!file) {
      return;
    }

    // Detect 1st: empty file, malformed file, oversized file
    const validation = await validateFileAsync(file);
    if (!validation.isValid) {
      const err: {
        type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
        title: string;
        message: string;
      } = {
        type: (validation.errorType as any) || "general",
        title: validation.title || "file validation error",
        message: validation.message || "Invalid file detected. Processing stopped.",
      };
      setValidationError(err);
      setFileError(err.title);
      setErrorModal({
        isOpen: true,
        title: err.title,
        message: err.message,
        type: err.type,
      });
      clearInvalidFile(inputElement);
      return;
    }

    // Valid file
    setValidationError(null);
    setFileError(null);
    setSelectedFile(file);
  };

  /*
   * FILE UPLOAD
   */
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    await processFile(file, e.currentTarget);
  };

  /* DRAG AND DROP */
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  /*
   * OCR EXTRACTION
   */
  const handleExtract = async () => {
    if (loading) {
      return;
    }

    // No file
    if (!selectedFile) {
      alert("Please upload an invoice file.");
      return;
    }

    // Detect 1st before proceeding: empty file, malformed file, oversized file
    const validation = await validateFileAsync(selectedFile);
    if (!validation.isValid) {
      const err: {
        type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
        title: string;
        message: string;
      } = {
        type: validation.errorType || "general",
        title: validation.title || "file validation error",
        message: validation.message || "Invalid file detected. Processing stopped.",
      };
      setValidationError(err);
      setFileError(err.title);
      setErrorModal({
        isOpen: true,
        title: err.title,
        message: err.message,
        type: err.type,
      });
      clearInvalidFile();
      return;
    }

    setIsExtracted(false);
    setFields([]);
    setDocumentId(null);
    setLoading(true);
    setFileError(null);
    setValidationError(null);

    try {
      const formData = new FormData();

      // Backend field
      formData.append("tenant_id", "default");

      // Filename
      formData.append(
        "filename",
        selectedFile.name
      );

      // File
      formData.append(
        "file",
        selectedFile
      );

      /*
       * Only validated files reach this API call.
       */
      const response = await api.post(
        "/documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const returnedDocumentId =
        response.data?.document_id ?? null;

      if (!returnedDocumentId) {
        throw new Error(
          "document_id missing from upload response"
        );
      }

      setDocumentId(returnedDocumentId);

      /*
       * If backend returns extraction immediately,
       * use it as a fallback.
       */
      const maybeExtraction =
        response.data?.extraction;

      if (maybeExtraction) {
        let normalizedExtraction: any =
          maybeExtraction;

        if (
          maybeExtraction?.fields &&
          typeof maybeExtraction.fields === "object"
        ) {
          normalizedExtraction = {
            ...maybeExtraction,
            ...maybeExtraction.fields,
          };
        }

        const extractedFields: ExtractedField[] = [
          "invoice_no",
          "vendor",
          "amount",
          "date",
          "gstin",
          "status",
        ].map((key) => {
          const field =
            normalizedExtraction?.[key];

          if (
            field &&
            typeof field === "object"
          ) {
            return {
              name: key
                .replace(/_/g, " ")
                .toUpperCase(),

              value: String(
                field.value ?? ""
              ),

              confidence:
                normalizeConfidence(
                  field.confidence
                ),
            };
          }

          return {
            name: key
              .replace(/_/g, " ")
              .toUpperCase(),

            value:
              field !== undefined &&
              field !== null
                ? String(field)
                : "",

            confidence: 0,
          };
        });

        setFields(extractedFields);
        setIsExtracted(true);
      }
    } catch (error: any) {
      console.error(
        "OCR Extraction Error:",
        error
      );

      const status = error?.response?.status;
      const data = error?.response?.data;
      const backendMessage =
        (data && (data.detail || data.message))
          ? data.detail || data.message
          : typeof data === "string"
            ? data
            : null;

      const lowerMsg = String(backendMessage || "").toLowerCase();

      let errType: "empty" | "malformed" | "oversized" | "general" = "general";
      let errTitle = "OCR Extraction Failed";
      let errDesc = backendMessage ? String(backendMessage) : "OCR Extraction Failed. Processing stopped.";

      if (lowerMsg.includes("empty")) {
        errType = "empty";
        errTitle = "empty file not processing";
        errDesc = "The uploaded file is empty (0 bytes). Processing stopped.";
      } else if (lowerMsg.includes("malformed") || lowerMsg.includes("corrupt") || lowerMsg.includes("no pages")) {
        errType = "malformed";
        errTitle = "malformed file not processing";
        errDesc = "The uploaded file is corrupted or malformed. Processing stopped.";
      } else if (status === 413 || lowerMsg.includes("too large") || lowerMsg.includes("maximum")) {
        errType = "oversized";
        errTitle = "oversized file not processing";
        errDesc = "The uploaded file exceeds the 10MB limit. Processing stopped.";
      }

      setValidationError({
        type: errType,
        title: errTitle,
        message: errDesc,
      });
      setFileError(errTitle);
      setErrorModal({
        isOpen: true,
        title: errTitle,
        message: errDesc,
        type: errType,
      });
      alert(`${errTitle}: ${errDesc}`);

      setIsExtracted(false);
      setFields([]);
      setDocumentId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">

      {/* LEFT SIDE */}

      <div
        className={`upload-card ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >

        <h2>
          Upload Invoice
          <br />
          (maximum file size: 10MB)
        </h2>

        <div
          className={`upload-box ${isDragging ? "drag-active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          <label>
            Upload file

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>

          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
            or drag & drop invoice file here
          </div>

          {validationError && (
            <div className="file-error-notice">
              ⚠️ <b>{validationError.title}</b>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>{validationError.message}</div>
            </div>
          )}

          {selectedFile && !validationError && (
            <div className="file-preview">

              📄 {selectedFile.name}

              <div className="file-size">
                {(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </div>

            </div>
          )}

        </div>

        <div className="file-info">
          Maximum file size: 10 MB
          <br />
          Supported formats: PDF, DOC, DOCX, TXT
        </div>

        <button
          type="button"
          className="extract-btn"
          onClick={handleExtract}
          disabled={loading || !selectedFile || !!validationError}
        >
          {loading
            ? "Processing..."
            : "Extract Invoice Data"}
        </button>

      </div>

      {/* RIGHT SIDE */}

      <div className="review-panel">

        <div className="review-header">

          <h2>
            Extracted Invoice Fields
          </h2>

          <span className="review-tag">
            AI Generated
          </span>

        </div>

        {loading && !isExtracted ? (

          <div className="empty-state">

            <div className="empty-icon">
              ⏳
            </div>

            <h3>
              Processing invoice...
            </h3>

            <p>
              Please wait while we extract fields.
            </p>

          </div>

        ) : isExtracted ? (

          <div className="fields-grid">

            {fields.map(
              (field, index) => {

                const confidence =
                  normalizeConfidence(
                    field.confidence
                  );

                return (
                  <div
                    key={`${field.name}-${index}`}
                    className="field-card"
                  >

                    <div className="field-top">

                      <h4>
                        {field.name}
                      </h4>

                      <span
                        className={
                          confidence >= 90
                            ? "confidence high"
                            : confidence >= 75
                            ? "confidence medium"
                            : "confidence low"
                        }
                      >
                        {confidence}%
                      </span>

                    </div>

                    <p>
                      {field.value || "Not available"}
                    </p>

                  </div>
                );
              }
            )}

          </div>

        ) : validationError ? (

          <div className="empty-state error-state">

            <div className="empty-icon">
              ⚠️
            </div>

            <h3 className="error-title">
              {validationError.title}
            </h3>

            <p className="error-desc">
              {validationError.message}
            </p>

          </div>

        ) : (

          <div className="empty-state">

            <div className="empty-icon">
              📑
            </div>

            <h3>
              No Invoice Data Yet
            </h3>

            <p>
              Upload an invoice and start OCR extraction
            </p>

          </div>

        )}

      </div>

      {/* PROPER ERROR POPUP MODAL */}
      {errorModal.isOpen && (
        <div
          className="error-modal-overlay"
          onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="error-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="error-modal-header">
              <div className="error-modal-icon">⚠️</div>
              <div className="error-modal-badge">
                {errorModal.type ? `${errorModal.type} error` : "validation error"}
              </div>
            </div>

            <h3 className="error-modal-title">
              {errorModal.title}
            </h3>

            <p className="error-modal-message">
              {errorModal.message}
            </p>

            <div className="error-modal-action-note">
              🛑 <b>Action Stopped:</b> Extraction will not proceed until a valid document is uploaded.
            </div>

            <div className="error-modal-footer">
              <button
                type="button"
                className="error-modal-btn"
                onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Got It, Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`

        * {
          box-sizing: border-box;
          font-family: Inter, sans-serif;
        }

        body {
          margin: 0;
        }

        .page-container {
          min-height: 100vh;
          display: flex;
          gap: 24px;
          padding: 40px;
          background:
            linear-gradient(
              135deg,
              #eef2ff,
              #f8fafc
            );
        }

        .upload-card {
          width: 350px;
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow:
            0 10px 25px rgba(0,0,0,0.05);
        }

        .upload-card h2 {
          margin-top: 0;
          color: #0f172a;
          text-align: center;
        }

        .upload-box {
          margin-top: 24px;
          border: 2px dashed #c7d2fe;
          border-radius: 18px;
          padding: 35px;
          text-align: center;
          background: #f8fafc;
        }

        .upload-box input {
          display: block;
          width: 100%;
          margin-top: 15px;
        }

        .file-preview {
          margin-top: 18px;
          color: #334155;
          font-weight: 600;
          word-break: break-word;
        }

        .file-size {
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
          font-weight: 400;
        }

        .file-info {
          margin-top: 16px;
          text-align: center;
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
        }

        .extract-btn {
          width: 100%;
          margin-top: 24px;
          border: none;
          padding: 16px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #8b5cf6
            );
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .extract-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .extract-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .review-panel {
          flex: 1;
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow:
            0 10px 25px rgba(0,0,0,0.05);
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 15px;
        }

        .review-header h2 {
          margin: 0;
          color: #0f172a;
        }

        .review-tag {
          background: #dbeafe;
          color: #2563eb;
          padding: 10px 16px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .fields-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(260px, 1fr)
            );
          gap: 18px;
        }

        .field-card {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px;
          background: #ffffff;
          transition: 0.3s ease;
        }

        .field-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 10px 20px rgba(0,0,0,0.05);
        }

        .field-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 12px;
        }

        .field-top h4 {
          margin: 0;
          color: #0f172a;
        }

        .field-card p {
          margin: 0;
          color: #475569;
          word-break: break-word;
        }

        .confidence {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .high {
          background: #dcfce7;
          color: #15803d;
        }

        .medium {
          background: #fef9c3;
          color: #ca8a04;
        }

        .low {
          background: #fee2e2;
          color: #dc2626;
        }

        .empty-state {
          text-align: center;
          padding: 90px 20px;
        }

        .empty-icon {
          font-size: 70px;
          margin-bottom: 18px;
        }

        .empty-state h3 {
          margin-bottom: 10px;
          color: #0f172a;
        }

        .empty-state p {
          color: #64748b;
        }

        .file-error-notice {
          margin-top: 14px;
          padding: 10px 14px;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          font-size: 13px;
          text-align: center;
          word-break: break-word;
        }

        .error-state .empty-icon {
          color: #dc2626;
        }

        .error-title {
          color: #dc2626 !important;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .error-desc {
          color: #991b1b !important;
          font-size: 14px;
          max-width: 420px;
          margin: 0 auto;
        }

        /* POPUP ERROR MODAL */
        .error-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeInOverlay 0.2s ease;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .error-modal-dialog {
          background: #ffffff;
          border-radius: 18px;
          max-width: 480px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 20px 40px -15px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.15);
          text-align: center;
          animation: popModal 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popModal {
          from {
            transform: scale(0.92) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .error-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .error-modal-icon {
          font-size: 48px;
          line-height: 1;
        }

        .error-modal-badge {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .error-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #991b1b;
          margin: 0 0 10px 0;
          text-transform: capitalize;
        }

        .error-modal-message {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 18px 0;
        }

        .error-modal-action-note {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #7f1d1d;
          text-align: left;
          margin-bottom: 22px;
          line-height: 1.4;
        }

        .error-modal-footer {
          display: flex;
          justify-content: flex-end;
        }

        .error-modal-btn {
          width: 100%;
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .error-modal-btn:hover {
          background: #b91c1c;
        }

        @media (max-width: 1000px) {

          .page-container {
            flex-direction: column;
          }

          .upload-card {
            width: 100%;
          }

        }

      `}</style>

    </div>
  );
}