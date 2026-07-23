import { useEffect, useState } from "react";
import Link from "next/link";

export default function Profile() {
  const [user, setUser] = useState({
    fullName: "",
    email: "",
    role: "",
  });

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

  return (
    <div className="page">
      <div className="profile-card">
        <div className="profile-header">
          <Link href="/dashboard">
            <button className="arrow-btn">
              ←
            </button>
          </Link>

          <div className="profile-circle">
            U
          </div>

          <h1>User Profile</h1>

          <p>
            Manage your account information
          </p>
        </div>

        <div className="profile-info">
          <div className="info-box">
            <label>Full Name</label>
            <p>{user.fullName}</p>
          </div>

          <div className="info-box">
            <label>Email Address</label>
            <p>{user.email}</p>
          </div>

          <div className="info-box">
            <label>Role</label>
            <p>{user.role}</p>
          </div>
        </div>

        <Link href="/change-password">
          <button className="change-btn">
            Change Password
          </button>
        </Link>
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

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .info-box {
          background: #fff;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #000;
        }

        .info-box label {
          color: #555;
          font-size: 13px;
        }

        .info-box p {
          margin-top: 8px;
          font-weight: 700;
          color: #000;
        }

        .change-btn {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          background: #000;
          color: #fff;
          font-weight: 700;
          transition: 0.3s;
        }

        .change-btn:hover {
          background: #222;
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