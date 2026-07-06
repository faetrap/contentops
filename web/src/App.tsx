import { useCallback, useEffect, useState } from "react";
import { api, type ApiNote, type Proposal } from "./api";
import { Canvas } from "./components/Canvas";
import { Library } from "./components/Library";
import { NoteDetail } from "./components/NoteDetail";
import { ReviewModal } from "./components/ReviewModal";
import { Settings } from "./components/Settings";

type Tab = "canvas" | "list" | "settings";

export interface Toast {
  text: string;
  error?: boolean;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("canvas");
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [selected, setSelected] = useState<{ id: string; edit: boolean } | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [runningOp, setRunningOp] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const refresh = useCallback(() => {
    api.notes().then(setNotes).catch((e) => showToast({ text: e.message, error: true }));
  }, []);

  // Self-healing data: retry quickly while empty (e.g. server was restarting),
  // refetch when the tab regains focus, and keep a slow background sync.
  useEffect(() => {
    let alive = true;
    let empty = true;
    const load = () =>
      api
        .notes()
        .then((n) => {
          if (!alive) return;
          setNotes(n);
          empty = false;
        })
        .catch(() => {});
    load();
    const fast = setInterval(() => empty && load(), 3000);
    const slow = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      clearInterval(fast);
      clearInterval(slow);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function showToast(t: Toast) {
    setToast(t);
    setTimeout(() => setToast(null), t.error ? 6000 : 3000);
  }

  const runOperator = useCallback(async (name: string, noteIds: string[]) => {
    setRunningOp(name);
    try {
      setProposal(await api.runOperator(name, noteIds));
    } catch (e) {
      showToast({ text: (e as Error).message, error: true });
    } finally {
      setRunningOp(null);
    }
  }, []);

  async function approveProposal(payload?: Record<string, unknown>) {
    if (!proposal) return;
    try {
      const result = await api.approve(proposal.id, payload);
      setProposal(null);
      setSelected(null);
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

  return (
    <div className="app-shell">
      <header className="app">
        <h1>
          Flow Fae <span>· ContentOps</span>
        </h1>
        <nav className="tabs">
          <button className={tab === "canvas" ? "active" : ""} onClick={() => setTab("canvas")}>
            Canvas
          </button>
          <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
            List
          </button>
          <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {tab === "canvas" && (
          <Canvas
            notes={notes}
            runningOp={runningOp}
            onRun={runOperator}
            onOpen={(id) => setSelected({ id, edit: false })}
            onEdit={(id) => setSelected({ id, edit: true })}
            onArchive={async (id) => {
              try {
                await api.archiveNote(id);
                refresh();
                showToast({ text: "Binned — it's kept in List → Archived (restorable)." });
              } catch (e) {
                showToast({ text: (e as Error).message, error: true });
              }
            }}
            onCaptured={() => {
              refresh();
              showToast({ text: "Captured to your board." });
            }}
            onError={(m) => showToast({ text: m, error: true })}
            onInfo={(m) => showToast({ text: m })}
          />
        )}
        {tab === "list" && (
          <div className="scroll-pane">
            <Library
              notes={notes}
              onSelect={(id) => setSelected({ id, edit: false })}
              onRestore={async (id) => {
                try {
                  await api.restoreNote(id);
                  refresh();
                  showToast({ text: "Restored — it's back on the board." });
                } catch (e) {
                  showToast({ text: (e as Error).message, error: true });
                }
              }}
            />
          </div>
        )}
        {tab === "settings" && (
          <div className="scroll-pane">
            <Settings />
          </div>
        )}
      </main>

      {selected && (
        <NoteDetail
          noteId={selected.id}
          startEditing={selected.edit}
          onClose={() => setSelected(null)}
          onRunOperator={runOperator}
          runningOp={runningOp}
          onSaved={() => {
            refresh();
            showToast({ text: "Saved to your vault." });
          }}
        />
      )}

      {proposal && (
        <ReviewModal proposal={proposal} onApprove={approveProposal} onReject={rejectProposal} />
      )}

      {toast && <div className={`toast${toast.error ? " error" : ""}`}>{toast.text}</div>}
    </div>
  );
}
