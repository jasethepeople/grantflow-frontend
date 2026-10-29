import { useState } from "react";
import { useCollabEditor } from "./useCollabEditor";
import { saveSectionVersion, generateSectionDraft, type SectionVersion } from "../api/client";

export interface CollabEditorProps {
  sectionId: string;
  token: string;
  initialContentHTML: string;
  clientId: string;
  wsBaseUrl?: string;
  onVersionSaved?: (version: SectionVersion) => void;
}

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  connected: "Live",
  disconnected: "Disconnected",
  error: "Connection error",
};

const STATUS_COLOR: Record<string, string> = {
  connecting: "#b58900",
  connected: "#2e7d32",
  disconnected: "#757575",
  error: "#c62828",
};

export function CollabEditor({
  sectionId,
  token,
  initialContentHTML,
  clientId,
  wsBaseUrl,
  onVersionSaved,
}: CollabEditorProps) {
  const { editorRef, status, errorMessage, getCurrentHTML } = useCollabEditor({
    sectionId,
    token,
    initialContentHTML,
    clientId,
    wsBaseUrl,
  });

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setActionError(null);
    try {
      const version = await saveSectionVersion(sectionId, getCurrentHTML(), token, "human");
      onVersionSaved?.(version);
      setSavedNotice(`Saved as version ${version.version_number} (${version.source}).`);
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save version.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setActionError(null);
    try {
      const version = await generateSectionDraft(sectionId, token);
      onVersionSaved?.(version);
      setSavedNotice(`Saved as version ${version.version_number} (${version.source}).`);
      setTimeout(() => setSavedNotice(null), 4000);
      // The AI-generated version is now the section's baseline; a page/data
      // refresh is needed to load it into the editor since this component
      // doesn't overwrite in-progress live edits out from under the user.
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to generate draft.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderBottom: "1px solid #eee",
          background: "#fafafa",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: STATUS_COLOR[status],
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STATUS_COLOR[status],
              display: "inline-block",
            }}
          />
          {STATUS_LABEL[status]}
        </span>

        <div style={{ flex: 1 }} />

        <button onClick={handleGenerate} disabled={generating} style={buttonStyle}>
          {generating ? "Generating…" : "AI Draft"}
        </button>
        <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle, fontWeight: 600 }}>
          {saving ? "Saving…" : "Save Version"}
        </button>
      </div>

      {savedNotice && (
        <div style={{ padding: "6px 12px", background: "#e8f5e9", color: "#2e7d32", fontSize: 13 }}>
          {savedNotice}
        </div>
      )}

      {(errorMessage || actionError) && (
        <div style={{ padding: "6px 12px", background: "#fdecea", color: "#c62828", fontSize: 13 }}>
          {errorMessage ?? actionError}
        </div>
      )}

      <div ref={editorRef} style={{ minHeight: 240, padding: 16, outline: "none" }} />
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
