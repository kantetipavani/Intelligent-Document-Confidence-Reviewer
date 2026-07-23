import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import Link from "next/link";
import api from "../services/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { email, otp, verification_token } = router.query;
  const [isReady, setIsReady] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  useEffect(() => {
    if (!router.isReady) return;
    setIsReady(true);

    if (typeof email !== "string" || typeof otp !== "string") {
      showAlert("Invalid email or OTP.", "error");
    }
  }, [router.isReady, email, otp, verification_token]);

  const handleReset = async () => {
  if (
    typeof email !== "string" ||
    typeof otp !== "string"
  ) {
    showAlert("Invalid email or OTP.", "error");
    return;
  }

  if (!newPassword || !confirmPassword) {
    showAlert("Please fill all fields.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showAlert("Passwords do not match.", "error");
    return;
  }

  if (newPassword.length < 6) {
    showAlert("Password must be at least 6 characters.", "error");
    return;
  }

  try {
    setLoading(true);

    const payload: Record<string, string> = {
      email,
      otp,
      new_password: newPassword,
    };
    if (verification_token && typeof verification_token === "string" && verification_token.trim() !== "") {
      payload.verification_token = verification_token;
    }

    await api.post("/auth/reset-password", payload);

    showAlert("Password reset successfully.", "success");

    // Clear any stale auth state so user can login fresh.
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  } catch (error: any) {
    console.error("Reset password error:", error?.response?.data || error);
    showAlert(
      error?.response?.data?.detail || "Failed to reset password.",
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
        <Link href="/login">
          <button className="arrow-btn">←</button>
        </Link>

        <div className="profile-header">
          <div className="profile-circle">R</div>
          <h1>Reset Password</h1>
          <p>Enter your new password.</p>
        </div>

        <div className="password-box">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
              className="save-btn"
              onClick={handleReset}
              disabled={
                loading ||
                typeof email !== "string" ||
                typeof otp !== "string"
              }
            >
              {loading ? "Resetting..." : "Reset Password"}
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

        .profile-card {
          position: relative;
          width: 500px;
          padding: 40px;
          border-radius: 24px;
          background: #fff;
          border: 2px solid #000;
          box-shadow: none;
        }

        .profile-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .profile-header h1 {
          color: #000;
        }

        .profile-header p {
          color: #555;
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
          background: #fff;
          color: #000;
        }

        .password-box input:focus {
          border-color: #000;
        }

        .save-btn {
          width: 100%;
          margin-top: 10px;
          padding: 14px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          background: #000;
          color: #fff;
          font-weight: 700;
          transition: 0.3s;
        }

        .save-btn:hover {
          background: #222;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

