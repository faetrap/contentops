import path from "node:path";
import { z } from "zod";
import { FOLDERS, type Note, type Vault } from "../vault.js";
import { imageEmbeds, type Operator } from "./registry.js";

const VisualDirectionOutput = z.object({
  dialect: z.enum(["scrapbook", "editorial", "mystical", "soft_wellness"]),
  mood: z.enum(["soft_wellness", "mystical"]),
  design_dna: z.array(z.string()).min(2),
  design_elements: z.array(z.string()).min(2),
  per_slide_direction: z.array(z.object({ slide: z.number().int(), direction: z.string() })),
  figma_template: z.string(),
});

type VisualDirectionPayload = z.infer<typeof VisualDirectionOutput>;

/** The most recent processed visual references (with images), used as design input. */
function gatherRefs(vault: Vault, limit = 3): Note[] {
  return vault
    .listNotes()
    .filter((n) => n.frontmatter.type === "visual_reference" && n.frontmatter.status === "processed")
    .slice(0, limit);
}

export const visualDirectionOperator: Operator<VisualDirectionPayload> = {
  name: "visual-direction",
  label: "Visual direction",
  description:
    "Turns this idea + your latest visual references into a design brief mapped to a Figma template.",
  promptFile: "visual-direction.md",
  systemFiles: ["visual"],
  schema: VisualDirectionOutput,

  appliesTo(note: Note): boolean {
    return note.frontmatter.type === "idea";
  },

  needsVaultRead(): boolean {
    return true; // reads reference images from the vault
  },

  buildUserPrompt(notes: Note[], vault): string {
    const idea = notes[0];
    const refs = gatherRefs(vault);
    const refSection = refs.length
      ? refs
          .map((r, i) => {
            const imgs = imageEmbeds(r).map((rel) => vault.abs(rel));
            return (
              `Reference ${i + 1} (${(r.frontmatter.summary as string) ?? r.relPath}):` +
              (imgs.length ? `\nRead these image file(s):\n${imgs.join("\n")}` : `\n${r.body}`)
            );
          })
          .join("\n\n")
      : "(no visual references in the vault yet — design from visual.md alone)";
    return (
      `Create a design brief for this idea. Extract reusable design DNA from the references ` +
      `(translate, never copy — visual.md §9), pick ONE dialect and ONE mood, and map to a named Figma template.\n\n` +
      `Required JSON schema:\n` +
      `{"dialect": "scrapbook|editorial|mystical|soft_wellness", "mood": "soft_wellness|mystical", ` +
      `"design_dna": ["reusable principles"], "design_elements": ["concrete elements"], ` +
      `"per_slide_direction": [{"slide": 1, "direction": "..."}], "figma_template": "e.g. scrapbook_carousel"}\n\n` +
      `The idea:\n---\n${idea.body}\n---\n\n${refSection}`
    );
  },

  effectPreview(payload, sourceNotes): string {
    return `Create ${payload.dialect}/${payload.mood} design brief for "${path.basename(sourceNotes[0].relPath, ".md")}" in ${FOLDERS.drafts}/`;
  },

  apply(payload, sourceNotes, vault): { effectSummary: string } {
    const idea = sourceNotes[0];
    const refs = gatherRefs(vault);
    const links = [idea, ...refs].map((n) => `[[${path.basename(n.relPath, ".md")}]]`);
    const body = [
      `## Dialect & mood`,
      `${payload.dialect} · ${payload.mood.replaceAll("_", " ")}`,
      ``,
      `## Design DNA`,
      ...payload.design_dna.map((d) => `- ${d}`),
      ``,
      `## Design elements`,
      ...payload.design_elements.map((d) => `- ${d}`),
      ``,
      `## Per-slide direction`,
      ...payload.per_slide_direction.map((s) => `${s.slide}. ${s.direction}`),
      ``,
      `## Figma template`,
      payload.figma_template,
      ``,
      `## Sources`,
      ...links.map((l) => `- ${l}`),
    ].join("\n");
    const note = vault.createNote(
      FOLDERS.drafts,
      `design brief ${path.basename(idea.relPath, ".md")}`,
      {
        type: "design_brief",
        status: "draft",
        pillar: idea.frontmatter.pillar,
        source: "visual-direction operator",
        dialect: payload.dialect,
        mood: payload.mood,
        figma_template: payload.figma_template,
        links,
      },
      body
    );
    return { effectSummary: `Design brief created → ${note.relPath}` };
  },
};
