import React, { useMemo } from "react";

type DashboardResponse = {
  window_seconds: number;
  tenant_id: string;
  average_confidence: number;
  low_confidence_documents: number;
  total_documents_with_confidence: number;
  manual_review_rate: number;
  manual_reviews: number;
  total_reviews: number;
};

export default function ConfidenceDashboard({
  data,
}: {
  data: DashboardResponse | null | undefined;
}) {
  const avg = data?.average_confidence ?? 0;
  const avgPct = Math.round(Math.max(0, Math.min(1, avg)) * 100);

  const lowCount = data?.low_confidence_documents ?? 0;
  const totalDocs = data?.total_documents_with_confidence ?? 0;
  const lowPct = totalDocs > 0 ? Math.round((lowCount / totalDocs) * 100) : 0;

  const manualRate = data?.manual_review_rate ?? 0;
  const manualPct = Math.round(manualRate * 100);

  const cards = useMemo(
    () => (
      <div className="stats-grid">
        <div className="stat-card blue">
          <h3>{avgPct}%</h3>
          <p>Average Confidence</p>
        </div>
        <div className="stat-card purple">
          <h3>
            {lowCount}
            {totalDocs > 0 ? ` (${lowPct}%)` : ""}
          </h3>
          <p>Low-Confidence Docs</p>
        </div>
        <div className="stat-card orange">
          <h3>{manualPct}%</h3>
          <p>Manual Review Rate</p>
        </div>
      </div>
    ),
    [avgPct, lowCount, lowPct, manualPct, totalDocs]
  );

  return (
    <>
      {cards}
      <div className="mt-6" />
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-600 font-semibold">
          Confidence window: {data?.window_seconds ?? "-"} seconds
        </div>
        <div className="text-sm text-gray-700 mt-1">
          Tenant: {data?.tenant_id ?? "-"}
        </div>
      </div>
    </>
  );
}

