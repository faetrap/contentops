import fs from "node:fs";
import path from "node:path";
import { atomicWrite, type Vault } from "./vault.js";

export interface Point {
  x: number;
  y: number;
}

/** A feed wire the user drew: this note is plugged into this operator. */
export interface Feed {
  noteId: string;
  operator: string;
}

export interface CanvasState {
  positions: Record<string, Point>;
  feeds: Feed[];
}

/**
 * Canvas state (card positions + feed wires), stored in a dotfile inside the
 * vault so it never clutters Obsidian (the vault walker skips dot-prefixed
 * entries) and never touches note frontmatter on every drag.
 */
export class LayoutStore {
  private readonly file: string;
  constructor(vault: Vault) {
    this.file = path.join(vault.root, ".contentops", "canvas.json");
  }

  read(): CanvasState {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      // Back-compat: the first version stored a flat {id: {x,y}} map.
      if (raw && !raw.positions && !raw.feeds) return { positions: raw, feeds: [] };
      return { positions: raw.positions ?? {}, feeds: raw.feeds ?? [] };
    } catch {
      return { positions: {}, feeds: [] };
    }
  }

  /** Merge new positions and/or replace feeds. */
  update(patch: { positions?: Record<string, Point>; feeds?: Feed[] }): CanvasState {
    const current = this.read();
    const next: CanvasState = {
      positions: { ...current.positions, ...(patch.positions ?? {}) },
      feeds: patch.feeds ?? current.feeds,
    };
    atomicWrite(this.file, JSON.stringify(next, null, 2));
    return next;
  }
}
