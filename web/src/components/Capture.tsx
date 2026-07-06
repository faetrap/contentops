import { useRef, useState } from "react";
import { api, type ApiNote } from "../api";
import { NoteRow } from "./Library";

interface Props {
  inboxNotes: ApiNote[];
  onCaptured: () => void;
  onError: (message: string) => void;
  onSelect: (id: string) => void;
  onClassify: (id: string) => void;
  runningOp: string | null;
}

export function Capture({ inboxNotes, onCaptured, onError, onSelect, onClassify, runningOp }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!text.trim() && !image) return;
    setBusy(true);
    try {
      await api.capture(text, image);
      setText("");
      setImage(null);
      onCaptured();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <textarea
          rows={3}
          placeholder="Drop a thought, a hook, a trend, a line from class…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div
          className={`dropzone${dragOver ? " over" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) setImage(file);
          }}
        >
          {image ? `📎 ${image.name}` : "Drag a screenshot here, or click to choose"}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="actions">
          {image && (
            <button className="ghost" onClick={() => setImage(null)}>
              Remove image
            </button>
          )}
          <button className="primary" disabled={busy || (!text.trim() && !image)} onClick={submit}>
            {busy ? <span className="spinner" /> : null}
            Capture
          </button>
        </div>
      </div>

      <h3 style={{ margin: "18px 0 10px", fontSize: 15 }}>Waiting in Inbox</h3>
      {inboxNotes.length === 0 && <div className="empty">Inbox is clear ✨</div>}
      {inboxNotes.map((n) => (
        <NoteRow
          key={n.id}
          note={n}
          onSelect={onSelect}
          action={
            <button
              className="primary"
              disabled={runningOp !== null}
              onClick={(e) => {
                e.stopPropagation();
                onClassify(n.id);
              }}
            >
              {runningOp === "input-classifier" ? <span className="spinner" /> : null}
              Classify
            </button>
          }
        />
      ))}
    </>
  );
}
