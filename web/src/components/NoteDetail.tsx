import { useEffect, useState } from "react";
import { api, assetUrl, type ApiNote } from "../api";

interface Props {
  noteId: string;
  onClose: () => void;
  onRunOperator: (name: string, noteIds: string[]) => void;
  runningOp: string | null;
}

export function NoteDetail({ noteId, onClose, onRunOperator, runningOp }: Props) {
  const [note, setNote] = useState<ApiNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.note(noteId).then(setNote).catch((e) => setError(e.message));
  }, [noteId]);

  const images = note ? [...note.body.matchAll(/!\[\[([^\]]+)\]\]/g)].map((m) => m[1]) : [];
  const textBody = note?.body.replace(/!\[\[[^\]]+\]\]/g, "").trim() ?? "";

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {error && <p className="bad">{error}</p>}
        {note && (
          <>
            <h2>{(note.frontmatter.summary as string) || textBody.split("\n")[0]?.slice(0, 70) || "Note"}</h2>
            <p className="effect">{note.relPath}</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <span className={`badge ${note.frontmatter.status}`}>{note.frontmatter.status}</span>
              <span className="badge">{note.frontmatter.type.replaceAll("_", " ")}</span>
              {typeof note.frontmatter.pillar === "string" && note.frontmatter.pillar && (
                <span className="badge">{note.frontmatter.pillar}</span>
              )}
            </div>
            {textBody && <div className="detail-body">{textBody}</div>}
            {images.map((img) => (
              <img key={img} className="detail-img" src={assetUrl(img)} alt="" />
            ))}
            <div className="actions">
              <button className="ghost" onClick={onClose}>
                Close
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
      </div>
    </div>
  );
}
