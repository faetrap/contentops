import { useState } from "react";
import type { Proposal } from "../api";

interface Props {
  proposal: Proposal;
  onApprove: (payload?: Record<string, unknown>) => void;
  onReject: () => void;
}

/**
 * Generic review UI: renders every field of the operator payload as an
 * editable control (string → textarea, string[] → list, number → number).
 * Approve sends the (possibly edited) payload back; the server re-validates.
 */
export function ReviewModal({ proposal, onApprove, onReject }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown>>({ ...proposal.payload });
  const [busy, setBusy] = useState(false);

  function set(key: string, value: unknown) {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Review · {proposal.operatorName.replaceAll("-", " ")}</h2>
        <p className="effect">On approve: {proposal.effectPreview}</p>

        {Object.entries(payload).map(([key, value]) => (
          <div className="field" key={key}>
            <label>{key.replaceAll("_", " ")}</label>
            {Array.isArray(value) ? (
              <ul className="hook-list">
                {(value as unknown[]).map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: 8 }}>
                    <textarea
                      rows={1}
                      style={{ flex: 1 }}
                      value={String(item)}
                      onChange={(e) => {
                        const next = [...(value as unknown[])];
                        next[i] = e.target.value;
                        set(key, next);
                      }}
                    />
                    <button
                      className="danger"
                      title="Remove"
                      onClick={() => set(key, (value as unknown[]).filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : typeof value === "number" ? (
              <input
                type="text"
                inputMode="numeric"
                value={String(value)}
                onChange={(e) => set(key, Number(e.target.value) || value)}
              />
            ) : typeof value === "string" && value.length > 60 ? (
              <textarea rows={3} value={value} onChange={(e) => set(key, e.target.value)} />
            ) : (
              <input type="text" value={String(value ?? "")} onChange={(e) => set(key, e.target.value)} />
            )}
          </div>
        ))}

        <div className="actions">
          <button className="danger" disabled={busy} onClick={onReject}>
            Reject
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              onApprove(payload);
            }}
          >
            {busy ? <span className="spinner" /> : null}
            Approve & write to vault
          </button>
        </div>
      </div>
    </div>
  );
}
