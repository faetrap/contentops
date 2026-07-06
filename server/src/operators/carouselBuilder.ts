import path from "node:path";
import { z } from "zod";
import { FOLDERS, type Note } from "../vault.js";
import type { Operator } from "./registry.js";

const CarouselOutput = z.object({
  slides: z
    .array(
      z.object({
        n: z.number().int(),
        role: z.string(),
        text: z.string(),
        visual_note: z.string(),
      })
    )
    .min(4)
    .max(8),
  caption: z.string(),
  recommended_template: z.string(),
});

type CarouselPayload = z.infer<typeof CarouselOutput>;

export const carouselBuilderOperator: Operator<CarouselPayload> = {
  name: "carousel-builder",
  label: "Build carousel",
  description: "Expands an approved idea into a slide-by-slide carousel structure plus caption.",
  accepts: "one idea note",
  promptFile: "carousel-builder.md",
  systemFiles: ["content", "visual"],
  schema: CarouselOutput,

  appliesTo(note: Note): boolean {
    return note.frontmatter.type === "idea";
  },

  needsVaultRead(): boolean {
    return false;
  },

  buildUserPrompt(notes: Note[]): string {
    const idea = notes.find((n) => n.frontmatter.type === "idea") ?? notes[0];
    return (
      `Turn this approved idea into a 4–8 slide carousel. ` +
      `Slide 1 = hook (per content.md hook styles). Interior slides = ONE thought each. ` +
      `Final slide = the turn — land it, never a hard CTA. ` +
      `Write a caption that opens with a hook line, and give each slide a short visual note.\n\n` +
      `Required JSON schema:\n` +
      `{"slides": [{"n": 1, "role": "hook", "text": "...", "visual_note": "..."}], ` +
      `"caption": "...", "recommended_template": "a template name from visual.md §8"}\n\n` +
      `The idea:\n---\n${idea.body}\n---`
    );
  },

  effectPreview(payload, sourceNotes): string {
    return `Create ${payload.slides.length}-slide carousel draft for "${path.basename(sourceNotes[0].relPath, ".md")}" in ${FOLDERS.drafts}/`;
  },

  apply(payload, sourceNotes, vault): { effectSummary: string } {
    const idea = sourceNotes.find((n) => n.frontmatter.type === "idea") ?? sourceNotes[0];
    const link = `[[${path.basename(idea.relPath, ".md")}]]`;
    const body = [
      `## Slides`,
      ...payload.slides.flatMap((s) => [
        `### ${s.n} · ${s.role}`,
        s.text,
        `> visual: ${s.visual_note}`,
        ``,
      ]),
      `## Caption`,
      payload.caption,
      ``,
      `## Template`,
      payload.recommended_template,
      ``,
      `## Sources`,
      `- ${link}`,
    ].join("\n");
    const note = vault.createNote(
      FOLDERS.drafts,
      `carousel ${path.basename(idea.relPath, ".md")}`,
      {
        type: "carousel_draft",
        status: "draft",
        pillar: idea.frontmatter.pillar,
        source: "carousel-builder operator",
        recommended_template: payload.recommended_template,
        slide_count: payload.slides.length,
        links: [link],
      },
      body
    );
    return { effectSummary: `Carousel draft (${payload.slides.length} slides) → ${note.relPath}` };
  },
};
