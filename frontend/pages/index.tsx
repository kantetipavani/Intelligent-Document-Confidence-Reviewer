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
            AI-powered platform for smart
            document extraction, confidence
            scoring, review, and approval.
          </p>

          <div className="features">

            <div className="feature-card">
              <div className="icon blue">
                📄
              </div>

              <h3>Smart Extraction</h3>

              <span>
                Extract invoice and
                document fields instantly
              </span>
            </div>

            <div className="feature-card">
              <div className="icon green">
                ✔
              </div>

              <h3>Confidence Score</h3>

              <span>
                AI-generated accuracy
                percentage for fields
              </span>
            </div>

            <div className="feature-card">
              <div className="icon purple">
                👥
              </div>

              <h3>Review Workflow</h3>

              <span>
                Review and approve
                extracted information
              </span>
            </div>

          </div>

        </div>

        <div className="right-section">

          <div className="preview-card">

            <div className="top-badge">
              AI
            </div>

            <h2>
              Invoice Review
            </h2>

            <div className="field-row">
              <span>Invoice No</span>

              <strong>
                INV-2026-1001
              </strong>

              <div className="score green-score">
                95%
              </div>
            </div>

            <div className="field-row">
              <span>Invoice Date</span>

              <strong>
                21-May-2026
              </strong>

              <div className="score blue-score">
                93%
              </div>
            </div>

            <div className="field-row">
              <span>Vendor Name</span>

              <strong>
                ABC Technologies
              </strong>

              <div className="score yellow-score">
                88%
              </div>
            </div>

            <div className="field-row">
              <span>Total Amount</span>

              <strong>
                ₹94,400
              </strong>

              <div className="score purple-score">
                92%
              </div>
            </div>

          </div>

        </div>

      </div>

      <Link href="/login">
        <button className="start-btn">
          Let’s Start →
        </button>
      </Link>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #eef3ff,
              #dfe8ff,
              #ece9ff
            );

          display: flex;
          flex-direction: column;
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
          color: #0f172a;
          margin-bottom: 25px;
        }

        .left-section p {
          font-size: 24px;
          line-height: 1.7;
          color: #5b6478;
          margin-bottom: 40px;
          max-width: 650px;
        }

        .features {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .feature-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);

          padding: 22px;
          border-radius: 20px;

          width: 220px;

          box-shadow:
            0 10px 25px rgba(0,0,0,0.08);

          transition: 0.3s;
        }

        .feature-card:hover {
          transform: translateY(-5px);
        }

        .icon {
          width: 55px;
          height: 55px;

          border-radius: 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 26px;
          margin-bottom: 15px;
        }

        .blue {
          background: #dbeafe;
        }

        .green {
          background: #dcfce7;
        }

        .purple {
          background: #ede9fe;
        }

        .feature-card h3 {
          margin-bottom: 10px;
          color: #111827;
        }

        .feature-card span {
          color: #6b7280;
          line-height: 1.5;
        }

        .right-section {
          display: flex;
          justify-content: center;
        }

        .preview-card {
          width: 500px;
          background: rgba(255,255,255,0.75);

          backdrop-filter: blur(12px);

          border-radius: 30px;
          padding: 35px;

          box-shadow:
            0 20px 40px rgba(0,0,0,0.1);

          position: relative;

          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-10px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        .top-badge {
          position: absolute;
          top: -18px;
          left: -18px;

          width: 70px;
          height: 70px;

          border-radius: 18px;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );

          color: white;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 28px;
          font-weight: bold;
        }

        .preview-card h2 {
          margin-bottom: 30px;
          color: #111827;
        }

        .field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;

          padding: 18px 0;

          border-bottom: 1px solid #ececec;
        }

        .field-row span {
          color: #6b7280;
          flex: 1;
        }

        .field-row strong {
          color: #111827;
          flex: 1;
        }

        .score {
          padding: 8px 14px;
          border-radius: 12px;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .green-score {
          background: #22c55e;
        }

        .blue-score {
          background: #3b82f6;
        }

        .yellow-score {
          background: #f59e0b;
        }

        .purple-score {
          background: #8b5cf6;
        }

        .start-btn {
          margin-top: 50px;

          border: none;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );

          color: white;

          padding: 18px 45px;

          border-radius: 16px;

          font-size: 24px;
          font-weight: bold;

          cursor: pointer;

          transition: 0.3s;

          box-shadow:
            0 12px 25px rgba(79,70,229,0.25);
        }

        .start-btn:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 1100px) {

          .content-box {
            grid-template-columns: 1fr;
          }

          .left-section {
            text-align: center;
          }

          .left-section p {
            margin: auto;
            margin-bottom: 40px;
          }

          .features {
            justify-content: center;
          }
        }

        @media (max-width: 768px) {

          .left-section h1 {
            font-size: 42px;
          }

          .left-section p {
            font-size: 18px;
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