import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import api from "../services/api";

export default function VerifyOTP() {
  const router = useRouter();
  const { email } = router.query;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
  const [showPopup, setShowPopup] = useState(false);

  const showAlert = (message: string, type = "success") => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  const verifyOTP = async () => {
    if (typeof email !== "string") {
      showAlert("Invalid email.", "error");
      return;
    }

    if (!otp.trim()) {
      showAlert("Please enter the OTP.", "error");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/verify-otp", {
        email,
        otp,
      });

      const verification_token = response.data?.verification_token;

      const query: Record<string, string> = {
        email,
        otp,
      };
      if (verification_token && typeof verification_token === "string" && verification_token.trim() !== "") {
        query.verification_token = verification_token;
      }

      router.push({
        pathname: "/reset-password",
        query,
      });
    } catch (error: any) {
      showAlert(
        error?.response?.data?.detail || "Invalid OTP.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {showPopup && (
        <div className={`popup ${popupType}`}>
          {popupMessage}
        </div>
      )}

      <div className="profile-card">
        <Link href="/forgot-password">
          <button className="arrow-btn">←</button>
        </Link>

        <div className="profile-header">
          <div className="profile-circle">O</div>

          <h1>Verify OTP</h1>

          <p>Enter the 6-digit OTP sent to your email.</p>
        </div>

        <div className="otp-box">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            maxLength={6}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            className="verify-btn"
            onClick={verifyOTP}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          padding: 20px;
          position: relative;
        }

        .popup {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 25px;
          color: #fff;
          border-radius: 12px;
          font-weight: 600;
          z-index: 999;
        }

        .success {
          background: #000;
        }

        .error {
          background: #000;
        }

        .profile-card {
          position: relative;
          width: 100%;
          max-width: 450px;
          background: #fff;
          border: 2px solid #000;
          border-radius: 20px;
          padding: 40px 35px;
          box-sizing: border-box;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }

        .arrow-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 42px;
          height: 42px;
          border: 1px solid #000;
          border-radius: 50%;
          background: #fff;
          color: #000;
          font-size: 22px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: 0.3s;
        }

        .arrow-btn:hover {
          background: #000;
          color: #fff;
        }

        .profile-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .profile-circle {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: #000;
          color: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 34px;
          font-weight: bold;
        }

        .profile-header h1 {
          margin: 0;
          color: #000;
          font-size: 28px;
        }

        .profile-header p {
          margin-top: 8px;
          color: #666;
          font-size: 15px;
        }

        .otp-box {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .otp-box input {
          width: 100%;
          height: 50px;
          padding: 0 15px;
          border: 1px solid #ccc;
          border-radius: 10px;
          outline: none;
          font-size: 18px;
          text-align: center;
          letter-spacing: 6px;
          box-sizing: border-box;
          transition: 0.3s;
        }

        .otp-box input:focus {
          border-color: #000;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.15);
        }

        .verify-btn {
          width: 100%;
          height: 50px;
          border: none;
          border-radius: 10px;
          background: #000;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }

        .verify-btn:hover:not(:disabled) {
          background: #222;
        }

        .verify-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .profile-card {
            padding: 30px 20px;
          }

          .profile-circle {
            width: 70px;
            height: 70px;
            font-size: 28px;
          }

          .profile-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}