import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import Layout from "../components/layout";
import api from "../services/api";

import ExtractedFields from "../components/ExtractedFields";
import { useExtractionFieldsFromWebSocket } from "../hooks/useExtractionFieldsFromWebSocket";
import ConfidenceDashboard from "../components/ConfidenceDashboard";
import { validateFileAsync } from "../utils/fileValidation";

export default function Dashboard() {

  const [activePage, setActivePage] =
    useState("dashboard");



  type ExtractedField = {
    name: string;
    value: string;
    confidence: number;
  };

  type ActivityEvent = {
    event_type: string;
    user_email?: string;
    tenant?: string;
    created_at?: string;
    payload?: any;
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{
    type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
    title: string;
    message: string;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "empty" | "malformed" | "oversized" | "unsupported" | "general";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [isExtracted, setIsExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [selectedActivityIndex, setSelectedActivityIndex] =
    useState<number | null>(null);
  const [activityError, setActivityError] =
    useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [documentIdForWs, setDocumentIdForWs] =
    useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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


  /* FILE VALIDATION */

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

  const clearInvalidFile = (
    input?: HTMLInputElement | null
  ) => {
    if (input) {
      input.value = "";
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSelectedFile(null);
    setIsExtracted(false);
    setFields([]);
    setDocumentIdForWs(null);
    setLoading(false);
  };

  const processFile = async (
    file: File | null | undefined,
    inputElement?: HTMLInputElement | null
  ) => {
    setSelectedFile(null);
    setIsExtracted(false);
    setFields([]);
    setDocumentIdForWs(null);
    setFileError(null);
    setValidationError(null);

    if (!file) {
      return;
    }

    // Detect 1st: empty file, malformed file, oversized file
    const validation = await validateFileAsync(file);
    if (!validation.isValid) {
      const err: {
        type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
        title: string;
        message: string;
      } = {
        type: (validation.errorType as any) || "general",
        title: validation.title || "file validation error",
        message: validation.message || "Invalid file detected. Processing stopped.",
      };
      setValidationError(err);
      setFileError(err.title);
      setErrorModal({
        isOpen: true,
        title: err.title,
        message: err.message,
        type: err.type,
      });
      clearInvalidFile(inputElement);
      return;
    }

    setValidationError(null);
    setFileError(null);
    setSelectedFile(file);
  };

  /* FILE SELECT */

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    await processFile(file, e.currentTarget);
  };

  /* DRAG AND DROP */
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  /* OCR EXTRACTION */

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
    // Prevent duplicate extraction requests while one is already processing.
    if (loading) {
      return;
    }

    if (!selectedFile) {
      alert("Please upload an invoice file.");
      return;
    }

    // Detect 1st before proceeding: empty file, malformed file, oversized file
    const validation = await validateFileAsync(selectedFile);
    if (!validation.isValid) {
      const err: {
        type: "empty" | "malformed" | "oversized" | "unsupported" | "general";
        title: string;
        message: string;
      } = {
        type: validation.errorType || "general",
        title: validation.title || "file validation error",
        message: validation.message || "Invalid file detected. Processing stopped.",
      };
      setValidationError(err);
      setFileError(err.title);
      setErrorModal({
        isOpen: true,
        title: err.title,
        message: err.message,
        type: err.type,
      });
      clearInvalidFile();
      return;
    }

    setIsExtracted(false);
    setFields([]);
    setLoading(true);
    setDocumentIdForWs(null);
    setFileError(null);
    setValidationError(null);

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

      const lowerMsg = String(msg || "").toLowerCase();

      let errType: "empty" | "malformed" | "oversized" | "general" = "general";
      let errTitle = "OCR Extraction Failed";
      let errDesc = msg ? String(msg) : "OCR Extraction Failed. Processing stopped.";

      if (lowerMsg.includes("empty")) {
        errType = "empty";
        errTitle = "empty file not processing";
        errDesc = "The uploaded file is empty (0 bytes). Processing stopped.";
      } else if (lowerMsg.includes("malformed") || lowerMsg.includes("corrupt") || lowerMsg.includes("no pages")) {
        errType = "malformed";
        errTitle = "malformed file not processing";
        errDesc = "The uploaded file is corrupted or malformed. Processing stopped.";
      } else if (status === 413 || lowerMsg.includes("too large") || lowerMsg.includes("maximum")) {
        errType = "oversized";
        errTitle = "oversized file not processing";
        errDesc = "The uploaded file exceeds the 10MB limit. Processing stopped.";
      }

      setValidationError({
        type: errType,
        title: errTitle,
        message: errDesc,
      });
      setFileError(errTitle);
      setErrorModal({
        isOpen: true,
        title: errTitle,
        message: errDesc,
        type: errType,
      });

      alert(`${errTitle}: ${errDesc}`);
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
    activityQuery.error
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

                <div
                  className={`upload-card ${isDragging ? "dragging" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >

                  <h2>
                    Upload Invoice
                 
                  </h2>
                  

                  <div
                    className={`upload-box ${isDragging ? "drag-active" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <label
                      htmlFor="invoice-file"
                      className="choose-file-btn"
                    >
                      Choose File
                    </label>

                    <input
                      id="invoice-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="hidden-file-input"
                    />

                    <div className="upload-hint">or drag & drop invoice file here (.pdf, .doc, .docx, .txt)</div>

                    {selectedFile && !validationError && (
                      <div className="selected-file-name">
                        📄 {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                    )}
                  </div>

                  {validationError && (
                    <div className="file-error-notice">
                      <div className="error-badge-header">⚠️ <b>{validationError.title}</b></div>
                      <div className="error-badge-msg">{validationError.message}</div>
                    </div>
                  )}

                  <button
                    className="extract-btn"
                    onClick={handleExtract}
                    disabled={loading || !selectedFile || !!validationError}
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
                                            Math.round(raw <= 1 ? raw * 100 : raw),
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

                    ) : validationError ? (

                      <div className="empty-state error-state">

                        <div className="empty-icon">
                          ⚠️
                        </div>

                        <h3 className="error-title">
                          {validationError.title}
                        </h3>

                        <p className="error-desc">
                          {validationError.message}
                        </p>

                        <div className="error-action-hint">
                          Action stopped. Please select a valid document with content to proceed.
                        </div>

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

          {/* PROPER ERROR POPUP MODAL */}
          {errorModal.isOpen && (
            <div
              className="error-modal-overlay"
              onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
            >
              <div
                className="error-modal-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="error-modal-header">
                  <div className="error-modal-icon">⚠️</div>
                  <div className="error-modal-badge">
                    {errorModal.type ? `${errorModal.type} error` : "validation error"}
                  </div>
                </div>

                <h3 className="error-modal-title">
                  {errorModal.title}
                </h3>

                <p className="error-modal-message">
                  {errorModal.message}
                </p>

                <div className="error-modal-action-note">
                  🛑 <b>Action Stopped:</b> Extraction will not proceed until a valid document is uploaded.
                </div>

                <div className="error-modal-footer">
                  <button
                    type="button"
                    className="error-modal-btn"
                    onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Got It, Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

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
  border-radius: 1px;
  text-align: center;
  background: #fafafa;
}

.hidden-file-input {
  display: none;
}

.choose-file-btn {
  display: inline-block;
  padding: 8px 12px;
  border: 1px solid #777;
  border-radius: 2px;
  background: #f5f5f5;
  color: #000;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.choose-file-btn:hover {
  background: #e5e5e5;
}

.choose-file-btn:focus {
  outline: 2px solid #000;
  outline-offset: 2px;
}

.selected-file-name {
  margin-top: 15px;
  font-weight: 600;
  color: #333;
  word-break: break-word;
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

        .file-error-notice {
          margin-top: 12px;
          margin-bottom: 12px;
          padding: 10px 14px;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          font-size: 13px;
          text-align: center;
          word-break: break-word;
        }

        .file-preview-badge {
          margin-top: 10px;
          margin-bottom: 10px;
          padding: 8px 12px;
          background: #f1f5f9;
          color: #334155;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          word-break: break-word;
        }

        .error-state .empty-icon {
          color: #dc2626;
        }

        .error-title {
          color: #dc2626 !important;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .error-desc {
          color: #991b1b !important;
          font-size: 14px;
          max-width: 420px;
          margin: 0 auto;
        }

        .error-badge-header {
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 4px;
          text-transform: capitalize;
        }

        .error-badge-msg {
          font-size: 12px;
          opacity: 0.95;
          line-height: 1.4;
        }

        .error-action-hint {
          margin-top: 14px;
          font-size: 13px;
          font-weight: 600;
          color: #b91c1c;
          padding: 8px 14px;
          background: #fef2f2;
          border: 1px dashed #fca5a5;
          border-radius: 8px;
          display: inline-block;
        }

        /* POPUP ERROR MODAL */
        .error-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeInOverlay 0.2s ease;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .error-modal-dialog {
          background: #ffffff;
          border-radius: 18px;
          max-width: 480px;
          width: 100%;
          padding: 28px;
          box-shadow: 0 20px 40px -15px rgba(220, 38, 38, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.15);
          text-align: center;
          animation: popModal 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popModal {
          from {
            transform: scale(0.92) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .error-modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .error-modal-icon {
          font-size: 48px;
          line-height: 1;
        }

        .error-modal-badge {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .error-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #991b1b;
          margin: 0 0 10px 0;
          text-transform: capitalize;
        }

        .error-modal-message {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
          margin: 0 0 18px 0;
        }

        .error-modal-action-note {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #7f1d1d;
          text-align: left;
          margin-bottom: 22px;
          line-height: 1.4;
        }

        .error-modal-footer {
          display: flex;
          justify-content: flex-end;
        }

        .error-modal-btn {
          width: 100%;
          background: #dc2626;
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .error-modal-btn:hover {
          background: #b91c1c;
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
