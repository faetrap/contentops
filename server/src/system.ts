import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads the source-of-truth "brain" files from system/ in the repo.
 * Read fresh on every operator run so edits to the brain apply immediately —
 * GitHub repo = build/system, Obsidian vault = creative database.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const systemDir = path.join(repoRoot, "system");

function read(name: string): string {
  try {
    return fs.readFileSync(path.join(systemDir, name), "utf8");
  } catch {
    return "";
  }
}

export type SystemFile = "content" | "visual";

export function systemContext(kind: SystemFile): string {
  const file = kind === "content" ? "content.md" : "visual.md";
  const body = read(file).trim();
  if (!body) return "";
  return `=== SYSTEM FILE: ${file} — the source of truth. Obey it over any other instinct. ===\n\n${body}`;
}

/** The Anti-Drift constitution from system/README.md — appended to every run. */
export function antiDriftRule(): string {
  const readme = read("README.md");
  const idx = readme.indexOf("## The Anti-Drift Rule");
  if (idx === -1) return "";
  return `=== ANTI-DRIFT CONSTITUTION (hard rules) ===\n\n${readme.slice(idx).trim()}`;
}
