import { useCallback, useEffect, useState } from "react";
import { api, type ApiNote, type Proposal } from "./api";
import { Capture } from "./components/Capture";
import { Library } from "./components/Library";
import { NoteDetail } from "./components/NoteDetail";
import { ReviewModal } from "./components/ReviewModal";
import { Settings } from "./components/Settings";

type Tab = "inbox" | "library" | "settings";

export interface Toast {
  text: string;
  error?: boolean;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [runningOp, setRunningOp] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const refresh = useCallback(() => {
    api.notes().then(setNotes).catch((e) => showToast({ text: e.message, error: true }));
  }, []);

  useEffect(refresh, [refresh]);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), t.error ? 6000 : 3000);
  }

  async function runOperator(name: string, noteIds: string[]) {
    setRunningOp(name);
    try {
      const p = await api.runOperator(name, noteIds);
      setProposal(p);
    } catch (e) {
      showToast({ text: (e as Error).message, error: true });
    } finally {
      setRunningOp(null);
    }
  }

  async function approveProposal(payload?: Record<string, unknown>) {
    if (!proposal) return;
    try {
      const result = await api.approve(proposal.id, payload);
      setProposal(null);
      setSelectedId(null);
      refresh();
      showToast({ text: `✓ ${result.effectSummary}` });
    } catch (e) {
      showToast({ text: (e as Error).message, error: true });
    }
  }

  async function rejectProposal() {
    if (!proposal) return;
    await api.reject(proposal.id).catch(() => {});
    setProposal(null);
    showToast({ text: "Rejected — nothing was written." });
  }

  const inboxNotes = notes.filter((n) => n.relPath.startsWith("00 Inbox"));
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <>
      <header className="app">
        <h1>
          Flow Fae <span>· ContentOps</span>
        </h1>
        <nav className="tabs">
          <button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}>
            Inbox {inboxNotes.length > 0 && `(${inboxNotes.length})`}
          </button>
          <button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>
            Library
          </button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            Settings
          </button>
        </nav>
      </header>

      {tab === "inbox" && (
        <Capture
          inboxNotes={inboxNotes}
          onCaptured={() => {
            refresh();
            showToast({ text: "Captured to Inbox." });
          }}
          onError={(m) => showToast({ text: m, error: true })}
          onSelect={setSelectedId}
          onClassify={(id) => runOperator("input-classifier", [id])}
          runningOp={runningOp}
        />
      )}
      {tab === "library" && <Library notes={notes} onSelect={setSelectedId} />}
      {tab === "settings" && <Settings />}

      {selected && (
        <NoteDetail
          noteId={selected.id}
          onClose={() => setSelectedId(null)}
          onRunOperator={runOperator}
          runningOp={runningOp}
        />
      )}

      {proposal && (
        <ReviewModal proposal={proposal} onApprove={approveProposal} onReject={rejectProposal} />
      )}

      {toast && <div className={`toast${toast.error ? " error" : ""}`}>{toast.text}</div>}
    </>
  );
}
