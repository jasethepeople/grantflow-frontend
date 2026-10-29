import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import type { Grant } from "../api/client";
import { SectionsPanel } from "./SectionsPanel";
import { BudgetPanel } from "./BudgetPanel";
import { OutcomesPanel } from "./OutcomesPanel";

type Tab = "sections" | "budget" | "outcomes";

export function GrantDetailPage() {
  const { grantId } = useParams<{ grantId: string }>();
  const { token } = useAuth();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [tab, setTab] = useState<Tab>("sections");

  useEffect(() => {
    if (!token || !grantId) return;
    api.getGrant(grantId, token).then(setGrant);
  }, [token, grantId]);

  if (!grantId) return null;

  return (
    <div style={styles.page}>
      <Link to="/" style={styles.backLink}>← All grants</Link>
      <h1 style={styles.heading}>{grant?.title ?? "Loading…"}</h1>
      {grant && (
        <p style={styles.meta}>
          {grant.status.replace("_", " ")}
          {grant.deadline && ` · due ${grant.deadline}`}
          {grant.amount_requested && ` · $${grant.amount_requested} requested`}
        </p>
      )}

      <div style={styles.tabs}>
        {(["sections", "budget", "outcomes"] as Tab[]).map((t) => (
          <button
            key={t}
            style={{ ...styles.tabButton, ...(tab === t ? styles.tabButtonActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.panel}>
        {tab === "sections" && <SectionsPanel grantId={grantId} />}
        {tab === "budget" && <BudgetPanel grantId={grantId} />}
        {tab === "outcomes" && <OutcomesPanel grantId={grantId} />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 820, margin: "32px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" },
  backLink: { fontSize: 13, color: "#666", textDecoration: "none" },
  heading: { fontSize: 22, margin: "8px 0 2px" },
  meta: { fontSize: 13, color: "#888", marginBottom: 20, textTransform: "capitalize" },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #eee", marginBottom: 20 },
  tabButton: {
    padding: "8px 14px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 13.5,
    color: "#666",
    borderBottom: "2px solid transparent",
  },
  tabButtonActive: { color: "#111", fontWeight: 600, borderBottom: "2px solid #111" },
  panel: {},
};
