import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { nanoid } from "nanoid";

/** Folder layout per PRD §5.1 — created inside the vault folder if missing. */
export const FOLDERS = {
  inbox: "00 Inbox",
  inputs: "01 Inputs",
  operators: "02 Operators",
  ideas: "03 Generated Ideas",
  drafts: "04 Drafts",
  posted: "05 Posted",
  feedback: "06 Feedback",
  assets: "assets",
  screenshots: path.join("assets", "screenshots"),
  pinterest: path.join("assets", "pinterest"),
  ig: path.join("assets", "ig"),
} as const;

export const INPUT_SUBFOLDERS = [
  "Trends",
  "Hooks",
  "Visual References",
  "Yoga Notes",
  "Personal Reflections",
  "Tarot-Chakra-Philosophy",
] as const;

/** Maps a classified note type to its /01 Inputs subfolder. */
export const TYPE_TO_FOLDER: Record<string, string> = {
  trend: "Trends",
  hook: "Hooks",
  visual_reference: "Visual References",
  yoga_note: "Yoga Notes",
  personal_reflection: "Personal Reflections",
  tarot_chakra_philosophy: "Tarot-Chakra-Philosophy",
};

export interface NoteFrontmatter {
  id: string;
  type: string;
  status: string;
  pillar?: string;
  created: string;
  updated: string;
  source?: string;
  tags?: string[];
  links?: string[];
  [key: string]: unknown;
}

export interface Note {
  /** Path relative to the vault root, e.g. "00 Inbox/2026-07-06-savasana.md" */
  relPath: string;
  frontmatter: NoteFrontmatter;
  body: string;
}

export class Vault {
  constructor(public readonly root: string) {}

  abs(relPath: string): string {
    const resolved = path.resolve(this.root, relPath);
    if (!resolved.startsWith(path.resolve(this.root) + path.sep) && resolved !== path.resolve(this.root)) {
      throw new Error(`Path escapes vault: ${relPath}`);
    }
    return resolved;
  }

  /** Create the folder skeleton + default operator prompts. Never touches existing files. */
  bootstrap(): void {
    if (!fs.existsSync(this.root)) {
      throw new Error(`Vault folder does not exist: ${this.root}`);
    }
    for (const folder of Object.values(FOLDERS)) {
      fs.mkdirSync(this.abs(folder), { recursive: true });
    }
    for (const sub of INPUT_SUBFOLDERS) {
      fs.mkdirSync(this.abs(path.join(FOLDERS.inputs, sub)), { recursive: true });
    }
    for (const [filename, content] of Object.entries(DEFAULT_OPERATOR_PROMPTS)) {
      const p = this.abs(path.join(FOLDERS.operators, filename));
      if (!fs.existsSync(p)) {
        atomicWrite(p, content);
      }
    }
  }

  /** Walk the vault and return all markdown notes (excluding operator prompts). */
  listNotes(): Note[] {
    const notes: Note[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (path.relative(this.root, full) === FOLDERS.assets) continue;
          walk(full);
        } else if (entry.name.endsWith(".md")) {
          const relPath = path.relative(this.root, full);
          if (relPath.startsWith(FOLDERS.operators + path.sep)) continue;
          const note = this.readNote(relPath);
          if (note) notes.push(note);
        }
      }
    };
    walk(this.root);
    notes.sort((a, b) => (b.frontmatter.created ?? "").localeCompare(a.frontmatter.created ?? ""));
    return notes;
  }

  readNote(relPath: string): Note | null {
    const full = this.abs(relPath);
    if (!fs.existsSync(full)) return null;
    const parsed = matter(fs.readFileSync(full, "utf8"));
    const fm = parsed.data as Partial<NoteFrontmatter>;
    return {
      relPath,
      body: parsed.content.trim(),
      frontmatter: {
        id: fm.id ?? nanoid(8),
        type: fm.type ?? "unclassified",
        status: fm.status ?? "raw",
        created: fm.created ?? todayISO(),
        updated: fm.updated ?? todayISO(),
        ...fm,
      } as NoteFrontmatter,
    };
  }

  findById(id: string): Note | null {
    return this.listNotes().find((n) => n.frontmatter.id === id) ?? null;
  }

  writeNote(relPath: string, frontmatter: NoteFrontmatter, body: string): void {
    const content = matter.stringify(body.trim() + "\n", { ...frontmatter, updated: todayISO() });
    atomicWrite(this.abs(relPath), content);
  }

  /** Move a note to a new folder, keeping its filename. Returns the new relPath. */
  moveNote(relPath: string, targetFolder: string): string {
    const filename = path.basename(relPath);
    let target = path.join(targetFolder, filename);
    // Never overwrite an existing different file — add a suffix instead.
    if (fs.existsSync(this.abs(target)) && target !== relPath) {
      target = path.join(targetFolder, `${path.basename(filename, ".md")}-${nanoid(4)}.md`);
    }
    fs.renameSync(this.abs(relPath), this.abs(target));
    return target;
  }

  /** Create a new note in a folder from a title; returns the note. */
  createNote(folder: string, title: string, frontmatter: Partial<NoteFrontmatter>, body: string): Note {
    const slug = slugify(title) || nanoid(6);
    let relPath = path.join(folder, `${todayISO()} ${slug}.md`);
    if (fs.existsSync(this.abs(relPath))) {
      relPath = path.join(folder, `${todayISO()} ${slug}-${nanoid(4)}.md`);
    }
    const fm: NoteFrontmatter = {
      id: nanoid(8),
      type: "unclassified",
      status: "raw",
      created: todayISO(),
      updated: todayISO(),
      tags: [],
      links: [],
      ...frontmatter,
    };
    this.writeNote(relPath, fm, body);
    return { relPath, frontmatter: fm, body };
  }

  readOperatorPrompt(filename: string): string {
    const p = this.abs(path.join(FOLDERS.operators, filename));
    if (!fs.existsSync(p)) {
      const fallback = DEFAULT_OPERATOR_PROMPTS[filename];
      if (!fallback) throw new Error(`Operator prompt not found: ${filename}`);
      atomicWrite(p, fallback);
      return matter(fallback).content.trim();
    }
    return matter(fs.readFileSync(p, "utf8")).content.trim();
  }

  saveAsset(subfolder: string, originalName: string, data: Buffer): string {
    const safe = `${todayISO()}-${nanoid(4)}-${slugify(path.basename(originalName, path.extname(originalName)))}${path.extname(originalName).toLowerCase()}`;
    const rel = path.join(subfolder, safe);
    atomicWrite(this.abs(rel), data);
    return rel;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-")
    .slice(0, 60);
}

/** Write via temp file + rename so Obsidian never sees a half-written file. */
export function atomicWrite(absPath: string, content: string | Buffer): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const tmp = path.join(path.dirname(absPath), `.tmp-${nanoid(6)}`);
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, absPath);
}

/**
 * Default operator prompts, written into /02 Operators on first run.
 * Yen can edit these notes in Obsidian — the backend re-reads them on every run.
 */
export const DEFAULT_OPERATOR_PROMPTS: Record<string, string> = {
  "input-classifier.md": `---
operator: input-classifier
---
You are the Input Classifier for a yoga / wellness / tarot–chakra content system.

You receive one raw captured input (a thought, hook, trend, screenshot description, or image). Classify it so it can be filed and reused later.

Rules:
- If an image path is provided, read the image and classify what you see.
- "aesthetic" describes visual/stylistic qualities (e.g. scrapbook, minimal, hand-drawn).
- "mood" describes emotional tone (e.g. intimate, grounding, playful).
- "usefulness_score": 1 = vague noise, 5 = immediately usable for content.
- "summary" is one plain sentence describing the input.
- Choose "type" from exactly: visual_reference, hook, trend, yoga_note, personal_reflection, tarot_chakra_philosophy.
`,
  "idea-hook.md": `---
operator: idea-hook
---
You are the Idea + Hook operator for Yen — a yoga / wellness / tarot–chakra creator.

You receive one or more processed inputs (notes, references, reflections). Turn them into ONE strong content angle plus 10 hooks in Yen's voice.

Yen's voice (distilled from her private writing — match the sensibility, not blog format):
- First-person, grounded, honest. Never guru-voice, never preachy.
- Comfortable with paradox and in-between states ("so much of life lies in a range").
- Asks real questions rather than delivering verdicts.
- Uses concrete, bodily, everyday metaphors (a cup being filled, barren soil, hardening to survive).
- Warm and direct; empathy is strength, not softness.
- Simple words. No wellness jargon, no corporate polish, no hype.

Hard rules for hooks:
- NEVER write rejection-triple slogans ("Not another X. Not another Y. Not another Z.") or any close variation.
- No hashtag spam, no emojis unless they genuinely fit.
- Hooks must work as the first line of an Instagram caption or the first slide of a carousel.
- Vary the forms: questions, confessions, observations, gentle provocations, tiny stories.
- "suggested_format" is one of: carousel, reel, caption, story.
`,
};
