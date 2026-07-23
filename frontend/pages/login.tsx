import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import api from "../services/api";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [popupMessage, setPopupMessage] =
    useState("");

  const [showPopup, setShowPopup] =
    useState(false);

  const [popupType, setPopupType] =
    useState("success");

  const showAlert = (
    message: string,
    type = "success"
  ) => {

    setPopupMessage(message);

    setPopupType(type);

    setShowPopup(true);

    setTimeout(() => {

      setShowPopup(false);

    }, 5000);

  };

  const handleLogin = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (!email || !password) {

      showAlert(
        "Please enter email and password",
        "error"
      );

      return;

    }

    try {

      setLoading(true);

      // Connectivity check
      try {
        await api.get("/health");
      } catch (healthErr) {
        console.error("Backend not reachable", healthErr);
        showAlert(
          "Backend is not reachable. Check API_URL/port and backend is running.",
          "error"
        );
        return;
      }

      const response =
        await api.post(
          "/auth/login",
          {
            email,
            password,
          }
        );

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      // STORE USER DETAILS

      localStorage.setItem(
        "token",
        response.data.access_token
      );

      localStorage.setItem(
        "userEmail",
        response.data.email
      );

      localStorage.setItem(
        "userRole",
        "User Reviewer"
      );

      localStorage.setItem(
        "userName",
        response.data.email
          ?.split("@")[0]
      );

      showAlert(
        "Login Successful",
        "success"
      );

      setEmail("");
      setPassword("");

      setTimeout(() => {

        router.push(
          "/dashboard"
        );

      }, 1500);

    } catch (error: any) {

      console.log(
        "LOGIN ERROR:",
        error
      );

      let errorMessage =
        "Invalid Credentials";

      // HANDLE STRING ERROR

      if (
        typeof error?.response?.data
          ?.detail === "string"
      ) {

        errorMessage =
          error.response.data.detail;

      }

      // HANDLE ARRAY VALIDATION ERROR

      else if (
        Array.isArray(
          error?.response?.data
            ?.detail
        )
      ) {

        errorMessage =
          error.response.data
            .detail[0]?.msg ||
          "Validation Error";

      }

      showAlert(
        errorMessage,
        "error"
      );

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="page">

      {/* POPUP */}

      {
        showPopup && (

          <div
            className={`popup ${
              popupType === "success"
                ? "popup-success"
                : "popup-error"
            }`}
          >
            {popupMessage}
          </div>

        )
      }

      {/* LOGIN CARD */}

      <div className="login-card">

        {/* LOGO */}

        <div className="logo-area">

          <div className="logo-circle">
            AI
          </div>

          <h1>
            Invoice AI
          </h1>

          <p>
            Smart OCR Document Platform
          </p>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleLogin}
        >

          <div className="input-group">

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
            />

          </div>

          <div className="input-group">

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >

            {
              loading
                ? "Signing in..."
                : "Sign In"
            }

          </button>

        </form>

        {/* FOOTER */}

        <p className="footer-text">

          Don’t have an account?{" "}

          <Link href="/register">

            <span className="link">

              Create Account

            </span>

          </Link>

        </p>
        <Link href="/forgot-password">
  <p
    style={{
      textAlign: "center",
      marginTop: "15px",
      cursor: "pointer",
      color: "#000",
      fontWeight: "600",
    }}
  >
    Forgot Password?
  </p>
</Link>

      </div>

      <style jsx>{`

        .page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

/* POPUP */

.popup {
  position: absolute;
  top: 30px;
  right: 30px;
  color: #fff;
  padding: 16px 28px;
  border-radius: 14px;
  font-weight: 600;
  background: #000;
  animation: slideIn 0.4s ease;
  z-index: 1000;
}

.success {
  background: #000;
}

.error {
  background: #000;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* CARD */

.login-card {
  width: 450px;
  padding: 45px;
  border-radius: 28px;
  background: #fff;
  border: 2px solid #000;
  box-shadow: none;
}

/* LOGO */

.logo-area {
  text-align: center;
  margin-bottom: 35px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  background: #000;
}

h1 {
  margin: 0;
  font-size: 30px;
  color: #000;
}

p {
  margin-top: 8px;
  color: #555;
  font-size: 14px;
}

/* INPUTS */

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

label {
  font-size: 14px;
  color: #000;
  margin-bottom: 8px;
  font-weight: 600;
}

input {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #000;
  outline: none;
  font-size: 15px;
  background: #fff;
  color: #000;
  transition: 0.3s ease;
}

input:focus {
  border-color: #000;
  background: #fff;
  box-shadow: none;
}

/* BUTTON */

.login-btn {
  width: 100%;
  margin-top: 10px;
  padding: 16px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #000;
  transition: 0.3s ease;
}

.login-btn:hover {
  background: #222;
  transform: translateY(-2px);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* FOOTER */

.footer-text {
  text-align: center;
  margin-top: 22px;
  font-size: 14px;
  color: #555;
}

.link {
  color: #000;
  font-weight: 700;
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

/* RESPONSIVE */

@media (max-width: 500px) {
  .login-card {
    width: 92%;
    padding: 30px;
  }
}

      `}</style>

    </div>

  );

}