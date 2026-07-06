import { useEffect, useState } from "react";
import { api, type Health } from "../api";

export function Settings() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>System</h2>
      {error && <p className="bad">{error}</p>}
      {health && (
        <>
          <div className="kv">
            <b>Vault</b>
            <span>
              {health.vaultOk ? <span className="ok">✓</span> : <span className="bad">✗</span>}{" "}
              {health.vaultPath}
            </span>
          </div>
          <div className="kv">
            <b>Claude</b>
            {health.claudeCli ? (
              <span>
                <span className="ok">✓</span> {health.claudeCli} — runs on your Claude subscription, no API key
              </span>
            ) : (
              <span className="bad">✗ Claude Code CLI not found — install it, then run `claude` once to log in</span>
            )}
          </div>
          <div className="kv">
            <b>Model</b>
            <span>{health.model} (change in config.json)</span>
          </div>
          <p style={{ marginTop: 14, fontSize: 13, color: "var(--ink-soft)" }}>
            Operator prompts live in your vault under <b>02 Operators</b> — edit them in Obsidian any
            time; changes apply on the next run.
          </p>
        </>
      )}
    </div>
  );
}
