import { useState, type ReactNode } from "react";
import type { ApiNote } from "../api";

const TYPES = [
  "unclassified",
  "visual_reference",
  "hook",
  "trend",
  "yoga_note",
  "personal_reflection",
  "tarot_chakra_philosophy",
  "idea",
  "design_brief",
  "carousel_draft",
];
const STATUSES = ["raw", "processed", "idea", "draft", "approved", "posted", "archived"];

const pretty = (s: string) => {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

interface Props {
  notes: ApiNote[];
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
}

export function Library({ notes, onSelect, onRestore }: Props) {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const filtered = notes.filter(
    (n) => (!type || n.frontmatter.type === type) && (!status || n.frontmatter.status === status)
  );

  return (
    <>
      <div className="tag-filters">
        <span className="tag-label">Type</span>
        <div className="tag-row">
          <button className={`tag tag-type${type === "" ? " on" : ""}`} onClick={() => setType("")}>
            All
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={`tag tag-type${type === t ? " on" : ""}`}
              onClick={() => setType(type === t ? "" : t)}
            >
              {pretty(t)}
            </button>
          ))}
        </div>
        <span className="tag-label">Status</span>
        <div className="tag-row">
          <button className={`tag tag-status${status === "" ? " on" : ""}`} onClick={() => setStatus("")}>
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`tag tag-status${status === s ? " on" : ""}`}
              onClick={() => setStatus(status === s ? "" : s)}
            >
              {pretty(s)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 && <div className="empty">Nothing here yet.</div>}
      {filtered.map((n) => (
        <NoteRow
          key={n.id}
          note={n}
          onSelect={onSelect}
          action={
            n.frontmatter.status === "archived" ? (
              <button
                className="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(n.id);
                }}
              >
                ↩︎ Restore
              </button>
            ) : undefined
          }
        />
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
        <span className={`badge ${note.frontmatter.status}`}>{pretty(note.frontmatter.status)}</span>
        <span className="badge badge-type">{pretty(note.frontmatter.type)}</span>
        {action}
      </div>
    </div>
  );
}
