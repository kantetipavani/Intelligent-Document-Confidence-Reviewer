import { useEffect, useState } from "react";

import api from "../services/api";

export default function InvoicePage() {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [isExtracted, setIsExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);


  const handleFileUpload = (e: any) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setIsExtracted(false);
    }
  };

  const handleExtract = async () => {

    setDocumentId(null);


    if (!selectedFile) {
      alert("Please upload invoice file");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // tenant_id is required by backend auth logic; derived from JWT server-side.
      formData.append("tenant_id", "default");
      formData.append("filename", selectedFile.name);
      formData.append("file", selectedFile);

      const response = await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const extraction = response.data?.extraction ?? {};

      // Backend extraction returns top-level invoice_number/vendor_name/invoice_total
      // and also may include `fields` map.
      const normalizedExtraction = (() => {
        if (extraction?.fields && typeof extraction.fields === "object") {
          return { ...extraction.fields, ...extraction };
        }
        return extraction;
      })();

      const aliasGroups = [
        ["invoice_number", "invoice_no"],
        ["vendor_name", "vendor"],
        ["invoice_total", "amount"],
      ];

      const orderedKeys = [
        "invoice_number",
        "vendor_name",
        "invoice_total",
        "date",
        "gstin",
        "status",
      ];

      const usedAliases = new Set<string>();

      const extractionKeys = [
        ...orderedKeys.filter((key) => {
          if (!Object.prototype.hasOwnProperty.call(normalizedExtraction, key)) return false;
          const aliasGroup = aliasGroups.find((group) => group.includes(key));
          if (!aliasGroup) return true;
          if (aliasGroup.some((alias) => usedAliases.has(alias))) return false;
          aliasGroup.forEach((alias) => usedAliases.add(alias));
          return true;
        }),
        ...Object.keys(normalizedExtraction).filter((key) => {
          if (key === "fields") return false;
          return !orderedKeys.includes(key) && !usedAliases.has(key);
        }),
      ];

      const extractedFields = extractionKeys.map((key) => {
        const f = (normalizedExtraction as any)?.[key];
        return {
          name: key.replace(/_/g, " ").toUpperCase(),
          value: f?.value ?? "",
          confidence: f?.confidence ?? 0,
        };
      });

      // Backend now runs extraction in background.
      setDocumentId(response.data?.document_id ?? null);

      // If backend didn't return extraction yet, spinner will show via `loading` state.


      // For backward compatibility: if backend already returned extraction, render it.
      const maybeExtraction = response.data?.extraction;
      if (maybeExtraction) {
        const normalizedExtraction = (() => {
          if (maybeExtraction?.fields && typeof maybeExtraction.fields === "object") {
            return { ...maybeExtraction.fields, ...maybeExtraction };
          }
          return maybeExtraction;
        })();

        const aliasGroups = [
          ["invoice_number", "invoice_no"],
          ["vendor_name", "vendor"],
          ["invoice_total", "amount"],
        ];

        const orderedKeys = [
          "invoice_number",
          "vendor_name",
          "invoice_total",
          "date",
          "gstin",
          "status",
        ];

        const usedAliases = new Set<string>();
        const extractionKeys = [
          ...orderedKeys.filter((key) => {
            if (!Object.prototype.hasOwnProperty.call(normalizedExtraction, key)) return false;
            const aliasGroup = aliasGroups.find((group) => group.includes(key));
            if (!aliasGroup) return true;
            if (aliasGroup.some((alias) => usedAliases.has(alias))) return false;
            aliasGroup.forEach((alias) => usedAliases.add(alias));
            return true;
          }),
          ...Object.keys(normalizedExtraction).filter((key) => {
            if (key === "fields") return false;
            return !orderedKeys.includes(key) && !usedAliases.has(key);
          }),
        ];

        const extractedFields = extractionKeys.map((key) => {
          const f = (normalizedExtraction as any)?.[key];
          return {
            name: key.replace(/_/g, " ").toUpperCase(),
            value: f?.value ?? "",
            confidence: f?.confidence ?? 0,
          };
        });

        setFields(extractedFields);
        setIsExtracted(true);
      }
    } catch (error) {

      console.error(error);
      alert("OCR Extraction Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/documents/${documentId}/status`);
        const { status: jobStatus, extraction } = response.data || {};

        if (cancelled) return;

        if (jobStatus === "ready" && extraction) {
          const normalizedExtraction = (() => {
            if (extraction?.fields && typeof extraction.fields === "object") {
              return { ...extraction.fields, ...extraction };
            }
            return extraction;
          })();

          const aliasGroups = [
            ["invoice_number", "invoice_no"],
            ["vendor_name", "vendor"],
            ["invoice_total", "amount"],
          ];

          const orderedKeys = [
            "invoice_number",
            "vendor_name",
            "invoice_total",
            "date",
            "gstin",
            "status",
          ];

          const usedAliases = new Set<string>();

          const extractionKeys = [
            ...orderedKeys.filter((key) => {
              if (!Object.prototype.hasOwnProperty.call(normalizedExtraction, key)) return false;
              const aliasGroup = aliasGroups.find((group) => group.includes(key));
              if (!aliasGroup) return true;
              if (aliasGroup.some((alias) => usedAliases.has(alias))) return false;
              aliasGroup.forEach((alias) => usedAliases.add(alias));
              return true;
            }),
            ...Object.keys(normalizedExtraction).filter((key) => {
              if (key === "fields") return false;
              return !orderedKeys.includes(key) && !usedAliases.has(key);
            }),
          ];

          const extractedFields = extractionKeys.map((key) => {
            const f = (normalizedExtraction as any)?.[key];
            return {
              name: key.replace(/_/g, " ").toUpperCase(),
              value: f?.value ?? "",
              confidence: f?.confidence ?? 0,
            };
          });

          setFields(extractedFields);
          setIsExtracted(true);
          setLoading(false);
          return;
        }

        if (jobStatus === "failed") {
          setLoading(false);
          alert("OCR Extraction Failed");
          return;
        }

        setTimeout(poll, 2000);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        console.error(err);
        setTimeout(poll, 2000);
      }
    };

    setIsExtracted(false);
    setFields([]);
    setTimeout(poll, 0);

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  return (



    <div className="page-container">

      {/* LEFT SIDE */}

      <div className="upload-card">

        <h2>
          Upload Invoice
        </h2>

        <div className="upload-box">

          <label>
            Upload file
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
            />
          </label>

          {
            selectedFile && (

              <div className="file-preview">

                📄 {selectedFile.name}

              </div>

            )
          }

        </div>

        <button
          className="extract-btn"
          onClick={handleExtract}
        >

          {
            loading
              ? "Processing..."
              : "Extract Invoice Data"
          }

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
            <div className="empty-icon">⏳</div>
            <h3>Processing invoice...</h3>
            <p>Please wait while we extract fields.</p>
          </div>
        ) : isExtracted ? (



            <div className="fields-grid">

              {
                fields.map(
                  (
                    field,
                    index
                  ) => (

                    <div
                      key={index}
                      className="field-card"
                    >

                      <div className="field-top">

                        <h4>
                          {field.name}
                        </h4>

                        <span
                          className={
                            field.confidence >= 90
                              ? "confidence high"
                              : field.confidence >= 75
                              ? "confidence medium"
                              : "confidence low"
                          }
                        >

                          {field.confidence}%

                        </span>

                      </div>

                      <p>
                        {field.value}
                      </p>

                    </div>

                  )
                )
              }

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

          )
        }

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

        /* LEFT */

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

          border:
            2px dashed #c7d2fe;

          border-radius: 18px;

          padding: 35px;

          text-align: center;

          background: #f8fafc;
        }

        .file-preview {
          margin-top: 18px;
          color: #334155;
          font-weight: 600;
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

        .extract-btn:hover {
          transform: translateY(-2px);
        }

        /* RIGHT */

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
        }

        /* FIELDS */

        .fields-grid {
          display: grid;

          grid-template-columns:
            repeat(auto-fit,minmax(260px,1fr));

          gap: 18px;
        }

        .field-card {
          border:
            1px solid #e2e8f0;

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
        }

        .field-top h4 {
          margin: 0;
          color: #0f172a;
        }

        .field-card p {
          margin: 0;
          color: #475569;
        }

        /* CONFIDENCE */

        .confidence {
          padding: 6px 12px;

          border-radius: 999px;

          font-size: 12px;

          font-weight: 700;
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

        /* EMPTY */

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

        /* MOBILE */

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