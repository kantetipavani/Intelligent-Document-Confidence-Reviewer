import { useState } from "react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import Layout from "../components/layout";
import api from "../services/api";

import ExtractedFields from "../components/ExtractedFields";


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

  const userEmail =
    typeof window !== "undefined"
      ? localStorage.getItem("userEmail")
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

  const handleExtract = async () => {

    if (!selectedFile) {

      alert(
        "Please upload PDF / DOC / TXT file"
      );

      return;

    }

    try {

      setLoading(true);

      const formData = new FormData();

      // Backend requires tenant_id and filename as form fields.
      formData.append("tenant_id", "default");
      formData.append("filename", selectedFile.name);
      if (userEmail) {
        formData.append("user_email", userEmail);
      }
      formData.append(
        "file",
        selectedFile
      );

      const response =
        await api.post(
          "/documents/upload",
          formData,

          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      const documentId = response.data.document_id;
      let extraction: any = response.data?.extraction;

      // Newer backend responses include extraction directly.
      // If backend processing is async and extraction is not yet available,
      // poll /versions/latest.
      const maxAttempts = 20;
      const delayMs = 500;

      if (!extraction && documentId) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const latest = await api.get(
              `/versions/latest/${documentId}`
            );

            // backend returns { extraction: <fields object>, ... }
            extraction = latest.data?.extraction;
            if (extraction) break;
          } catch (e) {
            // 404 "no extraction versions" is expected while async job is running.
            // Keep polling until attempts finish.
          }

          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      if (!extraction) {
        throw new Error("Extraction result not available");
      }

      // extraction can be either:
      // - { fields: {...} } (old)
      // - { invoice_no: {...}, ... } (current versions/latest returns fields directly)
      const fieldsObj =
        extraction?.fields &&
        typeof extraction.fields === "object"
          ? extraction.fields
          : extraction || {};

      // Canonical keys produced by the backend UI schema:
      // invoice_no, date, gstin, vendor, amount, status
      const canonicalOrder = [
        "invoice_no",
        "vendor",
        "amount",
        "date",
        "gstin",
        "status",
      ];

      const legacyAliases: Record<string, string> = {
        invoice_number: "invoice_no",
        vendor_name: "vendor",
        invoice_total: "amount",
      };

      const getField = (key: string) => {
        const direct = (fieldsObj as any)?.[key];
        if (direct) return direct;

        // legacy support (if backend or old snapshot uses older keys)
        const mapped = legacyAliases[key];
        if (mapped) return (fieldsObj as any)?.[mapped];

        return undefined;
      };

      const extractedFields = canonicalOrder.map((key) => {
        const f = getField(key) as any;
        return {
          name: key.replace(/_/g, " ").toUpperCase(),
          value: f?.value ?? "",
          confidence: f?.confidence ?? 0,
        };
      });

      setFields(extractedFields);
      setIsExtracted(true);
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

    } finally {


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

                <div className="stats-grid">

                  <div className="stat-card blue">

                    <h3>
                      100+
                    </h3>

                    <p>
                      Invoices Processed
                    </p>

                  </div>

                  <div className="stat-card purple">

                    <h3>
                      98%
                    </h3>

                    <p>
                      OCR Accuracy
                    </p>

                  </div>

                  <div className="stat-card orange">

                    <h3>
                      18 sec
                    </h3>

                    <p>
                      Avg Processing Time
                    </p>

                  </div>

                </div>

              </>

            )
          }

          {/* INFO */}

          {
            activePage === "info" && (
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
                            (selectedActivityIndex === idx
                              ? " selected"
                              : "")
                          }
                          onClick={() => setSelectedActivityIndex(idx)}
                        >
                          <div className="activity-head">
                            <span className="activity-type">{ev.event_type}</span>
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
                      <p>Login, change password, upload invoices, and approve/retrieve actions to see details.</p>
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
                            const ev = activity[selectedActivityIndex];
                            const extraction = ev?.payload?.extraction ?? ev?.payload;

                            if (extraction?.fields && typeof extraction.fields === "object") {
                              const normalized = { ...extraction.fields };
                              Object.keys(extraction).forEach((key) => {
                                if (key === "fields" || Object.prototype.hasOwnProperty.call(normalized, key)) {
                                  return;
                                }
                                normalized[key] = extraction[key];
                              });
                              return normalized;
                            }

                            return extraction || {};
                          })()
                        }
                      />
                    ) : (
                      <div className="empty-state selected-extraction-empty">
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