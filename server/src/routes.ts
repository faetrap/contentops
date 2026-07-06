import express, { type Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { execFileSync } from "node:child_process";
import { ClaudeAuthError, ClaudeOutputError, runClaudeJSON } from "./claude.js";
import type { AppConfig } from "./config.js";
import { allOperators, feedableOperators, getOperator, operatorsForNote, type Operator } from "./operators/registry.js";
import { antiDriftRule, loadPillars, loadTagVocab, systemContext } from "./system.js";
import { LayoutStore } from "./layout.js";
import { WEB_DIST } from "./config.js";
import { FOLDERS, type Note, type Vault } from "./vault.js";
import fs from "node:fs";
import path from "node:path";

/** The currently-built frontend bundle name — lets tabs detect they're stale. */
function currentBundle(): string | null {
  try {
    return fs.readdirSync(path.join(WEB_DIST, "assets")).find((f) => f.startsWith("index-") && f.endsWith(".js")) ?? null;
  } catch {
    return null;
  }
}

interface Proposal {
  id: string;
  operatorName: string;
  sourceNoteIds: string[];
  payload: unknown;
  effectPreview: string;
  createdAt: number;
}

/** In-memory pending proposals — nothing lands in the vault until approved. */
const proposals = new Map<string, Proposal>();

export function buildRoutes(vault: Vault, config: AppConfig): Router {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
  const layout = new LayoutStore(vault);

  router.get("/health", (_req, res) => {
    let cliInstalled = false;
    let cliVersion = "";
    try {
      cliVersion = execFileSync("claude", ["--version"], { encoding: "utf8", timeout: 10_000 }).trim();
      cliInstalled = true;
    } catch {
      /* not installed */
    }
    res.json({
      vaultPath: vault.root,
      vaultOk: true,
      claudeCli: cliInstalled ? cliVersion : null,
      model: config.model,
      bundle: currentBundle(),
    });
  });

  router.get("/notes", (req, res) => {
    let notes = vault.listNotes();
    const { type, status, folder } = req.query as Record<string, string | undefined>;
    if (type) notes = notes.filter((n) => n.frontmatter.type === type);
    if (status) notes = notes.filter((n) => n.frontmatter.status === status);
    if (folder) notes = notes.filter((n) => n.relPath.startsWith(folder));
    res.json(
      notes.map((n) => ({
        ...toApiNote(n),
        operators: operatorsForNote(n).map(toApiOperator),
        feedable: feedableOperators(n).map((op) => op.name),
      }))
    );
  });

  router.get("/operators", (_req, res) => res.json(allOperators().map(toApiOperator)));

  // Dropdown options per operator, built from the brain (system/tags.md +
  // content.md pillars). Field name -> allowed values; arrays are multi-select.
  router.get("/vocab/:operator", (req, res) => {
    const tags = loadTagVocab();
    const pillars = loadPillars();
    const formats = ["carousel", "reel", "caption", "story"];
    const byOperator: Record<string, Record<string, (string | number)[]>> = {
      "input-classifier": {
        type: ["visual_reference", "hook", "trend", "yoga_note", "personal_reflection", "tarot_chakra_philosophy"],
        pillar: pillars,
        aesthetic: tags.aesthetic ?? [],
        mood: tags.mood ?? [],
        themes: tags.themes ?? [],
        usefulness_score: [1, 2, 3, 4, 5],
      },
      "idea-hook": { pillar: pillars, suggested_format: formats },
      "trend-translator": { best_pillar: pillars, format: formats, keep_or_skip: ["keep", "skip"] },
      "visual-direction": {
        dialect: ["scrapbook", "editorial", "mystical", "soft_wellness"],
        mood: ["soft_wellness", "mystical"],
      },
      "carousel-builder": {},
    };
    res.json(byOperator[req.params.operator] ?? {});
  });

  router.get("/layout", (_req, res) => res.json(layout.read()));

  router.post("/layout", (req, res) => {
    const { positions, feeds } = req.body ?? {};
    if (positions !== undefined && typeof positions !== "object") {
      return res.status(400).json({ error: "positions must be an object" });
    }
    if (feeds !== undefined && !Array.isArray(feeds)) {
      return res.status(400).json({ error: "feeds must be an array" });
    }
    res.json(layout.update({ positions, feeds }));
  });

  router.get("/notes/:id", (req, res) => {
    const note = vault.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ ...toApiNote(note), operators: operatorsForNote(note).map(toApiOperator) });
  });

  router.patch("/notes/:id", (req, res) => {
    const note = vault.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    const { body, summary } = req.body ?? {};
    if (body !== undefined && typeof body !== "string") {
      return res.status(400).json({ error: "body must be a string" });
    }
    if (summary !== undefined && typeof summary !== "string") {
      return res.status(400).json({ error: "summary must be a string" });
    }
    const frontmatter = { ...note.frontmatter };
    if (summary !== undefined) frontmatter.summary = summary;
    vault.writeNote(note.relPath, frontmatter, body !== undefined ? body : note.body);
    res.json({ ...toApiNote(vault.readNote(note.relPath)!), operators: operatorsForNote(note).map(toApiOperator) });
  });

  // "Bin" = archive, never delete — the card leaves the board, the file stays.
  router.delete("/notes/:id", (req, res) => {
    const note = vault.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    vault.writeNote(
      note.relPath,
      { ...note.frontmatter, archived_from: note.frontmatter.status, status: "archived" },
      note.body
    );
    res.json({ ok: true });
  });

  router.post("/notes/:id/restore", (req, res) => {
    const note = vault.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    const { archived_from, ...rest } = note.frontmatter;
    vault.writeNote(
      note.relPath,
      { ...rest, status: (archived_from as string) || "processed" },
      note.body
    );
    res.json({ ok: true });
  });

  router.get("/assets/*", (req, res) => {
    const rel = decodeURIComponent((req.params as Record<string, string>)[0] ?? "");
    try {
      res.sendFile(vault.abs(`assets/${rel}`));
    } catch {
      res.status(404).end();
    }
  });

  router.post("/capture", upload.single("image"), (req, res) => {
    const text: string = (req.body?.text ?? "").trim();
    const source: string = (req.body?.source ?? "manual").trim() || "manual";
    if (!text && !req.file) {
      return res.status(400).json({ error: "Provide text, an image, or both." });
    }
    let body = text;
    if (req.file) {
      const assetRel = vault.saveAsset(FOLDERS.screenshots, req.file.originalname || "capture.png", req.file.buffer);
      body = `${text}\n\n![[${assetRel}]]`.trim();
    }
    const title = text ? text.split("\n")[0].slice(0, 60) : "image capture";
    const note = vault.createNote(FOLDERS.inbox, title, { source, status: "raw" }, body);
    res.json(toApiNote(note));
  });

  router.post("/operators/:name/run", async (req, res) => {
    const operator = getOperator(req.params.name);
    if (!operator) return res.status(404).json({ error: "Unknown operator" });

    const noteIds: string[] = Array.isArray(req.body?.noteIds) ? req.body.noteIds : [];
    const notes = noteIds.map((id) => vault.findById(id)).filter((n): n is Note => n !== null);
    if (notes.length === 0) return res.status(400).json({ error: "No valid notes given" });
    if (!notes.some((n) => operator.appliesTo(n))) {
      return res.status(400).json({ error: `This operator needs ${operator.accepts}. ${operator.hint}` });
    }

    try {
      // Operator prompt + the system/ brain files + the Anti-Drift constitution.
      // Loaded fresh every run so edits to the brain apply immediately.
      const systemPrompt = [
        vault.readOperatorPrompt(operator.promptFile),
        ...operator.systemFiles.map(systemContext),
        antiDriftRule(),
      ]
        .filter(Boolean)
        .join("\n\n");
      const needsRead = operator.needsVaultRead(notes);
      const payload = await runClaudeJSON(operator.schema, {
        systemPrompt,
        userPrompt: operator.buildUserPrompt(notes, vault),
        model: config.model,
        addDir: needsRead ? vault.root : undefined,
        allowRead: needsRead,
      });
      const proposal: Proposal = {
        id: nanoid(10),
        operatorName: operator.name,
        sourceNoteIds: notes.map((n) => n.frontmatter.id),
        payload,
        effectPreview: operator.effectPreview(payload, notes),
        createdAt: Date.now(),
      };
      proposals.set(proposal.id, proposal);
      res.json(proposal);
    } catch (err) {
      const status = err instanceof ClaudeAuthError ? 503 : err instanceof ClaudeOutputError ? 502 : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post("/proposals/:id/approve", (req, res) => {
    const proposal = proposals.get(req.params.id);
    if (!proposal) return res.status(404).json({ error: "Proposal not found (it may have expired — run the operator again)" });
    const operator = getOperator(proposal.operatorName)!;

    // Allow user-edited payload from the review UI, re-validated against the schema.
    let payload = proposal.payload;
    if (req.body?.payload !== undefined) {
      const check = (operator as Operator<unknown>).schema.safeParse(req.body.payload);
      if (!check.success) {
        return res.status(400).json({ error: `Edited output is invalid: ${check.error.issues[0]?.message}` });
      }
      payload = check.data;
    }

    const notes = proposal.sourceNoteIds
      .map((id) => vault.findById(id))
      .filter((n): n is Note => n !== null);
    if (notes.length === 0) return res.status(409).json({ error: "Source note no longer exists" });

    try {
      const result = operator.apply(payload, notes, vault);
      proposals.delete(proposal.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.post("/proposals/:id/reject", (req, res) => {
    proposals.delete(req.params.id);
    res.json({ ok: true });
  });

  return router;
}

function toApiNote(note: Note) {
  return {
    id: note.frontmatter.id,
    relPath: note.relPath,
    frontmatter: note.frontmatter,
    body: note.body,
  };
}

function toApiOperator(op: Operator<unknown>) {
  return { name: op.name, label: op.label, description: op.description, accepts: op.accepts, hint: op.hint };
}
