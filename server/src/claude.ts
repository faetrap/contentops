import { spawn } from "node:child_process";
import { z } from "zod";

/**
 * Runs prompts through the Claude Code CLI in headless mode (`claude -p`).
 * Auth comes from the owner's logged-in Claude Pro/Max session — no API key.
 *
 * Learnings baked in from the verified spike:
 * - Output wraps JSON in prose/fenced blocks → extract + validate, retry once.
 * - The CLI inherits the user's global CLAUDE.md and hooks → `--setting-sources ""`.
 */

const TIMEOUT_MS = 180_000;

export class ClaudeAuthError extends Error {}
export class ClaudeOutputError extends Error {}

interface RunOptions {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  /** Absolute dir the CLI may read from (for image inputs). */
  addDir?: string;
  allowRead?: boolean;
}

interface CliEnvelope {
  is_error?: boolean;
  result?: string;
  subtype?: string;
}

/** Serialized queue — one Claude call at a time. */
let queue: Promise<unknown> = Promise.resolve();

export function runClaudeJSON<T>(schema: z.ZodType<T>, opts: RunOptions): Promise<T> {
  const task = queue.then(() => runWithRetry(schema, opts));
  // Keep the queue alive even if this task fails.
  queue = task.catch(() => {});
  return task;
}

async function runWithRetry<T>(schema: z.ZodType<T>, opts: RunOptions): Promise<T> {
  const first = await runOnce(opts);
  const parsed = extractAndValidate(schema, first);
  if (parsed.ok) return parsed.value;

  // One retry with an explicit corrective nudge.
  const retry = await runOnce({
    ...opts,
    userPrompt:
      `${opts.userPrompt}\n\nYour previous reply could not be parsed ` +
      `(${parsed.error}). Respond again with ONLY one fenced \`\`\`json block ` +
      `containing a single JSON object that matches the required schema. No other text.`,
  });
  const second = extractAndValidate(schema, retry);
  if (second.ok) return second.value;
  throw new ClaudeOutputError(`Claude did not return valid structured output: ${second.error}`);
}

function runOnce(opts: RunOptions): Promise<string> {
  const args = [
    "-p",
    "--output-format", "json",
    "--model", opts.model,
    "--setting-sources", "",
    "--append-system-prompt",
    opts.systemPrompt +
      "\n\nCRITICAL: Respond with ONLY one fenced ```json code block containing a single JSON object. No prose before or after.",
  ];
  if (opts.addDir) args.push("--add-dir", opts.addDir);
  if (opts.allowRead) args.push("--allowedTools", "Read");

  return new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ClaudeOutputError("Claude call timed out after 3 minutes."));
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new ClaudeAuthError("Claude Code CLI not found. Install it, then run `claude` once to log in."));
      } else {
        reject(err);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const combined = stdout + stderr;
      if (/log ?in|authenticate|not authenticated|OAuth|credentials/i.test(combined) && code !== 0) {
        reject(new ClaudeAuthError("Claude isn't logged in on this Mac. Open Terminal, run `claude`, log in once, then try again."));
        return;
      }
      try {
        const envelope = JSON.parse(stdout) as CliEnvelope;
        if (envelope.is_error) {
          reject(new ClaudeOutputError(`Claude returned an error: ${envelope.result ?? envelope.subtype ?? "unknown"}`));
        } else {
          resolve(envelope.result ?? "");
        }
      } catch {
        reject(new ClaudeOutputError(`Unexpected CLI output (exit ${code}): ${combined.slice(0, 400)}`));
      }
    });

    child.stdin.write(opts.userPrompt);
    child.stdin.end();
  });
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function extractAndValidate<T>(schema: z.ZodType<T>, text: string): ParseResult<T> {
  const candidate = extractJSON(text);
  if (candidate === null) return { ok: false, error: "no JSON object found in reply" };
  try {
    const value = schema.parse(JSON.parse(candidate));
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
  }
}

/** Prefer a fenced ```json block; fall back to the first balanced {...}. */
function extractJSON(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
