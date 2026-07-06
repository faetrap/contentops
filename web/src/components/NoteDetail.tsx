import { useEffect, useState } from "react";
import { api, assetUrl, type ApiNote } from "../api";

interface Props {
  noteId: string;
  onClose: () => void;
  onRunOperator: (name: string, noteIds: string[]) => void;
  runningOp: string | null;
  onSaved?: () => void;
  startEditing?: boolean;
}

export function NoteDetail({ noteId, onClose, onRunOperator, runningOp, onSaved, startEditing }: Props) {
  const [note, setNote] = useState<ApiNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(startEditing ?? false);
  const [draftBody, setDraftBody] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .note(noteId)
      .then((n) => {
        setNote(n);
        setDraftBody(n.body);
        setDraftSummary((n.frontmatter.summary as string) ?? "");
      })
      .catch((e) => setError(e.message));
  }, [noteId]);

  const images = note ? [...note.body.matchAll(/!\[\[([^\]]+)\]\]/g)].map((m) => m[1]) : [];
  const textBody =
    note?.body
      .replace(/!\[\[[^\]]+\]\]/g, "")
      .replace(/^#+\s+/gm, "") // headings render as plain section titles, not raw ##
      .trim() ?? "";
  const hasSummary = note ? note.frontmatter.summary !== undefined : false;

  async function save() {
    if (!note) return;
    setSaving(true);
    try {
      const patch: { body?: string; summary?: string } = { body: draftBody };
      if (hasSummary) patch.summary = draftSummary;
      const updated = await api.updateNote(note.id, patch);
      setNote(updated);
      setEditing(false);
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {error && <p className="bad">{error}</p>}
        {note && !editing && (
          <>
            <h2>{(note.frontmatter.summary as string) || textBody.split("\n")[0]?.slice(0, 70) || "Note"}</h2>
            <p className="effect">{note.relPath}</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <span className={`badge ${note.frontmatter.status}`}>
                {note.frontmatter.status.charAt(0).toUpperCase() + note.frontmatter.status.slice(1)}
              </span>
              {note.frontmatter.type !== note.frontmatter.status && (
                <span className="badge badge-type">
                  {(note.frontmatter.type.charAt(0).toUpperCase() + note.frontmatter.type.slice(1)).replaceAll("_", " ")}
                </span>
              )}
              {typeof note.frontmatter.pillar === "string" && note.frontmatter.pillar && (
                <span className="badge">{note.frontmatter.pillar}</span>
              )}
            </div>
            {textBody && <div className="detail-body">{textBody}</div>}
            {images.map((img) => (
              <img key={img} className="detail-img" src={assetUrl(img)} alt="" />
            ))}
            {(note.operators ?? []).length > 0 && (
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 14, textAlign: "right" }}>
                These buttons run on this card only — wires on the board aren't included.
              </p>
            )}
            <div className="actions">
              <button className="ghost" onClick={onClose}>
                Close
              </button>
              <button className="ghost" onClick={() => setEditing(true)}>
                ✏️ Edit
              </button>
              {(note.operators ?? []).map((op) => (
                <button
                  key={op.name}
                  className="primary"
                  disabled={runningOp !== null}
                  title={op.description}
                  onClick={() => onRunOperator(op.name, [note.id])}
                >
                  {runningOp === op.name ? <span className="spinner" /> : null}
                  {op.label}
                </button>
              ))}
            </div>
          </>
        )}
        {note && editing && (
          <>
            <h2>Edit note</h2>
            <p className="effect">{note.relPath} — saves straight into your Obsidian vault</p>
            {hasSummary && (
              <div className="field">
                <label>Summary (shown on the card)</label>
                <input type="text" value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Note text</label>
              <textarea rows={8} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
              {images.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                  Keep the <code>![[…]]</code> line to keep the image attached.
                </p>
              )}
            </div>
            <div className="actions">
              <button
                className="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setDraftBody(note.body);
                  setDraftSummary((note.frontmatter.summary as string) ?? "");
                }}
              >
                Cancel
              </button>
              <button className="primary" disabled={saving} onClick={save}>
                {saving ? <span className="spinner" /> : null}
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
