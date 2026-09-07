import React from "react";
import ExtractedFields from "./ExtractedFields";

type ActivityEvent = {
  event_type: string;
  created_at: string;
  payload: any;
};

type DocumentListProps = {
  userEmail: string | null;
  activityLoading: boolean;
  activityError: string | null;
  activity: ActivityEvent[];
  selectedActivityIndex: number | null;
  onSelectActivityIndex: (idx: number) => void;
};

function formatActivityDate(createdAt: string) {
  if (!createdAt) return "";

  const utcDate =
    createdAt.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(createdAt)
      ? createdAt
      : `${createdAt}Z`;

  return new Date(utcDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

function getExtractionFromActivity(event: ActivityEvent | undefined) {
  if (!event) {
    return {};
  }

  const extraction = event.payload?.extraction ?? event.payload;

  if (
    extraction?.fields &&
    typeof extraction.fields === "object" &&
    !Array.isArray(extraction.fields)
  ) {
    const normalized = {
      ...extraction.fields,
    };

    Object.keys(extraction).forEach((key) => {
      if (
        key === "fields" ||
        Object.prototype.hasOwnProperty.call(normalized, key)
      ) {
        return;
      }

      normalized[key] = extraction[key];
    });

    return normalized;
  }

  return extraction || {};
}

export default function DocumentList({
  userEmail,
  activityLoading,
  activityError,
  activity,
  selectedActivityIndex,
  onSelectActivityIndex,
}: DocumentListProps) {
  const selectedActivity =
    selectedActivityIndex !== null
      ? activity[selectedActivityIndex]
      : undefined;

  const extractedFields = getExtractionFromActivity(selectedActivity);

  return (
    <div className="reviewer-page">
      {/* ================================================================
          LEFT PANEL - ACCOUNT & ACTIVITY
          ================================================================ */}
      <div className="upload-card">
        <h2>Account & Activity</h2>

        <p className="activity-subtitle">
          User: <b>{userEmail || "Unknown"}</b>
        </p>

        {activityLoading ? (
          <p>Loading activity...</p>
        ) : activityError ? (
          <p className="activity-error">{activityError}</p>
        ) : activity?.length ? (
          <div className="activity-list">
            {activity.map((ev, idx) => (
              <div
                key={`${ev.event_type}-${ev.created_at}-${idx}`}
                className={
                  "activity-item" +
                  (selectedActivityIndex === idx ? " selected" : "")
                }
                onClick={() => onSelectActivityIndex(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectActivityIndex(idx);
                  }
                }}
              >
                <div className="activity-head">
                  <span className="activity-type">
                    {ev.event_type}
                  </span>

                  <span className="activity-date">
                    {formatActivityDate(ev.created_at)}
                  </span>
                </div>

                <pre className="activity-payload">
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>

            <h3>No activity yet</h3>

            <p>
              Login, change password, upload invoices, and approve/retrieve
              actions to see details.
            </p>
          </div>
        )}
      </div>

      {/* ================================================================
          RIGHT PANEL - EXTRACTED FIELDS
          ================================================================ */}
      <div className="review-panel">
        <div className="review-header">
          <h2>Extracted Fields</h2>

          <span className="review-tag">
            From retrieval events
          </span>
        </div>

        <div className="extraction-panel">
          {selectedActivityIndex !== null ? (
            <ExtractedFields fields={extractedFields} />
          ) : (
            <div className="empty-state selected-extraction-empty">
              <h3>Select an extraction event</h3>

              <p>
                Click an activity item (for example,
                "extraction_completed") to view its extracted fields here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}