import { useEffect, useState } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import Layout from "../components/layout";
import api from "../services/api";

import ExtractedFields from "../components/ExtractedFields";
import { useExtractionFieldsFromWebSocket } from "../hooks/useExtractionFieldsFromWebSocket";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [fields, setFields] = useState<any[]>([]);

  const [isExtracted, setIsExtracted] = useState(false);

  const [loading, setLoading] = useState(false);

  const [activityLoading, setActivityLoading] = useState(false);

  const [activity, setActivity] = useState<any[]>([]);

  const [selectedActivityIndex, setSelectedActivityIndex] = useState<
    number | null
  >(null);

  const [activityError, setActivityError] = useState<string | null>(null);

  const userEmail =
    typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  /* FILE SELECT */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setIsExtracted(false);
    }
  };

  /* OCR EXTRACTION */
  const [documentIdForWs, setDocumentIdForWs] = useState<string | null>(
    null,
  );

  const tokenFromStorage = token;

  const {
    connected: wsConnected,
    fields: wsFields,
    isReady: wsReady,
    error: wsError,
  } = useExtractionFieldsFromWebSocket({
    documentId: documentIdForWs,
    token: tokenFromStorage,
    enabled: !!documentIdForWs,
  });

  useEffect(() => {
    if (wsError) {
      alert(`WebSocket error: ${wsError}`);
      setLoading(false);
      return;
    }

    if (wsReady && wsFields.length) {
      setFields(wsFields);
      setIsExtracted(true);
      setLoading(false);
    }
  }, [wsReady, wsFields, wsError]);

  const handleExtract = async () => {
    if (!selectedFile) {
      alert("Please upload PDF / DOC / TXT file");
      return;
    }

    setIsExtracted(false);
    setFields([]);
    setLoading(true);
    setDocumentIdForWs(null);

    try {
      const formData = new FormData();

      // Backend requires tenant_id and filename as form fields.
      formData.append("tenant_id", "default");
      formData.append("filename", selectedFile.name);
      if (userEmail) {
        formData.append("user_email", userEmail);
      }
      formData.append("file", selectedFile);

      const response = await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const documentId = response.data?.document_id ?? null;
      if (!documentId) {
        throw new Error("document_id missing from upload response");
      }

      // WebSocket-first: backend sends `document_status` with `extraction` when ready.
      setDocumentIdForWs(documentId);
    } catch (error) {
      console.error("OCR Extraction Failed:", error);

      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      const msg =
        data && (data.detail || data.message)
          ? data.detail || data.message
          : typeof data === "string"
            ? data
            : null;

      alert(
        `OCR Extraction Failed${status ? ` (HTTP ${status})` : ""}${msg ? `: ${msg}` : ""}`,
      );

      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const email = localStorage.getItem("userEmail");

    try {
      await api.post("/auth/logout", { email });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("token");
      alert("Logout Successfully");
      window.location.href = "/login";
    }
  };

  const formatActivityDate = (createdAt: string) => {
    if (!createdAt) return "";

    const utcDate =
      createdAt.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(createdAt)
        ? createdAt
        : `${createdAt}Z`;

    return new Date(utcDate).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  };

  const activityQuery = useQuery({
    queryKey: ["activity", userEmail, "by-email"],
    enabled: activePage === "info" && !!userEmail,
    queryFn: async () => {
      const res = await api.get(`/activity/by-email/${userEmail}`);
      return res.data || [];
    },
  });

  const activityData = activityQuery.data || [];

  const activityErrorMsg = (activityQuery.error as any)?.response?.data
    ?.detail
    ? String((activityQuery.error as any)?.response?.data?.detail)
    : activityQuery.error
      ? String(activityQuery.error)
      : null;

  const activityLoadingState =
    activityQuery.isLoading || activityQuery.isFetching;

  return (
    <Layout>
      <div className="dashboard-wrapper">
        {/* SIDEBAR */}
        <aside className="sidebar" aria-label="Sidebar navigation">
          <div className="logo-section">
            <div className="logo-circle">AI</div>
            <div>
              <h2>Invoice AI</h2>
              <p>Smart OCR System</p>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="sidebar-nav">
            <button
              className={
                activePage === "dashboard" ? "nav-btn active" : "nav-btn"
              }
              onClick={() => setActivePage("dashboard")}
            >
              Dashboard
            </button>

            <button
              className={
                activePage === "reviewer" ? "nav-btn active" : "nav-btn"
              }
              onClick={() => setActivePage("reviewer")}
            >
              Invoice Reviewer
            </button>

            <button
              className={activePage === "info" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActivePage("info")}
            >
              INFO
            </button>
          </nav>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          {/* TOPBAR */}
          <div className="topbar">
            <div>
              <h1>Intelligent Document Reviewer</h1>
              <p>&nbsp; AI Powered Invoice Review Platform</p>
            </div>

            <div className="topbar-right">
              {/* PROFILE */}
              <div className="profile-dropdown">
                <div className="profile-trigger">
                  <div className="profile-icon">👤</div>
                </div>

                <div className="dropdown-menu">
                  <Link href="/profile">
                    <button>View Profile</button>
                  </Link>

                  <button
                    className="logout-btn"
                    onClick={handleLogout}
                    title="Logout"
                    aria-label="Logout"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DASHBOARD */}
          {activePage === "dashboard" && (
            <>
              <div className="stats-grid">
                <div className="stat-card blue">
                  <h3>100+</h3>
                  <p>Invoices Processed</p>
                </div>
                <div className="stat-card purple">
                  <h3>98%</h3>
                  <p>OCR Accuracy</p>
                </div>
                <div className="stat-card orange">
                  <h3>18 sec</h3>
                  <p>Avg Processing Time</p>
                </div>
              </div>
            </>
          )}

          {/* INFO */}
          {activePage === "info" && (
            <div className="reviewer-page">
              <div className="upload-card">
                <h2>Account & Activity</h2>

                {activityLoadingState ? (
                  <p>Loading activity...</p>
                ) : activityErrorMsg ? (
                  <p className="activity-error">{activityErrorMsg}</p>
                ) : activityData?.length ? (
                  <div className="activity-list">
                    {activityData.map((ev, idx) => (
                      <div
                        key={idx}
                        className={
                          "activity-item" +
                          (selectedActivityIndex === idx ? " selected" : "")
                        }
                        onClick={() => setSelectedActivityIndex(idx)}
                      >
                        <div className="activity-head">
                          <span className="activity-type">{ev.event_type}</span>
                          <span className="activity-date">
                            {formatActivityDate(ev.created_at)}
                          </span>
                        </div>
                        <div className="activity-payload-card">
                          <div className="activity-payload-header">
                            <span>Payload</span>
                            <span className="activity-payload-subtle">JSON</span>
                          </div>
                          <pre className="activity-payload">{
                            (() => {
                              const p = ev?.payload ?? {};

                              // Promote stack->extraction for consistent output
                              const stack = (p as any)?.stack ?? (p as any)?.data?.stack;
                              if (stack && typeof stack === "object") {
                                if ((stack as any)?.extracted) {
                                  return JSON.stringify({ extraction: (stack as any).extracted }, null, 2);
                                }
                                if ((stack as any)?.fields) {
                                  return JSON.stringify({ extraction: (stack as any).fields }, null, 2);
                                }
                                return JSON.stringify({ extraction: stack }, null, 2);
                              }

                              // If payload already has `extraction`, keep it as-is
                              return JSON.stringify(p, null, 2);
                            })()
                          }</pre>
                        </div>
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

              <div className="review-panel">
                

                <div className="extraction-panel">
                  {selectedActivityIndex !== null ? (
                    (() => {
                      const ev = activityData[selectedActivityIndex];
                      const payload = ev?.payload;

                      const safeParseJSON = (v: any) => {
                        if (typeof v !== "string") return v;
                        try {
                          return JSON.parse(v);
                        } catch {
                          return v;
                        }
                      };

                      const normalizedPayload = safeParseJSON(payload);

                      // Try multiple common shapes used by backends.
                      const candidates = [
                        // direct
                        (normalizedPayload as any)?.extraction,
                        (normalizedPayload as any)?.fields,
                        (normalizedPayload as any)?.result,
                        // nested under `data`
                        (normalizedPayload as any)?.data?.extraction,
                        (normalizedPayload as any)?.data?.fields,
                        (normalizedPayload as any)?.data?.result,
                        // sometimes the whole payload is the extracted output
                        normalizedPayload,
                      ];

                      const parsedCandidates = candidates.map((c) => safeParseJSON(c));

                      // Prefer objects containing `fields`.
                      // Detect common "stack" formatted payloads.
                      // Supported examples (tolerant):
                      // - { stack: { extracted: { ...fields } } }
                      // - { stack: { fields: { ...fields } } }
                      // - { stack: { ...fields } }
                      // - { data: { stack: ... } } (handled via parsedCandidates already)
                      const findStackFields = (root: any) => {
                        if (!root || typeof root !== "object") return undefined;
                        const stack = (root as any).stack ?? (root as any)?.data?.stack;
                        if (!stack || typeof stack !== "object") return undefined;

                        // { stack: { extracted: {...} } }
                        if (stack?.extracted && typeof stack.extracted === "object") {
                          return stack.extracted;
                        }

                        // { stack: { fields: {...} } }
                        if (stack?.fields && typeof stack.fields === "object") {
                          return stack.fields;
                        }

                        // { stack: { ...fields } }
                        // Sometimes stack itself is the fields object.
                        return stack;
                      };

                      // Prefer extracted fields coming from stack, otherwise fallback to existing shapes.
                      const stackFieldsFromAnyCandidate = parsedCandidates
                        .map((c) => findStackFields(c))
                        .find((v) => v && typeof v === "object");

                      const extractionObject =
                        (stackFieldsFromAnyCandidate ??
                          (parsedCandidates.find(
                            (c) =>
                              c && typeof c === "object" && (c as any).fields && typeof (c as any).fields === "object",
                          ) ??
                            parsedCandidates.find((c) => c && typeof c === "object") ??
                            {})) as any;

                      const extractedFieldsRaw =
                        extractionObject?.fields && typeof extractionObject.fields === "object"
                          ? extractionObject.fields
                          : extractionObject;

                      // Normalize backend shapes to what <ExtractedFields /> expects:
                      // - it looks for keys like: invoice_no|invoice_number, vendor_name|vendor, amount|invoice_total,
                      //   date, gstin, status.
                      // - values should be either a string OR { value, confidence }.
                      const normalizeToExtractedFields = (input: any) => {
                        if (!input || typeof input !== "object") return {};

                        // Also map common nested structure: { "INVOICE NO": {value, confidence}, ... }
                        // and { "INVOICE NO": { "value": ".." } } into the { value, confidence } format.


                        // If backend already returns internal keys, keep them.
                        const output: Record<string, any> = { ...input };

                        const wrapIfNeeded = (v: any) => {
                          if (v && typeof v === "object") return v;
                          return { value: v ?? "", confidence: 0 };
                        };

                        const labelMap: Record<string, string> = {
                          "INVOICE NO": "invoice_no",
                          "INVOICE_NUMBER": "invoice_no",
                          "INVOICE NO ": "invoice_no",
                          "INVOICE": "invoice_no",
                          "VENDOR": "vendor",
                          "AMOUNT": "amount",
                          "DATE": "date",
                          "GSTIN": "gstin",
                          "STATUS": "status",
                        };

                        // Convert label-style keys into internal keys (and wrap values if needed).
                        for (const [labelKey, internalKey] of Object.entries(labelMap)) {
                          // direct match
                          if (Object.prototype.hasOwnProperty.call(input, labelKey)) {
                            const v = input[labelKey];
                            output[internalKey] = wrapIfNeeded(v);
                            continue;
                          }

                          // tolerant match: trim + case-insensitive
                          const match = Object.keys(input).find(
                            (k) => k?.trim?.()?.toUpperCase?.() === labelKey.trim().toUpperCase(),
                          );
                          if (match) {
                            const v = input[match];
                            output[internalKey] = wrapIfNeeded(v);
                          }
                        }

                        return output;
                      };

                      const extractedFields = normalizeToExtractedFields(extractedFieldsRaw);

                      const extractedJson = {
                        event_type: ev?.event_type ?? null,
                        created_at: ev?.created_at ?? null,
                        extracted: extractedFieldsRaw ?? {},
                      };

                      return (
                        <>
                          {/* Left panel only: keep extracted JSON/fields within the left activity panel (no right-side JSON). */}
                          <div className="fields-section">
                            <h3 className="fields-title">Extracted Fields</h3>
                            <ExtractedFields fields={extractedFields ?? {}} />
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="empty-state selFected-extraction-empty">
                      <h3>Select an extraction event</h3>
                      <p>
                        Click an activity item (for example, "extraction_completed") to view its extracted JSON and fields.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INVOICE REVIEWER */}
          {activePage === "reviewer" && (
            <div className="reviewer-page">
              {/* LEFT */}
              <div className="upload-card">
                <h2>Upload Invoice</h2>

                <div className="upload-box">
                  <b>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                    />
                  </b>
                </div>

                <button className="extract-btn" onClick={handleExtract}>
                  {loading ? "Processing..." : "Extract Invoice Data"}
                </button>
              </div>

              {/* RIGHT */}
              <div className="review-panel">
                <div className="review-header">
                  <h2>Extracted Invoice Fields</h2>
                </div>

                {isExtracted ? (
                  <div className="fields-grid">
                    {fields.map((field, index) => (
                      <div key={index} className="field-card">
                        <div className="field-top">
                          <h4>
                            <b> {field.name} </b>
                          </h4>

                          <span
                            className={
                              (() => {
                                const raw = Number(field?.confidence ?? 0);
                                const percent = Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Math.round(raw * 100),
                                  ),
                                );

                                return percent >= 80
                                  ? "confidence high"
                                  : percent >= 60
                                    ? "confidence medium"
                                    : "confidence low";
                              })()
                            }
                          >
                            {Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  Number(field?.confidence ?? 0) * 100,
                                ),
                              ),
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
            </div>
          )}
        </main>

        <style jsx>{`
          * {
            box-sizing: border-box;
            font-family: Inter, sans-serif;
          }
          body {
            margin: 0;
          }
          .dashboard-wrapper {
            display: flex;
            min-height: 100vh;
            background: #f5f5f5;
          }
          .sidebar {
            width: 300px;
            background: #000;
            padding: 28px;
            display: flex;
            flex-direction: column;
            border-right: 1px solid #222;
            box-shadow: none;
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo-circle {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #fff;
            color: #000;
            font-weight: 800;
            font-size: 24px;
            box-shadow: none;
            margin-bottom: 20px;
          }
          .logo-section h2 {
            margin: 0;
            color: white;
          }
          .logo-section p {
            line-height: 1.2;
            margin-top: 2px;
            color: rgba(255, 255, 255, 0.8);
          }
          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .nav-btn {
            border: 1px solid #ddd;
            padding: 14px;
            border-radius: 10px;
            background: #000;
            color: #fff;
            font-weight: 700;
            transition: all 0.3s ease;
            box-shadow: none;
          }
          .nav-btn.active {
            background: #fff;
            color: #000;
            border: 1px solid #555;
            box-shadow: none;
          }
          .main-content {
            flex: 1;
            padding: 32px;
            min-height: 100vh;
            background: #f8f8f8;
          }
          .topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
          }
          .topbar h1 {
            color: #000;
            font-size: 38px;
            font-weight: 700;
          }
          .topbar p {
            color: #130808;
            font-size: 20px;
            font-weight: 500;
            margin-top: 6px;
          }
          .topbar-right {
            display: flex;
            align-items: center;
            gap: 18px;
          }
          .profile-dropdown {
            position: relative;
          }
          .profile-trigger {
            background: #fff;
            border: 1px solid #ddd;
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: none;
          }
          .profile-icon {
            font-size: 20px;
          }
          .dropdown-menu {
            position: absolute;
            top: 70px;
            right: 0;
            width: 220px;
            background: white;
            border-radius: 18px;
            padding: 12px;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
            opacity: 0;
            visibility: hidden;
            transition: 0.3s ease;
          }
          .profile-dropdown:hover .dropdown-menu {
            opacity: 1;
            visibility: visible;
          }
          .dropdown-menu button {
            width: 100%;
            border: none;
            background: transparent;
            padding: 14px;
            border-radius: 12px;
            text-align: left;
            cursor: pointer;
          }
          .dropdown-menu button:hover {
            background: #f8fafc;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .stat-card {
            background: #fff;
            border: 1px solid #fff;
            border-radius: 12px;
            padding: 20px;
            box-shadow: none;
            transition: all 0.3s ease;
          }
          .stat-card h3 {
            font-size: 54px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #fff;
          }
          .stat-card p {
            color: #fff;
          }
          .blue,
          .purple,
          .orange {
            background: rgba(11, 1, 1, 0.95);
          }
          .reviewer-page {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 24px;
          }
          .upload-card,
          .review-panel {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 12px;
            padding: 30px;
            box-shadow: none;
          }
          .upload-box {
            margin-top: 24px;
            padding: 40px;
            border: 2px dashed #999;
            border-radius: 12px;
            text-align: center;
            background: #fafafa;
          }
          .extract-btn {
            width: 100%;
            margin-top: 24px;
            border: none;
            padding: 18px;
            border-radius: 10px;
            background: #000;
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: none;
          }
          .extract-btn:hover {
            background: #222;
            transform: none;
          }
          .fields-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 18px;
          }
          .field-card {
            background: #fff;
            border-radius: 12px;
            border: 1px solid #ddd;
            padding: 22px;
            box-shadow: none;
          }
          .field-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.08);
          }
          .field-top {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .empty-state {
            text-align: center;
            padding: 80px 20px;
          }
          .empty-icon {
            font-size: 70px;
          }

          .activity-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .activity-item {
            border: 1px solid #e5e7eb;
            background: #fff;
            border-radius: 14px;
            padding: 14px;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          }

          .activity-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(0, 0, 0, 0.06);
            border-color: #d1d5db;
          }

          .activity-item.selected {
            border-color: rgba(99, 102, 241, 0.8);
            box-shadow: 0 12px 26px rgba(99, 102, 241, 0.14);
          }

          .activity-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
          }

          .activity-type {
            font-weight: 800;
            color: #111827;
            font-size: 13px;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }

          .activity-date {
            color: rgba(17, 24, 39, 0.7);
            font-size: 12.5px;
            font-weight: 600;
          }

          .activity-payload-card {
            background: rgba(15, 23, 42, 0.03);
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 14px;
            padding: 12px;
          }

          .activity-payload-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 0 4px;
          }

          .activity-payload-header > span:first-child {
            font-weight: 800;
            font-size: 12.5px;
            color: #111827;
          }

          .activity-payload-subtle {
            font-weight: 800;
            font-size: 11px;
            letter-spacing: 0.04em;
            color: rgba(17, 24, 39, 0.65);
            background: rgba(99, 102, 241, 0.12);
            padding: 6px 10px;
            border-radius: 999px;
          }

          .activity-payload {
            margin: 0;
            padding: 12px;
            border-radius: 12px;
            background: #0b1220;
            color: #e5e7eb;
            font-size: 12.5px;
            line-height: 1.55;
            white-space: pre-wrap;
            word-break: break-word;
            overflow: auto;
            max-height: 240px;
            border: 1px solid rgba(148, 163, 184, 0.16);
          }

          .activity-payload::selection {
            background: rgba(99, 102, 241, 0.45);
          }

          @media (max-width: 1000px) {
            .dashboard-wrapper {
              flex-direction: column;
            }
            .sidebar {
              width: 100%;
            }
            .reviewer-page {
              grid-template-columns: 1fr;
            }
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}

