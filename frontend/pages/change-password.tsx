import { useState } from "react";
import Link from "next/link";
import api from "../services/api";

export default function ChangePassword() {

  const [currentPassword, setCurrentPassword] = useState("");
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

  const handleChangePassword = async () => {

    const email = localStorage.getItem("userEmail");

    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert("Please fill all fields", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("Password must be at least 6 characters", "error");
      return;
    }

    try {

      setLoading(true);

      await api.post("/auth/change-password", {
        email,
        current_password: currentPassword,
        new_password: newPassword,
      });

      showAlert("Password Changed Successfully");

      // Clear auth state so user logs in fresh with new password.
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);

    } catch (error: any) {

      let message = "Failed to change password";

      if (error?.response?.data?.detail) {
        message = error.response.data.detail;
      }

      showAlert(message, "error");

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

  <Link href="/profile">
    <button className="arrow-btn">
      ←
    </button>
  </Link>

  <div className="profile-header">
    <div className="profile-circle">
      P
    </div>

    <h1>Change Password</h1>

    <p>Update your account password</p>
  </div>

  <div className="password-box">

    <input
      type="password"
      placeholder="Current Password"
      value={currentPassword}
      onChange={(e) => setCurrentPassword(e.target.value)}
    />

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
      onClick={handleChangePassword}
      disabled={loading}
    >
      {loading ? "Updating..." : "Update Password"}
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