import path from "node:path";
import { z } from "zod";
import { FOLDERS, type Note } from "../vault.js";
import type { Operator } from "./registry.js";

const IdeaHookOutput = z.object({
  angle: z.string(),
  why_it_works: z.string(),
  hooks: z.array(z.string()).min(5).max(12),
  suggested_format: z.enum(["carousel", "reel", "caption", "story"]),
  pillar: z.string(),
});

type IdeaHookPayload = z.infer<typeof IdeaHookOutput>;

export const ideaHookOperator: Operator<IdeaHookPayload> = {
  name: "idea-hook",
  label: "Generate idea + hooks",
  description: "Turns processed input(s) into a content angle plus 10 hooks in Yen's voice.",
  accepts: "any processed inspirations — feed it several to blend them into one idea",
  promptFile: "idea-hook.md",
  systemFiles: ["content"],
  schema: IdeaHookOutput,

  appliesTo(note: Note): boolean {
    return note.frontmatter.status === "processed";
  },

  needsVaultRead(): boolean {
    return false;
  },

  buildUserPrompt(notes: Note[]): string {
    const inputs = notes
      .map(
        (n, i) =>
          `Input ${i + 1} (${n.frontmatter.type}${n.frontmatter.summary ? `, "${n.frontmatter.summary}"` : ""}):\n${n.body || "(image reference)"}`
      )
      .join("\n\n");
    return (
      `Create ONE content angle and 10 hooks from these input(s).\n\n` +
      `Required JSON schema:\n` +
      `{"angle": "string", "why_it_works": "string", "hooks": ["10 strings"], ` +
      `"suggested_format": "carousel|reel|caption|story", "pillar": "string"}\n\n` +
      inputs
    );
  },

  effectPreview(payload): string {
    return `Create idea note "${payload.angle.slice(0, 60)}" in ${FOLDERS.ideas}/`;
  },

  apply(payload, sourceNotes, vault): { effectSummary: string } {
    const links = sourceNotes.map(
      (n) => `[[${path.basename(n.relPath, ".md")}]]`
    );
    const body = [
      `## Angle`,
      payload.angle,
      ``,
      `## Why it works`,
      payload.why_it_works,
      ``,
      `## Hooks`,
      ...payload.hooks.map((h, i) => `${i + 1}. ${h}`),
      ``,
      `## Sources`,
      ...links.map((l) => `- ${l}`),
    ].join("\n");

    const note = vault.createNote(
      FOLDERS.ideas,
      payload.angle,
      {
        type: "idea",
        status: "idea",
        pillar: payload.pillar,
        source: "idea-hook operator",
        suggested_format: payload.suggested_format,
        links,
      },
      body
    );
    return { effectSummary: `Idea note created → ${note.relPath}` };
  },
};
