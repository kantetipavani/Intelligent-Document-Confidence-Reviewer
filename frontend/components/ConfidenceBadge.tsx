interface Field {
  name: string;
  value: string;
  confidence: number;
}

interface Props {
  fields: Field[];
}

export default function ExtractedFields({
  fields,
}: Props) {
  return (
    <div className="fields-wrapper">
      {fields.map((field, index) => {
        const raw = Number(field?.confidence ?? 0);
        // confidence is stored as 0..1; UI should show integer percent (no decimals)
        const percent = Math.max(0, Math.min(100, Math.round(raw * 100)));

        const tier =
          percent > 80 ? "high" : percent > 60 ? "medium" : "low";

        return (
          <div key={index} className="field-card">
            <div className="field-top">
              <h4>{field.name}</h4>

              <span className={tier}>
                {percent}%
              </span>
            </div>

            <p>{field.value}</p>
          </div>
        );
      })}

      <style jsx>{`
        .fields-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field-card {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          background: #f9fafb;
        }

        .field-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .field-top h4 {
          margin: 0;
          font-size: 15px;
          color: #111827;
        }

        .field-card p {
          margin-top: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .high {
          color: green;
          font-weight: bold;
        }

        .medium {
          color: orange;
          font-weight: bold;
        }

        .low {
          color: red;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

