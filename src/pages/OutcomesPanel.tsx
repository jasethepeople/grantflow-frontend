import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import { ApiError, type OutcomeReport } from "../api/client";

export function OutcomesPanel({ grantId }: { grantId: string }) {
  const { token } = useAuth();
  const [outcomes, setOutcomes] = useState<OutcomeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.listOutcomes(grantId, token);
      setOutcomes(page.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId, token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSaving(true);
    try {
      await api.createOutcome(
        {
          grant: grantId,
          metric_name: metricName,
          target_value: targetValue || undefined,
          actual_value: actualValue || undefined,
        },
        token,
      );
      setMetricName("");
      setTargetValue("");
      setActualValue("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add outcome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {!loading && outcomes.length === 0 && <p style={styles.muted}>No outcomes tracked yet.</p>}
      <ul style={styles.list}>
        {outcomes.map((o) => (
          <li key={o.id} style={styles.item}>
            <span style={styles.metric}>{o.metric_name}</span>
            <span style={styles.values}>
              {o.actual_value ?? "—"} / {o.target_value ?? "—"}
              {o.percent_of_target !== null && ` (${o.percent_of_target}%)`}
            </span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Metric (e.g. Youth served)"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          required
        />
        <input
          style={{ ...styles.input, width: 100 }}
          placeholder="Target"
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
        <input
          style={{ ...styles.input, width: 100 }}
          placeholder="Actual"
          type="number"
          value={actualValue}
          onChange={(e) => setActualValue(e.target.value)}
        />
        <button style={styles.button} type="submit" disabled={saving}>Add</button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  muted: { color: "#888", fontSize: 14 },
  error: { color: "#c62828", fontSize: 13 },
  list: { listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 },
  item: {
    display: "flex",
    justifyContent: "space-between",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13.5,
  },
  metric: { fontWeight: 600 },
  values: { color: "#666" },
  form: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "7px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 },
  button: { padding: "7px 14px", borderRadius: 6, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 },
};
