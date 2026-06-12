import Link from "next/link";

export default function Home() {
  return (
    <div className="home-container">
      <div className="content-box">
        <div className="left-section">
          <h1>
            Intelligent Document
            <br />
            Confidence Reviewer
          </h1>

          <p>
            AI-powered platform for smart document extraction,
            confidence scoring, review, and approval.
          </p>

          <div className="features">
            <div className="feature-card">
              <h3>Smart Extraction</h3>
              <span>
                Extract invoice and document fields instantly
              </span>
            </div>

            <div className="feature-card">
              <h3>Confidence Score</h3>
              <span>
                AI-generated accuracy percentage for fields
              </span>
            </div>

            <div className="feature-card">
              <h3>Review Workflow</h3>
              <span>
                Review and approve extracted information
              </span>
            </div>
          </div>
        </div>

        <div className="right-section">
          <div className="preview-card">
            <div className="top-badge">AI</div>

            <h2>Invoice Review</h2>

            <div className="field-row">
              <span>Invoice No</span>
              <strong>INV-2026-1001</strong>
              <div className="score">95%</div>
            </div>

            <div className="field-row">
              <span>Invoice Date</span>
              <strong>21-May-2026</strong>
              <div className="score">93%</div>
            </div>

            <div className="field-row">
              <span>Vendor Name</span>
              <strong>ABC Technologies</strong>
              <div className="score">88%</div>
            </div>

            <div className="field-row">
              <span>Total Amount</span>
              <strong>₹94,400</strong>
              <div className="score">92%</div>
            </div>
          </div>

          <Link href="/login">
            <button className="start-btn">
              Let&apos;s Start →
            </button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: #f5f5f5;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
          font-family: Arial, sans-serif;
        }

        .content-box {
          width: 100%;
          max-width: 1300px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .left-section h1 {
          font-size: 64px;
          line-height: 1.1;
          margin-bottom: 25px;
        }

        .left-section p {
          font-size: 24px;
          color: #555;
          line-height: 1.7;
          margin-bottom: 40px;
        }

        .features {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .feature-card {
          width: 220px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 16px;
          padding: 22px;
        }

        .feature-card h3 {
          margin-bottom: 10px;
        }

        .feature-card span {
          color: #666;
          line-height: 1.5;
        }

        .right-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 100px;
        }

        .preview-card {
          width: 500px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 20px;
          padding: 35px;
          position: relative;
        }

        .top-badge {
          position: absolute;
          top: -18px;
          left: -18px;
          width: 70px;
          height: 70px;
          border-radius: 16px;
          background: #000;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
        }

        .preview-card h2 {
          margin-bottom: 30px;
        }

        .field-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 0;
          border-bottom: 1px solid #e5e5e5;
        }

        .field-row span {
          flex: 1;
          color: #666;
        }

        .field-row strong {
          flex: 1;
        }

        .score {
          background: #000;
          color: #fff;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: bold;
        }

        .start-btn {
          background: #000;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 18px 45px;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
        }

        .start-btn:hover {
          background: #222;
        }

        @media (max-width: 1100px) {
          .content-box {
            grid-template-columns: 1fr;
          }

          .left-section {
            text-align: center;
          }

          .features {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .left-section h1 {
            font-size: 42px;
          }

          .preview-card {
            width: 100%;
          }

          .feature-card {
            width: 100%;
          }

          .start-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}