import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import api from "../services/api";

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email) {
      alert("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/send-otp", {
        email,
      });

      alert("OTP sent successfully.");

      router.push({
        pathname: "/verify-otp",
        query: {
          email,
        },
      });
    } catch (error: any) {
      alert(
        error?.response?.data?.detail ||
          "Failed to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="profile-card">
        <Link href="/login">
          <button className="arrow-btn">←</button>
        </Link>

        <div className="profile-header">
          <div className="profile-circle">F</div>

          <h1>Forgot Password</h1>

          <p>Enter your registered email.</p>
        </div>

        <div className="password-box">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="save-btn"
            onClick={handleSendOTP}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send OTP"}
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
        }

        .profile-card {
          position: relative;
          width: 500px;
          padding: 40px;
          border-radius: 24px;
          background: #fff;
          border: 2px solid #000;
        }

        .arrow-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 45px;
          height: 45px;
          border: 1px solid #000;
          border-radius: 50%;
          background: #fff;
          color: #000;
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
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
          margin: 0 auto 15px;
          border-radius: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 34px;
          background: #000;
          color: #fff;
        }

        .password-box {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .password-box input {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #000;
          outline: none;
          font-size: 15px;
        }

        .save-btn {
          width: 100%;
          margin-top: 10px;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: #000;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .profile-card {
            width: 95%;
            padding: 25px;
          }
        }
      `}</style>
    </div>
  );
}