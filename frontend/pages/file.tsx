import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { useExtractionFieldsFromWebSocket } from "../hooks/useExtractionFieldsFromWebSocket";

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

  /*
   * FILE VALIDATION
   *
   * This validation happens BEFORE extraction.
   *
   * Invalid files:
   * - empty
   * - larger than 10 MB
   * - unsupported extension
   * - unsupported MIME type
   *
   * are rejected immediately.
   */
  const validateFile = (file: File): boolean => {
    // 1. Empty file
    if (file.size === 0) {
      setFileError("empty file not processing");
      alert(
        "empty file not processing"
      );
      return false;
    }

    // 2. Maximum size
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size should not exceed 10MB.");
      alert(
        "File size should not exceed 10MB."
      );
      return false;
    }

    // 3. Extension
    const fileName = file.name.toLowerCase().trim();

    const hasValidExtension = ALLOWED_EXTENSIONS.some(
      (extension) => fileName.endsWith(extension)
    );

    if (!hasValidExtension) {
      setFileError("Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.");
      alert(
        "Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file."
      );
      return false;
    }

    // 4. MIME type
    //
    // Some browsers provide an empty MIME type.
    // Empty MIME type is therefore allowed.
    if (
      file.type &&
      !ALLOWED_FILE_TYPES.includes(file.type)
    ) {
      setFileError("Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.");
      alert(
        "Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file."
      );
      return false;
    }

    setFileError(null);
    return true;
  };

  /*
   * FILE UPLOAD
   *
   * Validation happens here immediately.
   * Invalid files never become selected files.
   */
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    // Reset old extraction data
    setSelectedFile(null);
    setIsExtracted(false);
    setFields([]);
    setDocumentId(null);
    setFileError(null);

    if (!file) {
      return;
    }

    // IMPORTANT:
    // Validate BEFORE accepting the file.
    if (!validateFile(file)) {
      e.target.value = "";
      return;
    }

    // Valid file
    setFileError(null);
    setSelectedFile(file);
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

    // Extra validation before API call
    if (!validateFile(selectedFile)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
      setIsExtracted(false);
      setFields([]);
      setDocumentId(null);
      return;
    }

    setIsExtracted(false);
    setFields([]);
    setDocumentId(null);
    setLoading(true);
    setFileError(null);

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

      const backendMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message;

      const isMemoryOrEmpty = backendMessage && typeof backendMessage === "string" && backendMessage.toLowerCase().includes("empty");
      if (isMemoryOrEmpty) {
        setFileError("empty file not processing");
        alert("empty file not processing");
      } else if (backendMessage) {
        setFileError(String(backendMessage));
        alert(String(backendMessage));
      } else if (error?.message) {
        setFileError(`OCR Extraction Failed: ${error.message}`);
        alert(
          `OCR Extraction Failed: ${error.message}`
        );
      } else {
        setFileError("OCR Extraction Failed. Please try again.");
        alert(
          "OCR Extraction Failed. Please try again."
        );
      }

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

      <div className="upload-card">

        <h2>
          Upload Invoice
          <br />
          (maximum file size: 10MB)
        </h2>

        <div className="upload-box">

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

          {fileError && (
            <div className="file-error-notice">
              ⚠️ <b>{fileError}</b>
            </div>
          )}

          {selectedFile && !fileError && (
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
          disabled={loading || !selectedFile}
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

        ) : fileError ? (

          <div className="empty-state error-state">

            <div className="empty-icon">
              ⚠️
            </div>

            <h3 className="error-title">
              empty file not processing
            </h3>

            <p className="error-desc">
              The uploaded file is empty (0 bytes) and cannot be processed. Please upload an invoice file with content.
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