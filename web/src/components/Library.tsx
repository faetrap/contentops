import { useState, type ReactNode } from "react";
import type { ApiNote } from "../api";

const TYPES = [
  "",
  "unclassified",
  "visual_reference",
  "hook",
  "trend",
  "yoga_note",
  "personal_reflection",
  "tarot_chakra_philosophy",
  "idea",
];
const STATUSES = ["", "raw", "processed", "idea", "draft", "approved", "posted", "archived"];

export function Library({ notes, onSelect }: { notes: ApiNote[]; onSelect: (id: string) => void }) {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const filtered = notes.filter(
    (n) => (!type || n.frontmatter.type === type) && (!status || n.frontmatter.status === status)
  );

  return (
    <>
      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "All types" : t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 && <div className="empty">Nothing here yet.</div>}
      {filtered.map((n) => (
        <NoteRow key={n.id} note={n} onSelect={onSelect} />
      ))}
    </>
  );
}

export function NoteRow({
  note,
  onSelect,
  action,
}: {
  note: ApiNote;
  onSelect: (id: string) => void;
  action?: ReactNode;
}) {
  const title =
    (note.frontmatter.summary as string) ||
    note.body.split("\n")[0]?.replace(/!\[\[.*\]\]/, "📷 image") ||
    note.relPath;
  return (
    <div className="note-row" onClick={() => onSelect(note.id)}>
      <div style={{ minWidth: 0 }}>
        <div className="note-title">{title.slice(0, 90)}</div>
        <div className="note-sub">
          {note.frontmatter.created} · {note.relPath.split("/").slice(0, -1).join(" / ")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <span className={`badge ${note.frontmatter.status}`}>{note.frontmatter.status}</span>
        <span className="badge">{note.frontmatter.type.replaceAll("_", " ")}</span>
        {action}
      </div>
    </div>
  );
}
