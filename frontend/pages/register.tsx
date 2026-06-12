import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import api from "../services/api";

export default function RegisterPage() {

  const router = useRouter();

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
      tenant_id: "",
    });

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

    }, 2500);

  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

  };

  const handleRegister = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (
      !formData.email ||
      !formData.password ||
      !formData.tenant_id
    ) {

      showAlert(
        "Please fill all fields",
        "error"
      );

      return;

    }

    if (
      formData.password.length < 6
    ) {

      showAlert(
        "Password must be at least 6 characters",
        "error"
      );

      return;

    }

    try {

      setLoading(true);

      const response =
        await api.post(
          "/auth/register",
          formData
        );

      console.log(
        "REGISTER SUCCESS:",
        response.data
      );

      showAlert(
        "Registration Successful",
        "success"
      );

      setFormData({
        email: "",
        password: "",
        tenant_id: "",
      });

      setTimeout(() => {

        router.push(
          "/login"
        );

      }, 1800);

    } catch (error: any) {

      console.error(
        "REGISTER ERROR:",
        error?.response?.data ||
        error.message
      );

      showAlert(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Registration Failed",
        "error"
      );

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="page">

      {/* POPUP MESSAGE */}

      {
        showPopup && (

          <div
            className={
              popupType === "success"
                ? "popup success"
                : "popup error"
            }
          >

            {popupMessage}

          </div>

        )
      }

      {/* REGISTER CARD */}

      <div className="register-card">

        {/* LOGO */}

        <div className="logo-area">

          <div className="logo-circle">
            AI
          </div>

          <h1>
            Create Account
          </h1>

          <p>
            Register to access Invoice AI
          </p>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleRegister}
        >

          <div className="input-group">

            <label>
              Email
            </label>

            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
            />

          </div>

          <div className="input-group">

            <label>
              Password
            </label>

            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={formData.password}
              onChange={handleChange}
            />

          </div>

          <div className="input-group">

            <label>
              Tenant ID
            </label>

            <input
              type="text"
              name="tenant_id"
              placeholder="Enter Tenant ID"
              value={formData.tenant_id}
              onChange={handleChange}
            />

          </div>

          <button
            type="submit"
            className="register-btn"
            disabled={loading}
          >

            {
              loading
                ? "Registering..."
                : "Create Account"
            }

          </button>

        </form>

        {/* FOOTER */}

        <p className="footer-text">

          Already have an account?{" "}

          <Link href="/login">

            <span className="link">

              Sign In

            </span>

          </Link>

        </p>

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
  color: white;
  padding: 16px 28px;
  border-radius: 14px;
  font-weight: 600;
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

.register-card {
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
  box-shadow: none;
}

/* BUTTON */

.register-btn {
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

.register-btn:hover {
  background: #222;
}

.register-btn:disabled {
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
  .register-card {
    width: 92%;
    padding: 30px;
  }
}
      `}</style>

    </div>

  );

}