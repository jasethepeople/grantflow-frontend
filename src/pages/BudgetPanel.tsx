import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import { ApiError, type Budget, type BudgetLineItem } from "../api/client";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "personnel", label: "Personnel" },
  { value: "fringe_benefits", label: "Fringe Benefits" },
  { value: "travel", label: "Travel" },
  { value: "equipment", label: "Equipment" },
  { value: "supplies", label: "Supplies" },
  { value: "contractual", label: "Contractual" },
  { value: "other", label: "Other Direct Costs" },
];

const BASES: { value: Budget["indirect_cost_base"]; label: string }[] = [
  { value: "total_direct", label: "Total Direct Costs" },
  { value: "mtdc", label: "Modified Total Direct Costs (MTDC)" },
  { value: "salaries_wages", label: "Salaries & Wages Only" },
];

export function BudgetPanel({ grantId }: { grantId: string }) {
  const { token } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("personnel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [exempt, setExempt] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const b = await api.getBudgetForGrant(grantId, token);
      setBudget(b);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId, token]);

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!token || !budget) return;
    setError(null);
    setSavingItem(true);
    try {
      await api.createBudgetLineItem(
        { budget: budget.id, category, description, amount, is_indirect_base_exempt: exempt },
        token,
      );
      setDescription("");
      setAmount("");
      setExempt(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add line item.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(item: BudgetLineItem) {
    if (!token) return;
    await api.deleteBudgetLineItem(item.id, token);
    await load();
  }

  async function handleIndirectSettingsChange(field: "indirect_cost_rate" | "indirect_cost_base", value: string) {
    if (!token || !budget) return;
    const updated = await api.updateBudget(budget.id, { [field]: value }, token);
    setBudget(updated);
  }

  if (loading) return <p style={styles.muted}>Loading budget…</p>;
  if (!budget) return <p style={styles.muted}>No budget found for this grant.</p>;

  return (
    <div>
      <div style={styles.settingsRow}>
        <label style={styles.settingsLabel}>
          Indirect cost rate (%)
          <input
            style={styles.smallInput}
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={budget.indirect_cost_rate}
            onBlur={(e) => handleIndirectSettingsChange("indirect_cost_rate", e.target.value)}
          />
        </label>
        <label style={styles.settingsLabel}>
          Indirect cost base
          <select
            style={styles.smallInput}
            value={budget.indirect_cost_base}
            onChange={(e) => handleIndirectSettingsChange("indirect_cost_base", e.target.value)}
          >
            {BASES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </label>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Description</th>
            <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
            <th style={styles.th}>Exempt from base</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {budget.line_items.map((item) => (
            <tr key={item.id}>
              <td style={styles.td}>{CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}</td>
              <td style={styles.td}>{item.description}</td>
              <td style={{ ...styles.td, textAlign: "right" }}>${item.amount}</td>
              <td style={styles.td}>{item.is_indirect_base_exempt ? "Yes" : ""}</td>
              <td style={styles.td}>
                <button style={styles.removeButton} onClick={() => handleDeleteItem(item)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleAddItem} style={styles.addForm}>
        <select style={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          style={{ ...styles.smallInput, flex: 1 }}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          style={{ ...styles.smallInput, width: 110 }}
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <label style={styles.checkboxLabel}>
          <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} />
          Exempt
        </label>
        <button style={styles.button} type="submit" disabled={savingItem}>Add</button>
      </form>
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.summary}>
        <SummaryRow label="Total direct costs" value={budget.summary.total_direct_costs} />
        <SummaryRow label="Indirect cost base amount" value={budget.summary.indirect_cost_base_amount} />
        <SummaryRow label={`Indirect costs (${budget.summary.indirect_cost_rate}%)`} value={budget.summary.indirect_costs} />
        <SummaryRow label="Total budget" value={budget.summary.total_budget} bold />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ ...styles.summaryRow, fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>${value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  muted: { color: "#888", fontSize: 14 },
  error: { color: "#c62828", fontSize: 13 },
  settingsRow: { display: "flex", gap: 24, marginBottom: 16 },
  settingsLabel: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: "#555" },
  smallInput: { padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 },
  select: { padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 12 },
  th: { textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px", color: "#666", fontWeight: 600 },
  td: { borderBottom: "1px solid #f4f4f4", padding: "6px 4px" },
  removeButton: { border: "none", background: "none", color: "#c62828", cursor: "pointer", fontSize: 12.5 },
  addForm: { display: "flex", gap: 8, alignItems: "center", marginBottom: 16 },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, whiteSpace: "nowrap" },
  button: { padding: "7px 14px", borderRadius: 6, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 },
  summary: { border: "1px solid #eee", borderRadius: 8, padding: 12, maxWidth: 320, marginLeft: "auto" },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0" },
};
