import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { authFormStyles as s } from "./authFormStyles";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    organization_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.form}>
        <h1 style={s.heading}>Create your organization</h1>
        <input
          style={s.input}
          placeholder="Organization name"
          value={form.organization_name}
          onChange={(e) => update("organization_name", e.target.value)}
          required
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>
        <input
          style={s.input}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <input
          style={s.input}
          type="password"
          placeholder="Password (10+ characters)"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
        {error && <p style={s.error}>{error}</p>}
        <button style={s.button} type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
        <p style={s.switchLine}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
