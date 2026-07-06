import path from "node:path";
import { z } from "zod";
import { loadPillars, loadTagVocab } from "../system.js";
import { FOLDERS, TYPE_TO_FOLDER, type Note, type Vault } from "../vault.js";
import { imageEmbeds, type Operator } from "./registry.js";

const ClassifierOutput = z.object({
  type: z.enum([
    "visual_reference",
    "hook",
    "trend",
    "yoga_note",
    "personal_reflection",
    "tarot_chakra_philosophy",
  ]),
  pillar: z.string(),
  aesthetic: z.array(z.string()),
  mood: z.array(z.string()),
  themes: z.array(z.string()),
  usefulness_score: z.number().int().min(1).max(5),
  summary: z.string(),
});

type ClassifierPayload = z.infer<typeof ClassifierOutput>;

export const classifierOperator: Operator<ClassifierPayload> = {
  name: "input-classifier",
  label: "Classify",
  description: "Tags a raw input (type, pillar, aesthetic, mood) and files it into /01 Inputs.",
  accepts: "raw captures from the Inbox — one at a time",
  hint: "Capture something in the bar up top — fresh cards start Raw and are its food.",
  promptFile: "input-classifier.md",
  systemFiles: ["content", "visual"],
  schema: ClassifierOutput,

  appliesTo(note: Note): boolean {
    return note.frontmatter.status === "raw";
  },

  needsVaultRead(notes: Note[]): boolean {
    return notes.some((n) => imageEmbeds(n).length > 0);
  },

  buildUserPrompt(notes: Note[], vault: Vault): string {
    const note = notes.find((n) => this.appliesTo(n)) ?? notes[0];
    const images = imageEmbeds(note);
    const imageSection = images.length
      ? `\n\nAttached image(s) — read each file and include what you see in the classification:\n` +
        images.map((rel) => vault.abs(rel)).join("\n")
      : "";
    // Controlled vocabulary from the brain — tags stay consistent and findable.
    const tags = loadTagVocab();
    const pillars = loadPillars();
    return (
      `Classify this captured input.\n\n` +
      `Required JSON schema:\n` +
      `{"type": "visual_reference|hook|trend|yoga_note|personal_reflection|tarot_chakra_philosophy", ` +
      `"pillar": "string", "aesthetic": ["string"], "mood": ["string"], "themes": ["string"], ` +
      `"usefulness_score": 1-5, "summary": "one sentence"}\n\n` +
      `CONTROLLED VOCABULARY — choose ONLY from these lists, never invent tags:\n` +
      `pillar (exactly one): ${pillars.join(" | ")}\n` +
      `aesthetic (2-4): ${(tags.aesthetic ?? []).join(", ")}\n` +
      `mood (2-3): ${(tags.mood ?? []).join(", ")}\n` +
      `themes (1-3, what it is ABOUT): ${(tags.themes ?? []).join(", ")}\n\n` +
      `Input note:\n---\n${note.body || "(no text — image only)"}\n---${imageSection}`
    );
  },

  effectPreview(payload, sourceNotes): string {
    const folder = path.join(FOLDERS.inputs, TYPE_TO_FOLDER[payload.type] ?? "Personal Reflections");
    return `Tag "${path.basename(sourceNotes[0].relPath)}" as ${payload.type} and move it to ${folder}/`;
  },

  apply(payload, sourceNotes, vault): { effectSummary: string } {
    const note = sourceNotes.find((n) => n.frontmatter.status === "raw") ?? sourceNotes[0];
    const subfolder = TYPE_TO_FOLDER[payload.type] ?? "Personal Reflections";
    const targetFolder = path.join(FOLDERS.inputs, subfolder);
    vault.writeNote(
      note.relPath,
      {
        ...note.frontmatter,
        type: payload.type,
        pillar: payload.pillar,
        aesthetic: payload.aesthetic,
        mood: payload.mood,
        themes: payload.themes,
        usefulness_score: payload.usefulness_score,
        summary: payload.summary,
        status: "processed",
      },
      note.body
    );
    const newPath = vault.moveNote(note.relPath, targetFolder);
    return { effectSummary: `Filed as ${payload.type} → ${newPath}` };
  },
};
