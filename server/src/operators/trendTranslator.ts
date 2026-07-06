import path from "node:path";
import { z } from "zod";
import { FOLDERS, type Note } from "../vault.js";
import type { Operator } from "./registry.js";

const TrendOutput = z.object({
  trend_mechanic: z.string(),
  best_pillar: z.string(),
  our_take: z.string(),
  format: z.enum(["carousel", "reel", "caption", "story"]),
  keep_or_skip: z.enum(["keep", "skip"]),
  reason: z.string(),
});

type TrendPayload = z.infer<typeof TrendOutput>;

export const trendTranslatorOperator: Operator<TrendPayload> = {
  name: "trend-translator",
  label: "Translate trend",
  description: "Converts an outside trend into an on-pillar, on-voice angle — or tells you to skip it.",
  promptFile: "trend-translator.md",
  systemFiles: ["content"],
  schema: TrendOutput,

  appliesTo(note: Note): boolean {
    return note.frontmatter.type === "trend" && note.frontmatter.status === "processed";
  },

  needsVaultRead(notes: Note[]): boolean {
    return notes.some((n) => /!\[\[[^\]]+\]\]/.test(n.body));
  },

  buildUserPrompt(notes: Note[], vault): string {
    const note = notes[0];
    const images = [...note.body.matchAll(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif))\]\]/gi)].map((m) =>
      vault.abs(m[1])
    );
    const imageSection = images.length
      ? `\n\nAttached screenshot(s) of the trend — read them:\n${images.join("\n")}`
      : "";
    return (
      `Analyse this trend and decide whether we should ride it.\n\n` +
      `Required JSON schema:\n` +
      `{"trend_mechanic": "what makes this trend work", "best_pillar": "one of our 5 pillars", ` +
      `"our_take": "how WE would do it in our voice (or why not)", ` +
      `"format": "carousel|reel|caption|story", "keep_or_skip": "keep|skip", "reason": "string"}\n\n` +
      `Be willing to say skip — a skip with a good reason is a valuable output.\n\n` +
      `Trend note:\n---\n${note.body || "(screenshot only)"}\n---${imageSection}`
    );
  },

  effectPreview(payload, sourceNotes): string {
    return payload.keep_or_skip === "keep"
      ? `Create idea note "${payload.our_take.slice(0, 60)}…" in ${FOLDERS.ideas}/`
      : `Mark trend "${path.basename(sourceNotes[0].relPath)}" as skipped (archived) with the reason noted`;
  },

  apply(payload, sourceNotes, vault): { effectSummary: string } {
    const trend = sourceNotes[0];
    if (payload.keep_or_skip === "skip") {
      vault.writeNote(
        trend.relPath,
        { ...trend.frontmatter, status: "archived", skip_reason: payload.reason },
        trend.body
      );
      return { effectSummary: `Trend skipped and archived — ${payload.reason.slice(0, 80)}` };
    }
    const link = `[[${path.basename(trend.relPath, ".md")}]]`;
    const body = [
      `## Our take`,
      payload.our_take,
      ``,
      `## Trend mechanic`,
      payload.trend_mechanic,
      ``,
      `## Why keep it`,
      payload.reason,
      ``,
      `## Sources`,
      `- ${link}`,
    ].join("\n");
    const note = vault.createNote(
      FOLDERS.ideas,
      payload.our_take,
      {
        type: "idea",
        status: "idea",
        pillar: payload.best_pillar,
        source: "trend-translator operator",
        suggested_format: payload.format,
        links: [link],
      },
      body
    );
    return { effectSummary: `Trend translated → ${note.relPath}` };
  },
};
