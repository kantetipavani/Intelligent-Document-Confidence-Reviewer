import { useEffect, useState } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import Layout from "../components/layout";
import api from "../services/api";

import ExtractedFields from "../components/ExtractedFields";
import { useExtractionFieldsFromWebSocket } from "../hooks/useExtractionFieldsFromWebSocket";
import ConfidenceDashboard from "../components/ConfidenceDashboard";

export default function Dashboard() {

  const [activePage, setActivePage] =
    useState("dashboard");



  const [selectedFile, setSelectedFile] =
    useState(null);

  const [fields, setFields] =
    useState([]);

  const [isExtracted, setIsExtracted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [activityLoading, setActivityLoading] =
    useState(false);

  const [activity, setActivity] =
    useState([]);

  const [selectedActivityIndex, setSelectedActivityIndex] =
    useState<number | null>(null);

  const [activityError, setActivityError] =
    useState<string | null>(null);

  const [activeCategory, setActiveCategory] =
    useState<string>("all");

  const ACCOUNT_EVENTS = new Set(["login", "logout", "change_password", "reset_password"]);
  const ACTIVITY_EVENTS = new Set(["document_uploaded", "document_retrieved", "extraction_completed", "extraction_retrieved", "review_approved"]);

  const getEventCategory = (eventType: string) => {
    if (ACCOUNT_EVENTS.has(eventType)) return "account";
    if (ACTIVITY_EVENTS.has(eventType)) return "activity";
    return "other";
  };

  const getEventBadgeClass = (eventType: string) => {
    if (ACCOUNT_EVENTS.has(eventType)) return "badge badge-account";
    if (ACTIVITY_EVENTS.has(eventType)) return "badge badge-activity";
    return "badge badge-other";
  };

  const getFilteredActivityData = () => {
    if (activeCategory === "all") return activityData;
    if (activeCategory === "account") return activityData.filter((ev: any) => ACCOUNT_EVENTS.has(ev.event_type));
    if (activeCategory === "activity") return activityData.filter((ev: any) => ACTIVITY_EVENTS.has(ev.event_type));
    return activityData;
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSelectedActivityIndex(null);
  };

  const userEmail =
    typeof window !== "undefined"
      ? localStorage.getItem("userEmail")
      : null;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;


  /* FILE SELECT */

  const handleFileUpload = (e) => {

    if (e.target.files?.[0]) {

      setSelectedFile(
        e.target.files[0]
      );

      setIsExtracted(false);

    }

  };

  /* OCR EXTRACTION */

  const [documentIdForWs, setDocumentIdForWs] = useState<string | null>(null);

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

      const response = await api.post(
        "/documents/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const documentId = response.data?.document_id ?? null;
      setDocumentIdForWs(documentId);

      // If backend returned extraction synchronously, wsReady will likely still resolve,
      // but we intentionally keep WS as the single source of truth for completion.
      // (No inline polling/promise here.)
      if (!documentId) {
        throw new Error("document_id missing from upload response");
      }
    } catch (error) {
      console.error("OCR Extraction Failed:", error);

      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      const msg =
        (data && (data.detail || data.message))
          ? data.detail || data.message
          : typeof data === "string"
            ? data
            : null;

      alert(
        `OCR Extraction Failed${status ? ` (HTTP ${status})` : ""}${msg ? `: ${msg}` : ""}`
      );

      setLoading(false);
    }
  };


  const handleLogout = async () => {
    const email =
      localStorage.getItem("userEmail");

    try {
      await api.post(
        "/auth/logout",
        { email }
      );
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("token");
      alert(
        "Logout Successfully"
      );
      window.location.href = "/login";
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    invoice_no: "INVOICE_NO",
    date: "DATE",
    gstin: "GSTIN",
    vendor: "VENDOR",
    amount: "AMOUNT",
    status: "STATUS",
  };

  const extractFieldsFromPayload = (payload: any): Record<string, { value: string; confidence: number }> | null => {
    if (!payload || typeof payload !== "object") return null;

    const safeParseJSON = (v: any) => {
      if (typeof v !== "string") return v;
      try { return JSON.parse(v); } catch { return v; }
    };

    const normalized = safeParseJSON(payload);
    const extraction = safeParseJSON(normalized?.extraction);
    const extractionFields = extraction?.fields;
    const topFields = safeParseJSON(normalized?.fields);

    // Look for fields in various payload shapes
    const candidates = [
      extractionFields,
      topFields,
      extraction,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (typeof candidate !== "object") continue;
      // Check if this has invoice_no or similar known keys
      const knownKeys = ["invoice_no", "date", "gstin", "vendor", "amount", "status"];
      for (const key of knownKeys) {
        if (candidate[key] && typeof candidate[key] === "object" && ("value" in candidate[key] || "confidence" in candidate[key])) {
          // This is a fields map like { invoice_no: {value, confidence}, ... }
          const result: Record<string, { value: string; confidence: number }> = {};
          for (const k of knownKeys) {
            if (candidate[k] && typeof candidate[k] === "object") {
              result[k] = {
                value: candidate[k].value ?? "",
                confidence: candidate[k].confidence ?? 0,
              };
            }
          }
          return Object.keys(result).length > 0 ? result : null;
        }
      }
    }
    return null;
  };

  const formatActivityDate = (createdAt: string) => {
    if (!createdAt) return "";

    const utcDate =
      createdAt.endsWith("Z") ||
      /[+-]\d{2}:\d{2}$/.test(createdAt)
        ? createdAt
        : `${createdAt}Z`;

    return new Date(utcDate).toLocaleString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
      }
    );
  };

  const activityQuery = useQuery({
    queryKey: ["activity", userEmail, "by-email"],
    enabled: activePage === "info" && !!userEmail,
    queryFn: async () => {
      const res = await api.get(
        `/activity/by-email/${userEmail}`
      );
      return res.data || [];
    },
  });

  // Keep existing state variables to minimize JSX churn
  // (until we fully decompose reviewer pane in later steps).
  const activityData =
    activityQuery.data || [];

  const activityErrorMsg =
    (activityQuery.error as any)?.response?.data
      ?.detail || activityQuery.error
      ? String(
          (activityQuery.error as any)?.response?.data?.detail ??
            activityQuery.error
        )
      : null;

  const activityLoadingState =
    activityQuery.isLoading ||
    activityQuery.isFetching;


  // WebSocket-first extraction: documentIdForWs is the subscription key.

  return (

    <Layout>


      <div className="dashboard-wrapper">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <div className="logo-section">

            <div className="logo-circle">
              AI
            </div>

            <div>

              <h2>
                Invoice AI
              </h2>

              <p>
                Smart OCR System
              </p>

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="sidebar-nav">

            <button
              className={
                activePage === "dashboard"
                  ? "nav-btn active"
                  : "nav-btn"
              }
              onClick={() =>
                setActivePage("dashboard")
              }
            >
               Dashboard
            </button>

            <button
              className={
                activePage === "reviewer"
                  ? "nav-btn active"
                  : "nav-btn"
              }
              onClick={() =>
                setActivePage("reviewer")
              }
            >
               Invoice Reviewer
            </button>

            <button
              className={
                activePage === "info"
                  ? "nav-btn active"
                  : "nav-btn"
              }
              onClick={() =>
                setActivePage("info")
              }
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

              <h1>
                Intelligent Document Reviewer 
              </h1>
             

              <p>
                &nbsp; AI Powered Invoice Review Platform
              </p>
             

            </div>

            <div className="topbar-right">

             

              {/* PROFILE */}

              <div className="profile-dropdown">

                <div className="profile-trigger">

                  <div className="profile-icon">

                   
                      👤
                    

                  </div>

                </div>

                <div className="dropdown-menu">

                  <Link href="/profile">
                    <button>
                      View Profile
                    </button>
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

          {
            activePage === "dashboard" && (
              <>
                {/* Confidence + anomaly cards */}
                <div>
                  <ConfidenceDashboard tenantId={"default"} />
                </div>
              </>
            )
          }


          {/* INFO */}

          {
            activePage === "info" && (
              <div className="reviewer-page">
                <div className="upload-card">
                  <h2><b>Account & Activity</b></h2>
                  
                  
                  {/* Category filter tabs */}
                  <div className="activity-category-tabs">
                    <button
                      className={`category-tab ${activeCategory === "all" ? "active" : ""}`}
                      onClick={() => handleCategoryChange("all")}
                    >
                      All
                    </button>
                    <button
                      className={`category-tab ${activeCategory === "account" ? "active" : ""}`}
                      onClick={() => handleCategoryChange("account")}
                    >
                      Account Events
                    </button>
                    <button
                      className={`category-tab ${activeCategory === "activity" ? "active" : ""}`}
                      onClick={() => handleCategoryChange("activity")}
                    >
                      Activity Actions
                    </button>
                  </div>

                  {activityLoadingState ? (
                    <p>Loading activity...</p>
                  ) : activityErrorMsg ? (
                    <p className="activity-error">{activityErrorMsg}</p>
                  ) : getFilteredActivityData()?.length ? (
                    <div className="activity-list">
                      {getFilteredActivityData().map((ev: any, idx: number) => (
                        <div
                          key={idx}
                          className={
                            "activity-item" +
                            (selectedActivityIndex === 
                              (activeCategory === "all" ? idx : activityData.indexOf(ev))
                              ? " selected"
                              : "")
                          }
                          onClick={() => setSelectedActivityIndex(
                            activeCategory === "all" ? idx : activityData.indexOf(ev)
                          )}
                        >
                          <div className="activity-head">
                            <span>
                              <span className={getEventBadgeClass(ev.event_type)}>
                                {ev.event_type}
                              </span>
                              <span className="activity-category-label">
                                {getEventCategory(ev.event_type) === "account" ? "👤 Account" : 
                                 getEventCategory(ev.event_type) === "activity" ? "📄 Activity" : ""}
                              </span>
                            </span>
                            <span className="activity-date">
                              {formatActivityDate(ev.created_at)}
                            </span>
                          </div>
                          {/* Inline extracted fields */}
                          {(getEventCategory(ev.event_type) === "activity") && (() => {
                            const extractedFields = extractFieldsFromPayload(ev.payload);
                            if (!extractedFields) return null;
                            return (
                              <div className="activity-extracted-fields">
                                {["invoice_no", "date", "gstin", "vendor", "amount", "status"].map((key) => {
                                  const field = extractedFields[key];
                                  if (!field || !field.value) return null;
                                  const confidencePercent = Math.round((field.confidence || 0) * 100);
                                  return (
                                    <div key={key} className="extracted-field-row">
                                      <span className="extracted-field-label">{FIELD_LABELS[key]}</span>
                                      <span className="extracted-field-value">{field.value}</span>
                                      <span className={`extracted-field-confidence ${confidencePercent >= 80 ? 'high' : confidencePercent >= 60 ? 'medium' : 'low'}`}>
                                        {confidencePercent}%
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          <pre className="activity-payload">
                            {JSON.stringify(ev.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <h3>No {activeCategory === "account" ? "account events" : activeCategory === "activity" ? "activity actions" : "activity"} yet</h3>
                      <p>Login, change password, upload invoices, and approve/retrieve actions to see details.</p>
                    </div>
                  )}

                  {/* Account vs Activity summary */}
                  {activityData?.length > 0 && (
                    <div className="activity-summary">
                      <span className="summary-item">
                        <span className="badge badge-account">👤</span> Account: {activityData.filter((ev: any) => ACCOUNT_EVENTS.has(ev.event_type)).length}
                      </span>
                      <span className="summary-item">
                        <span className="badge badge-activity">📄</span> Activity: {activityData.filter((ev: any) => ACTIVITY_EVENTS.has(ev.event_type)).length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="review-panel">
                  <div className="review-header">
                    <h2>Extracted Fields</h2>
                    
                  </div>
                  <div className="extraction-panel">
                  {selectedActivityIndex !== null ? (
                        <ExtractedFields
                        fields={
                          (() => {
                            const ev = activityData[selectedActivityIndex];
                            const payload = ev?.payload;

                            // New payload shape: payload.extraction is the full ExtractionResult
                            // containing both structured fields (invoice_number, vendor_name, invoice_total)
                            // and a nested `fields` map (invoice_no, date, gstin, vendor, amount, status)
                            
                            const extraction = payload?.extraction;
                            if (!extraction) return {};

                            // The `fields` sub-dict contains the keys the UI expects
                            if (extraction.fields && typeof extraction.fields === "object") {
                              return extraction.fields;
                            }

                            // Fallback: extraction itself may have field-like keys
                            const knownKeys = ["invoice_no", "date", "gstin", "vendor", "amount", "status", "invoice_number", "vendor_name", "invoice_total"];
                            const hasKnownKey = knownKeys.some(k => Object.prototype.hasOwnProperty.call(extraction, k));
                            if (hasKnownKey) {
                              return extraction;
                            }

                            return {};
                          })()
                        }
                      />




                    ) : (
                      <div className="empty-state selFected-extraction-empty">
                        <h3>Select an extraction event</h3>
                        <p>Click an activity item (for example, "extraction_completed") to view its extracted fields here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          {/* INVOICE REVIEWER */}

          {
            activePage === "reviewer" && (
              <div className="reviewer-page">




                {/* LEFT */}

                <div className="upload-card">

                  <h2>
                    Upload Invoice
                  </h2>

                  <div className="upload-box">
                       <b>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                    />
                     </b>
                    

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

                {/* RIGHT */}

                <div className="review-panel">

                  <div className="review-header">

                    <h2>
                      Extracted Invoice Fields
                      
                    </h2>

                    

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
                                    <b> {field.name} </b>
                                  </h4>

                                  <span
                                  className={
                                      (() => {
                                        const raw = Number(
                                          field?.confidence ?? 0,
                                        );
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
                                          Number(
                                            field?.confidence ?? 0,
                                          ) * 100
                                        )
                                      )
                                    )}%

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
                          Upload invoice and start OCR extraction
                        </p>

                      </div>

                    )
                  }

                </div>

              </div>

            )
          }

        </main>

      </div>

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

        /* SIDEBAR */

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
          color: rgba(255,255,255,0.8);
        }

        /* NAV */

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
  transition: all .3s ease;
  box-shadow: none;
}

.nav-btn.active {
  background: #fff;
  color: #000;
  border: 1px solid #555;
  box-shadow: none;
}


        /* MAIN */

        .main-content {
  flex: 1;
  padding: 32px;
  min-height: 100vh;
  background: #f8f8f8;
}


        /* TOPBAR */

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

        .status-badge {
  background: #fff;
  border: 1px solid #ddd;
  padding: 14px 24px;
  border-radius: 12px;
  color: #000;
  font-weight: 700;
  box-shadow: none;
}
 

        /* PROFILE */

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
          box-shadow:
            0 10px 24px rgba(0,0,0,0.08);

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

        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);

          gap: 20px;
        }

        .stat-card {
  background: #fff;
  border: 1px solid #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: none;
  transition: all .3s ease;
}

.stat-card h3 {
  font-size: 54px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #fff;
}
  .stat-card  p{
  color: #fff;
  }
        .blue,
.purple,
.orange {
  background: rgba(11, 1, 1, 0.95);
}

        /* REVIEWER */

        .reviewer-page {
          display: grid;
          grid-template-columns:
            350px 1fr;
            
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

        /* FIELDS */

        .fields-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit,minmax(250px,1fr));

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

  box-shadow:
    0 15px 30px rgba(0,0,0,.08);
}

        .field-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .confidence {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .high {
  background: #111;
  color: #fff;
}

.medium {
  background: #555;
  color: #fff;
}

.low {
  background: #999;
  color: #fff;
}

        /* EMPTY */

        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }

        .empty-icon {
          font-size: 70px;
        }

        .activity-subtitle {
          margin-top: 6px;
          color: #64748b;
        }

        .activity-error {
          color: #dc2626;
          font-weight: 700;
        }

        .activity-category-tabs {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          margin-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }

        .category-tab {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .category-tab:hover {
          border-color: #000;
          color: #000;
        }

        .category-tab.active {
          background: #000;
          color: #fff;
          border-color: #000;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .badge-account {
          background: #e0e7ff;
          color: #3730a3;
        }

        .badge-activity {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-other {
          background: #f3f4f6;
          color: #374151;
        }

        .activity-category-label {
          display: inline-block;
          margin-left: 8px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .activity-summary {
          display: flex;
          gap: 16px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 20px;
          max-height: 560px;
          overflow: auto;
          padding-right: 8px;
        }

        .activity-item {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px;
          background: #ffffff;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .activity-item:hover {
  border-color: #000;
  background: #f5f5f5;
}

        .activity-item.selected {
  border-color: #000;
  background: #f0f0f0;
}

        .activity-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .activity-type {
          font-weight: 800;
          color: #0f172a;
        }

        .activity-date {
          color: #64748b;
          font-size: 12px;
          white-space: nowrap;
        }

        .activity-payload {
          margin: 0;
          font-size: 12px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 14px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .extraction-panel {
          padding: 10px 0 0;
          min-height: 280px;
        }

        .activity-extracted-fields {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
          padding: 8px;
          background: #f0fdf4;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
        }

        .extracted-field-row {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          background: #fff;
          border: 1px solid #e2e8f0;
          font-size: 11px;
        }

        .extracted-field-label {
          font-weight: 700;
          color: #374151;
          margin-right: 2px;
        }

        .extracted-field-value {
          color: #065f46;
          font-weight: 600;
        }

        .extracted-field-confidence {
          font-weight: 700;
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .extracted-field-confidence.high {
          background: #d1fae5;
          color: #065f46;
        }

        .extracted-field-confidence.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .extracted-field-confidence.low {
          background: #fee2e2;
          color: #991b1b;
        }

        .selected-extraction-empty {
          background: #f8fafc;
          border-radius: 18px;
          padding: 24px;
          text-align: center;
          color: #334155;
          border: 1px dashed #c7d2fe;
        }

        .selected-extraction-empty h3 {
          margin-bottom: 12px;
        }

        .selected-extraction-empty p {
          margin: 0;
          color: #64748b;
        }

        /* MOBILE */

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

    </Layout>

  );

}