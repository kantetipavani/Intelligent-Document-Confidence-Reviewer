type Props = {
  fields: any;
  onUpdate?: (
    field: string,
    value: string
  ) => void;
};

export default function ExtractedFields({
  fields,
  onUpdate,
}: Props) {
  if (!fields || typeof fields !== "object") {
    return <p>No extracted fields available.</p>;
  }

  // Render only these fields in the requested order and labels.
  const desiredFields = [
    { keys: ["invoice_number", "invoice_no"], label: "INVOICE_NO" },
    { keys: ["date"], label: "DATE" },
    { keys: ["gstin"], label: "GSTIN" },
    { keys: ["vendor_name", "vendor"], label: "VENDOR" },
    { keys: ["invoice_total", "amount"], label: "AMOUNT" },
    { keys: ["status"], label: "STATUS" },
  ];

  const findField = (keys: string[]) => {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        return { key, value: fields[key] };
      }
    }
    return { key: keys[0], value: { value: "", confidence: 0 } };
  };

  const remainingKeys = Object.keys(fields).filter((key) => {
    if (key === "fields") return false;

    return !desiredFields.some((field) => field.keys.includes(key));
  });

  const formatValue = (field: any) => {
    if (field == null) return "";
    if (typeof field === "object") {
      if (field.value !== undefined && field.confidence !== undefined) {
        return String(field.value ?? "");
      }
      return JSON.stringify(field, null, 2);
    }
    return String(field);
  };

  const getConfidencePercent = (field: any) => {
    const raw = Number(field?.confidence ?? 0);

    // Support both formats:
    //  - 0..1 (typical model output)
    //  - 0..100 (some pipelines already scale)
    const percent = raw <= 1 ? raw * 100 : raw;

    return Math.max(0, Math.min(100, Math.round(percent)));
  };

  return (
    <div className="fields-container">
      <table className="fields-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Confidence</th>
          </tr>
        </thead>

        <tbody>
          {desiredFields.map((f) => {
            const { key, value: field } = findField(f.keys);
            const percent = getConfidencePercent(field);
            const tier = percent >= 90 ? "high" : percent >= 60 ? "medium" : "low";

            return (
              <tr key={f.label}>
                <td>{f.label}</td>

                <td>
                  <label style={{ display: "none" }}>{f.label}</label>
                  <input
                    type="text"
                    value={formatValue(field)}
                    placeholder={f.label}
                    onChange={(e) => onUpdate?.(key, e.target.value)}
                  />
                </td>

                <td>
                  <span className={`confidence-${tier}`}>{percent}%</span>
                </td>
              </tr>
            );
          })}

          {remainingKeys.map((key) => {
            const field = fields[key];
            const percent = getConfidencePercent(field);
            const tier = percent >= 90 ? "high" : percent >= 60 ? "medium" : "low";

            return (
              <tr key={key}>
                <td>{String(key).replace(/_/g, " ").toUpperCase()}</td>
                <td>{formatValue(field)}</td>
                <td>
                  <span className={`confidence-${tier}`}>{percent}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
        .fields-container {
          overflow-x: auto;
          width: 100%;
        }

        .fields-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 420px;
        }

        .fields-table th,
        .fields-table td {
          text-align: left;
          padding: 14px 16px;
          border-bottom: 1px solid var(--bb-border);
        }

        .fields-table th {
          background: rgba(15, 23, 42, 0.04);
          color: var(--bb-text-muted);
          font-size: 13px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .fields-table tbody tr:nth-child(even) {
          background: rgba(99, 102, 241, 0.04);
        }

        .fields-table input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          border-radius: 12px;
          background: var(--bb-surface);
          color: var(--bb-text);
          font-size: 14px;
          outline: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .fields-table input:focus {
          border-color: rgba(99, 102, 241, 0.85);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }

        .confidence-high {
          background: rgba(34, 197, 94, 0.16);
          color: #16a34a;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }

        .confidence-medium {
          background: rgba(245, 158, 11, 0.16);
          color: #ca8a04;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }

        .confidence-low {
          background: rgba(239, 68, 68, 0.14);
          color: #dc2626;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }

      `}</style>
    </div>
  );
}

