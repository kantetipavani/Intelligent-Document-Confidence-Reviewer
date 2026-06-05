import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../services/api";

export default function Profile() {

  const [user, setUser] =
    useState({
      fullName: "",
      email: "",
      role: "",
    });

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPopup, setShowPopup] =
    useState(false);

  const [popupMessage, setPopupMessage] =
    useState("");

  const [popupType, setPopupType] =
    useState("success");

  useEffect(() => {

    const email =
      localStorage.getItem("userEmail") ||
      "No Email";

    const role =
      localStorage.getItem("userRole") ||
      "User Reviewer";

    const fullName =
      localStorage.getItem("userName") ||
      "Pavani";

    setUser({
      fullName,
      email,
      role,
    });

  }, []);

  const showAlert = (
    message: string,
    type = "success"
  ) => {

    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
    }, 3000);

  };

  const handleChangePassword =
    async () => {

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {

        showAlert(
          "Please fill all fields",
          "error"
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {

        showAlert(
          "Passwords do not match",
          "error"
        );

        return;
      }

      if (
        newPassword.length < 6
      ) {

        showAlert(
          "Password must be at least 6 characters",
          "error"
        );

        return;
      }

      try {

        setLoading(true);

        await api.post(
          "/auth/change-password",
          {
            email: user.email,
            current_password:
              currentPassword,
            new_password:
              newPassword,
          }
        );

        showAlert(
          "Password Changed Successfully",
          "success"
        );

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setShowChangePassword(false);
        window.location.href = "/login";

      } catch (error: any) {

        console.log(error);

        let message =
          "Failed to change password";

        if (
          error?.response?.status === 400
        ) {

          message =
            error?.response?.data?.detail ||
            "Current password is incorrect";

        } else if (
          error?.response?.status === 401
        ) {

          message =
            "Current password is incorrect";

        } else if (
          typeof error?.response?.data?.detail ===
          "string"
        ) {

          message =
            error.response.data.detail;

        }

        showAlert(
          message,
          "error"
        );

        return;

      } finally {

        setLoading(false);

      }

    };

  return (

    <div className="page">

      {showPopup && (

        <div
          className={
            popupType === "success"
              ? "popup success"
              : "popup error"
          }
        >
          {popupMessage}
        </div>

      )}

      <div className="profile-card">

        <div className="profile-header">
          <Link href="/dashboard">

    <button className="arrow-btn">
      ←
    </button>
    </Link>

          <div className="profile-circle">
            👤
          </div>

          <h1>
            User Profile
          </h1>

          <p>
            Manage your account information
          </p>

        </div>

        <div className="profile-info">

          <div className="info-box">

            <label>
              Full Name
            </label>

            <p>
              {user.fullName}
            </p>

          </div>

          <div className="info-box">

            <label>
              Email Address
            </label>

            <p>
              {user.email}
            </p>

          </div>

          <div className="info-box">

            <label>
              Role
            </label>

            <p>
              {user.role}
            </p>

          </div>

        </div>

        <button
          className="change-btn"
          onClick={() =>
            setShowChangePassword(
              !showChangePassword
            )
          }
        >

          {
            showChangePassword
              ? "Close Password Form"
              : "Change Password"
          }

        </button>

        {showChangePassword && (

          <div className="password-box">

            <h3>
              Change Password
            </h3>

            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
            />
            <button
              className="save-btn"
              onClick={
                handleChangePassword
              }
              disabled={loading}
            >

              {
                loading
                  ? "Updating..."
                  : "Update Password"
              }

            </button>

          </div>

        )}

        

      </div>

      <style jsx>{`

        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background:
            radial-gradient(
              circle at top,
              #e0e7ff,
              #f8fafc
            );
        }
            .arrow-btn {

  position: absolute;

  top: 20px;

  left: 20px;

  width: 45px;

  height: 45px;

  border: none;

  border-radius: 50%;

  background: #f1f5f9;

  color: #0f172a;

  font-size: 24px;

  font-weight: 700;

  cursor: pointer;

  display: flex;

  align-items: center;

  justify-content: center;

  transition: all 0.3s ease;

}

.arrow-btn:hover {

  background: #e2e8f0;

  transform: translateX(-3px);

}

        .profile-card {
          position:relative;
          width: 500px;
          padding: 40px;
          border-radius: 24px;
          background: white;
          box-shadow:
            0 20px 60px rgba(0,0,0,0.08);
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
          color: white;
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #06b6d4
            );
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .info-box {
          background: #f8fafc;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }

        .info-box label {
          color: #64748b;
          font-size: 13px;
        }

        .info-box p {
          margin-top: 8px;
          font-weight: 700;
        }

        .change-btn,
        .save-btn,
        .back-btn {
          width: 100%;
          margin-top: 18px;
          padding: 14px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          color: white;
          font-weight: 700;
        }

        .change-btn {
          background:
            linear-gradient(
              135deg,
              #22c55e,
              #16a34a
            );
        }

        .save-btn {
          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #06b6d4
            );
        }

        .back-btn {
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #3b82f6
            );
        }

        .password-box {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          border-radius: 16px;
          background: #f8fafc;
        }

        .password-box input {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #dbe2ea;
          outline: none;
        }

        .popup {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 25px;
          color: white;
          border-radius: 12px;
          font-weight: 600;
          z-index: 999;
        }

        .success {
          background: #16a34a;
        }

        .error {
          background: #dc2626;
        }

      `}</style>

    </div>

  );

}
