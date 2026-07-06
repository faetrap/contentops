import { useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Props {
  onCaptured: () => void;
  onError: (message: string) => void;
}

/** Compact floating capture panel that sits on top of the canvas. */
export function CaptureBar({ onCaptured, onError }: Props) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Paste a photo anywhere on the board (⌘V) and it attaches here.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (!item) return; // plain text pastes stay untouched
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      const named = new File([file], file.name || `pasted-${Date.now()}.png`, { type: file.type });
      setImage(named);
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

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
    <div
      className={`capture-bar${dragOver || flash ? " over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) setImage(file);
      }}
    >
      <textarea
        rows={1}
        placeholder="Drop a thought, a hook, a line from class…  (paste ⌘V or drag a screenshot)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      <button className="ghost" title="Attach image" onClick={() => fileInput.current?.click()}>
        {image ? "📎¹" : "📎"}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
      />
      <button className="primary" disabled={busy || (!text.trim() && !image)} onClick={submit}>
        {busy ? <span className="spinner" /> : "＋"} Capture
      </button>
    </div>
  );
}
