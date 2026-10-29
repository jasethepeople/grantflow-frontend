import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import type { Funder } from "../api/client";

export function FundersPage() {
  const { token } = useAuth();
  const [funders, setFunders] = useState<Funder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const timeout = setTimeout(() => {
      api.listFunders(token, search).then((page) => {
        setFunders(page.results);
        setLoading(false);
      });
    }, 250); // debounce search-as-you-type
    return () => clearTimeout(timeout);
  }, [token, search]);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Funder Intelligence</h1>
      <input
        style={styles.search}
        placeholder="Search funders by name or focus area…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p style={styles.muted}>Loading…</p>
      ) : funders.length === 0 ? (
        <p style={styles.muted}>No funders found. Add them from the Django admin for now.</p>
      ) : (
        <ul style={styles.list}>
          {funders.map((funder) => (
            <li key={funder.id} style={styles.card}>
              <button style={styles.cardHeader} onClick={() => setExpanded(expanded === funder.id ? null : funder.id)}>
                <div>
                  <div style={styles.cardTitle}>{funder.name}</div>
                  <div style={styles.cardMeta}>
                    {funder.funder_type.replace("_", " ")}
                    {funder.focus_areas && ` · ${funder.focus_areas}`}
                  </div>
                </div>
                <span style={styles.chevron}>{expanded === funder.id ? "−" : "+"}</span>
              </button>

              {expanded === funder.id && (
                <div style={styles.programs}>
                  {funder.programs.length === 0 && <p style={styles.muted}>No programs on file yet.</p>}
                  {funder.programs.map((program) => (
                    <div key={program.id} style={styles.program}>
                      <div style={styles.programTitle}>{program.name}</div>
                      <div style={styles.programMeta}>
                        {program.next_deadline && `Next deadline: ${program.next_deadline}`}
                        {program.deadline_recurrence && ` (${program.deadline_recurrence})`}
                      </div>
                      {(program.typical_award_min || program.typical_award_max) && (
                        <div style={styles.programMeta}>
                          Typical award: ${program.typical_award_min ?? "?"} – ${program.typical_award_max ?? "?"}
                        </div>
                      )}
                      {program.program_officer_name && (
                        <div style={styles.programMeta}>
                          Program officer: {program.program_officer_name}
                          {program.program_officer_email && ` (${program.program_officer_email})`}
                        </div>
                      )}
                      {program.program_officer_notes && <p style={styles.notes}>{program.program_officer_notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "32px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" },
  heading: { fontSize: 22, marginBottom: 14 },
  search: { width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #ccc", fontSize: 14, marginBottom: 16 },
  muted: { color: "#888", fontSize: 14 },
  list: { listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  card: { border: "1px solid #eee", borderRadius: 8, overflow: "hidden" },
  cardHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  cardTitle: { fontWeight: 600, fontSize: 14.5 },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 2, textTransform: "capitalize" },
  chevron: { fontSize: 18, color: "#999" },
  programs: { padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 },
  program: { borderTop: "1px solid #f4f4f4", paddingTop: 10 },
  programTitle: { fontWeight: 600, fontSize: 13.5 },
  programMeta: { fontSize: 12, color: "#777", marginTop: 2 },
  notes: { fontSize: 12.5, color: "#444", marginTop: 6, background: "#fafafa", padding: 8, borderRadius: 6 },
};
