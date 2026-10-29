import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import { ApiError, type Grant } from "../api/client";

const STATUS_COLORS: Record<Grant["status"], string> = {
  drafting: "#757575",
  internal_review: "#b58900",
  submitted: "#1565c0",
  awarded: "#2e7d32",
  rejected: "#c62828",
};

export function DashboardPage() {
  const { token, currentOrganization } = useAuth();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadGrants() {
    if (!token || !currentOrganization) return;
    setLoading(true);
    try {
      const page = await api.listGrants(token, currentOrganization.id);
      setGrants(page.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentOrganization?.id]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !currentOrganization) return;
    setCreateError(null);
    setCreating(true);
    try {
      await api.createGrant({ organization: currentOrganization.id, title }, token);
      setTitle("");
      await loadGrants();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setCreateError(`${err.message} — see the Billing page to upgrade.`);
      } else {
        setCreateError(err instanceof ApiError ? err.message : "Could not create grant.");
      }
    } finally {
      setCreating(false);
    }
  }

  if (!currentOrganization) {
    return <div style={styles.page}>Loading organization…</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Grants</h1>

      <form onSubmit={handleCreate} style={styles.createForm}>
        <input
          style={styles.input}
          placeholder="New grant title (e.g. Community Health Access Grant)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={creating}>
          {creating ? "Creating…" : "New Grant"}
        </button>
      </form>
      {createError && <p style={styles.error}>{createError}</p>}

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : grants.length === 0 ? (
        <p style={styles.muted}>No grants yet — create your first one above.</p>
      ) : (
        <ul style={styles.list}>
          {grants.map((grant) => (
            <li key={grant.id} style={styles.card}>
              <Link to={`/grants/${grant.id}`} style={styles.cardLink}>
                <div style={styles.cardTop}>
                  <span style={styles.cardTitle}>{grant.title}</span>
                  <span style={{ ...styles.badge, background: STATUS_COLORS[grant.status] }}>
                    {grant.status.replace("_", " ")}
                  </span>
                </div>
                <div style={styles.cardMeta}>
                  {grant.funder_name && <span>{grant.funder_name} · </span>}
                  {grant.deadline && <span>Due {grant.deadline} · </span>}
                  {grant.amount_requested && <span>${grant.amount_requested} requested</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "32px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" },
  heading: { fontSize: 22, marginBottom: 16 },
  createForm: { display: "flex", gap: 8, marginBottom: 8 },
  input: { flex: 1, padding: "9px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14 },
  button: { padding: "9px 16px", borderRadius: 6, border: "none", background: "#111", color: "#fff", cursor: "pointer" },
  error: { color: "#c62828", fontSize: 13 },
  muted: { color: "#888", fontSize: 14 },
  list: { listStyle: "none", padding: 0, marginTop: 16, display: "flex", flexDirection: "column", gap: 8 },
  card: { border: "1px solid #eee", borderRadius: 8 },
  cardLink: { display: "block", padding: "12px 14px", textDecoration: "none", color: "inherit" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: 600, fontSize: 15 },
  cardMeta: { fontSize: 12.5, color: "#777", marginTop: 4 },
  badge: { color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 999, textTransform: "capitalize" },
};
