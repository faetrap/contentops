import { useEffect, useState } from "react";
import { api, type Proposal } from "../api";

interface Props {
  proposal: Proposal;
  onApprove: (payload?: Record<string, unknown>) => void;
  onReject: () => void;
}

const pretty = (s: string) => {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Review UI. Fields with a controlled vocabulary (from system/tags.md via
 * /api/vocab) render as dropdowns / tag pickers so tags stay consistent;
 * everything else stays freely editable. Approve sends the (possibly edited)
 * payload back; the server re-validates.
 */
export function ReviewModal({ proposal, onApprove, onReject }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown>>({ ...proposal.payload });
  const [vocab, setVocab] = useState<Record<string, (string | number)[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.vocab(proposal.operatorName).then(setVocab).catch(() => setVocab({}));
  }, [proposal.operatorName]);

  function set(key: string, value: unknown) {
    setPayload((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>Review · {pretty(proposal.operatorName.replaceAll("-", " "))}</h2>
        <p className="effect">On approve: {proposal.effectPreview}</p>

        {Object.entries(payload).map(([key, value]) => {
          const options = vocab[key];
          return (
            <div className="field" key={key}>
              <label>{pretty(key)}</label>
              {Array.isArray(value) && options ? (
                <TagPicker
                  selected={value.map(String)}
                  options={options.map(String)}
                  onChange={(next) => set(key, next)}
                />
              ) : Array.isArray(value) ? (
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
              ) : options ? (
                <select
                  value={String(value ?? "")}
                  onChange={(e) =>
                    set(key, typeof value === "number" ? Number(e.target.value) : e.target.value)
                  }
                >
                  {!options.map(String).includes(String(value ?? "")) && (
                    <option value={String(value ?? "")}>{pretty(String(value ?? ""))}</option>
                  )}
                  {options.map((o) => (
                    <option key={String(o)} value={String(o)}>
                      {typeof o === "number" ? o : pretty(String(o))}
                    </option>
                  ))}
                </select>
              ) : typeof value === "string" && value.length > 60 ? (
                <textarea rows={3} value={value} onChange={(e) => set(key, e.target.value)} />
              ) : (
                <input type="text" value={String(value ?? "")} onChange={(e) => set(key, e.target.value)} />
              )}
            </div>
          );
        })}

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

/** Selected tags as removable chips + a dropdown of remaining options + custom add. */
function TagPicker({
  selected,
  options,
  onChange,
}: {
  selected: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const remaining = options.filter((o) => !selected.includes(o));
  return (
    <div className="tagpicker">
      <div className="tagpicker-chips">
        {selected.map((tag) => (
          <span className="picked" key={tag}>
            {tag}
            <button title="Remove" onClick={() => onChange(selected.filter((t) => t !== tag))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="tagpicker-add">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...selected, e.target.value]);
          }}
        >
          <option value="">Add a tag…</option>
          {remaining.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Or type your own"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && custom.trim()) {
              onChange([...selected, custom.trim()]);
              setCustom("");
            }
          }}
        />
      </div>
    </div>
  );
}
