import { useState } from "react";

export default function InvoicePage() {

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [fields, setFields] =
    useState([]);

  const [isExtracted, setIsExtracted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleFileUpload = (e) => {

    if (e.target.files?.[0]) {

      setSelectedFile(
        e.target.files[0]
      );

      setIsExtracted(false);

    }

  };

  const handleExtract = async () => {

    if (!selectedFile) {

      alert(
        "Please upload invoice file"
      );

      return;

    }

    setLoading(true);

    setTimeout(() => {

      setFields([

        {
          name: "INVOICE_NO",
          value: "INV-2026-001",
          confidence: 98,
        },

        {
          name: "DATE",
          value: "26-May-2026",
          confidence: 95,
        },

        {
          name: "GSTIN",
          value: "27AAAPL1234C1ZV",
          confidence: 92,
        },

        {
          name: "VENDOR",
          value: "Acme Supplies Pvt. Ltd.",
          confidence: 96,
        },

        {
          name: "AMOUNT",
          value: "$12,500",
          confidence: 94,
        },

        {
          name: "STATUS",
          value: "APPROVED",
          confidence: 89,
        },
      ]);

      setLoading(false);

    }, 2000);

  };

  return (

    <div className="page-container">

      {/* LEFT SIDE */}

      <div className="upload-card">

        <h2>
          Upload Invoice
        </h2>

        <div className="upload-box">

          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
          />

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

        {
          isExtracted ? (

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