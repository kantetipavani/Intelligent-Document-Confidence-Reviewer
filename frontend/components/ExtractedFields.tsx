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
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
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
          border-bottom: 1px solid #e2e8f0;
        }

        .fields-table th {
          background: #f8fafc;
          color: #334155;
          font-size: 13px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .fields-table tbody tr:nth-child(even) {
          background: #fafbff;
        }

        .fields-table input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          font-size: 14px;
        }

        .confidence-high {
          background: #dcfce7;
          color: #166534;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }

        .confidence-medium {
          background: #fef9c3;
          color: #92400e;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }

        .confidence-low {
          background: #fee2e2;
          color: #991b1b;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 700;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}

