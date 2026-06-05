import Link from "next/link";

export default function Topbar() {
  return (
    <div className="topbar">

      <h2>
        Intelligent Document Reviewer
      </h2>

      <div className="user-info">

        <Link href="/login">
          <button className="login-btn">
            Login
          </button>
        </Link>

      </div>

    </div>
  );
}