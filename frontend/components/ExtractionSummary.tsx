import React from "react";

type ExtractedField = {
  name: string;
  value: string;
  confidence: number;
};

type ExtractionSummaryProps = {
  isExtracted: boolean;
  fields: ExtractedField[];
};

function getConfidenceTier(confidence: number) {
  // Existing dashboard used 0..1-ish then multiplied by 100.
  // Keep current behavior to avoid UI mismatch.
  const raw = Number(confidence ?? 0);
  const percent = Math.max(
    0,
    Math.min(100, Math.round(raw * 100))
  );

  if (percent >= 80) return "confidence high";
  if (percent >= 60) return "confidence medium";
  return "confidence low";
}

export default function ExtractionSummary({
  isExtracted,
  fields,
}: ExtractionSummaryProps) {
  return (
    <div className="review-panel">
      <div className="review-header">
        <h2>Extracted Invoice Fields</h2>
        <span className="review-tag">AI Generated</span>
      </div>

      {isExtracted ? (
        <div className="fields-grid">
          {fields.map((field, index) => (
            <div key={index} className="field-card">
              <div className="field-top">
                <h4>{field.name}</h4>
                <span className={getConfidenceTier(field.confidence)}>
                  {Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(Number(field?.confidence ?? 0) * 100)
                    )
                  )}%
                </span>
              </div>
              <p>{field.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📑</div>
          <h3>No Invoice Data Yet</h3>
          <p>Upload invoice and start OCR extraction</p>
        </div>
      )}
    </div>
  );
}

