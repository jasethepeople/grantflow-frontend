import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api/client";
import { ApiError, type GrantSection } from "../api/client";
import { CollabEditor } from "../collab/CollabEditor";

const SECTION_TYPES: { value: string; label: string }[] = [
  { value: "executive_summary", label: "Executive Summary" },
  { value: "statement_of_need", label: "Statement of Need" },
  { value: "goals_objectives", label: "Goals & Objectives" },
  { value: "methodology", label: "Methodology / Program Design" },
  { value: "evaluation_plan", label: "Evaluation Plan" },
  { value: "organizational_capacity", label: "Organizational Capacity" },
  { value: "sustainability", label: "Sustainability Plan" },
  { value: "budget_narrative", label: "Budget Narrative" },
  { value: "other", label: "Other" },
];

function randomClientId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function SectionsPanel({ grantId }: { grantId: string }) {
  const { token } = useAuth();
  const [sections, setSections] = useState<GrantSection[]>([]);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionType, setSectionType] = useState("statement_of_need");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId] = useState(randomClientId);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.listSections(grantId, token);
      setSections(page.results.sort((a, b) => a.order - b.order));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId, token]);

  async function handleAddSection(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setCreating(true);
    try {
      const label = SECTION_TYPES.find((t) => t.value === sectionType)?.label ?? sectionType;
      await api.createSection(
        { grant: grantId, section_type: sectionType, title: label, order: sections.length + 1 },
        token,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add section.");
    } finally {
      setCreating(false);
    }
  }

  const openSection = sections.find((s) => s.id === openSectionId) ?? null;

  return (
    <div>
      <ul style={styles.list}>
        {sections.map((section) => (
          <li key={section.id} style={styles.item}>
            <button style={styles.itemButton} onClick={() => setOpenSectionId(section.id)}>
              <span style={styles.itemTitle}>{section.title}</span>
              <span style={styles.itemMeta}>
                {section.current_word_count} words
                {section.word_limit ? ` / ${section.word_limit} limit` : ""}
                {section.current_version?.source === "ai_generated" ? " · AI draft" : ""}
              </span>
            </button>
          </li>
        ))}
        {!loading && sections.length === 0 && <p style={styles.muted}>No sections yet — add one below.</p>}
      </ul>

      <form onSubmit={handleAddSection} style={styles.addForm}>
        <select style={styles.select} value={sectionType} onChange={(e) => setSectionType(e.target.value)}>
          {SECTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button style={styles.button} type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add Section"}
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}

      {openSection && token && (
        <div style={styles.editorWrap}>
          <div style={styles.editorHeader}>
            <span>{openSection.title}</span>
            <button style={styles.closeButton} onClick={() => setOpenSectionId(null)}>Close</button>
          </div>
          <CollabEditor
            sectionId={openSection.id}
            token={token}
            initialContentHTML={openSection.current_version?.content ?? ""}
            clientId={clientId}
            onVersionSaved={load}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 },
  item: { border: "1px solid #eee", borderRadius: 8 },
  itemButton: {
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  itemTitle: { fontWeight: 600, fontSize: 14 },
  itemMeta: { fontSize: 12, color: "#888" },
  muted: { color: "#888", fontSize: 14 },
  error: { color: "#c62828", fontSize: 13 },
  addForm: { display: "flex", gap: 8, marginBottom: 8 },
  select: { padding: "7px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, flex: 1 },
  button: { padding: "7px 14px", borderRadius: 6, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontSize: 13 },
  editorWrap: { marginTop: 16 },
  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13.5,
    fontWeight: 600,
    marginBottom: 8,
  },
  closeButton: { border: "none", background: "none", color: "#666", cursor: "pointer", fontSize: 12.5 },
};
