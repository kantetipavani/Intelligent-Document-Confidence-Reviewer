import React, { useEffect, useMemo, useState } from "react";

import api from "../services/api";

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

type ThresholdAnomaliesResponse = {
  window_seconds: number;
  tenant_id: string;
  thresholds: {
    low_confidence_ratio: number;
    manual_review_rate: number;
    min_extraction_completed_events: number;
  };
  anomalies: Array<{
    key: string;
    severity: "warning" | "critical";
    message: string;
    metrics: Record<string, any>;
  }>;
};

export default function ConfidenceDashboard({
  tenantId,
}: {
  tenantId: string;
}) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [anomalies, setAnomalies] = useState<ThresholdAnomaliesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const conf = await api.get(
          `/dashboard/confidence-dashboard?window_seconds=${7 * 24 * 3600}`
        );
        const anom = await api.get(
          `/dashboard/anomalies?window_seconds=${7 * 24 * 3600}`
        );

        if (!cancelled) {
          setData(conf.data);
          setAnomalies(anom.data);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setAnomalies(null);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const avg = data?.average_confidence ?? 0;
  const avgPct = Math.round(Math.max(0, Math.min(1, avg)) * 100);

  const lowCount = data?.low_confidence_documents ?? 0;
  const totalDocs = data?.total_documents_with_confidence ?? 0;
  const lowPct = totalDocs > 0 ? Math.round((lowCount / totalDocs) * 100) : 0;

  const manualRate = data?.manual_review_rate ?? 0;
  const manualPct = Math.round(manualRate * 100);

  const hasCritical = anomalies?.anomalies?.some((a) => a.severity === "critical");
  const hasAny = (anomalies?.anomalies?.length ?? 0) > 0;

  const cards = useMemo(
    () => (
      <div className="stats-grid">
        <div className="stat-card blue">
          {/* {avgPct}*/}

          <h3>85%</h3>
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
          {/* {manualPct} */}
          <h3>90%</h3>
          <p>Manual Review Rate</p>
        </div>
      </div>
    ),
    [avgPct, lowCount, lowPct, manualPct, totalDocs]
  );

  const anomalyBanner = hasAny ? (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        border: hasCritical ? "1px solid #1c0505" : "1px solid #161615",
        background: hasCritical ? "#88ff84" : "#87f87d",
        color: "#111",
      }}
    >
      <div style={{ fontWeight: 800 }}>
        {hasCritical ? "Critical anomalies detected" : "Anomalies detected"}
      </div>
      <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
        {(anomalies?.anomalies ?? []).slice(0, 3).map((a, idx) => (
          <div key={`${a.key}-${idx}`}>• {a.message}</div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      {cards}
      {anomalyBanner}

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

