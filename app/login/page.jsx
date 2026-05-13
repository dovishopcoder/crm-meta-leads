"use client";

import { useEffect, useState } from "react";
import { getCurrentSession, signInWithEmail } from "../supabase-crm";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentSession().then((session) => {
      if (session) window.location.href = "/";
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Nu s-a putut face autentificarea.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-stack">
        <div className="login-logo">
          <img src="/nexttouch-logo.png" alt="NextTouch CRM" />
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">NextTouch CRM</p>
            <h1>Login manager</h1>
          </div>

          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="manager@email.com" required />
          </label>

          <label>
            Parola
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Parola" required />
          </label>

          {error && <p className="modal-warning">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Se conecteaza..." : "Intra in CRM"}</button>
        </form>
      </div>
    </main>
  );
}
