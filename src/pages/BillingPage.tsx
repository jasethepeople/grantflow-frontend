import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import { ApiError, type PlanLimits } from "../api/client";

const PLAN_ORDER: Array<"free" | "starter" | "pro"> = ["free", "starter", "pro"];
const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro" };

export function BillingPage() {
  const { token, currentOrganization, refreshMembership } = useAuth();
  const [plans, setPlans] = useState<Record<string, PlanLimits> | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPlans().then(setPlans);
  }, []);

  async function handleUpgrade(plan: "starter" | "pro") {
    if (!token || !currentOrganization) return;
    setError(null);
    setBusyPlan(plan);
    try {
      const { checkout_url } = await api.createCheckoutSession(
        {
          organization_id: currentOrganization.id,
          plan,
          success_url: `${window.location.origin}/billing?upgraded=1`,
          cancel_url: `${window.location.origin}/billing`,
        },
        token,
      );
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
      setBusyPlan(null);
    }
  }

  async function handleManageBilling() {
    if (!token || !currentOrganization) return;
    setError(null);
    setPortalBusy(true);
    try {
      const { portal_url } = await api.createPortalSession(
        { organization_id: currentOrganization.id, return_url: window.location.href },
        token,
      );
      window.location.href = portal_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open billing portal.");
      setPortalBusy(false);
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("upgraded")) {
      refreshMembership();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentOrganization || !plans) return <div style={styles.page}>Loading…</div>;

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Billing</h1>
      <p style={styles.current}>
        Current plan: <strong>{PLAN_LABELS[currentOrganization.plan]}</strong>
      </p>

      {currentOrganization.plan !== "free" && (
        <button style={styles.manageButton} onClick={handleManageBilling} disabled={portalBusy}>
          {portalBusy ? "Opening…" : "Manage billing / cancel subscription"}
        </button>
      )}

      <div style={styles.grid}>
        {PLAN_ORDER.map((planKey) => {
          const limits = plans[planKey];
          const isCurrent = currentOrganization.plan === planKey;
          const canUpgradeTo = planKey !== "free";
          return (
            <div key={planKey} style={{ ...styles.card, ...(isCurrent ? styles.cardCurrent : {}) }}>
              <div style={styles.planName}>{PLAN_LABELS[planKey]}</div>
              <ul style={styles.limitsList}>
                <li>{limits.max_grants === null ? "Unlimited" : limits.max_grants} active grant(s)</li>
                <li>{limits.ai_generations_per_month} AI drafts / month</li>
                <li>Up to {limits.max_seats} team members</li>
              </ul>
              {isCurrent ? (
                <span style={styles.currentBadge}>Current plan</span>
              ) : canUpgradeTo ? (
                <button
                  style={styles.upgradeButton}
                  onClick={() => handleUpgrade(planKey as "starter" | "pro")}
                  disabled={busyPlan === planKey}
                >
                  {busyPlan === planKey ? "Redirecting…" : `Upgrade to ${PLAN_LABELS[planKey]}`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "32px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" },
  heading: { fontSize: 22, marginBottom: 8 },
  current: { fontSize: 14, color: "#444", marginBottom: 12 },
  manageButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    marginBottom: 24,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  card: { border: "1px solid #eee", borderRadius: 10, padding: 16 },
  cardCurrent: { borderColor: "#111", boxShadow: "0 0 0 1px #111" },
  planName: { fontWeight: 700, fontSize: 15, marginBottom: 10 },
  limitsList: { fontSize: 12.5, color: "#555", paddingLeft: 18, marginBottom: 14, lineHeight: 1.6 },
  currentBadge: { fontSize: 12, fontWeight: 600, color: "#2e7d32" },
  upgradeButton: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  error: { color: "#c62828", fontSize: 13, marginTop: 16 },
};
