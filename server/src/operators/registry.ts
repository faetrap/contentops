import { z } from "zod";
import type { Note, Vault } from "../vault.js";

export interface OperatorResult {
  /** Human-readable description of what approving will do. */
  effectSummary: string;
}

export interface Operator<T = unknown> {
  name: string;
  label: string;
  description: string;
  /** Which notes this operator can run on. */
  appliesTo(note: Note): boolean;
  /** Prompt file inside /02 Operators (editable by the owner). */
  promptFile: string;
  schema: z.ZodType<T>;
  buildUserPrompt(notes: Note[], vault: Vault): string;
  /** Whether the Claude call needs Read access to the vault (image inputs). */
  needsVaultRead(notes: Note[]): boolean;
  /** Applied only after the owner approves (payload may be user-edited). */
  apply(payload: T, sourceNotes: Note[], vault: Vault): OperatorResult;
  /** Preview of what approve would do, shown in the review UI. */
  effectPreview(payload: T, sourceNotes: Note[]): string;
}

const registry = new Map<string, Operator<any>>();

export function registerOperator(op: Operator<any>): void {
  registry.set(op.name, op);
}

export function getOperator(name: string): Operator<any> | undefined {
  return registry.get(name);
}

export function operatorsForNote(note: Note): Operator<any>[] {
  return [...registry.values()].filter((op) => op.appliesTo(note));
}

export function allOperators(): Operator<any>[] {
  return [...registry.values()];
}

/** Extract ![[...]] image embeds from a note body, resolved to vault-relative paths. */
export function imageEmbeds(note: Note): string[] {
  const matches = [...note.body.matchAll(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif))\]\]/gi)];
  return matches.map((m) => m[1]);
}
