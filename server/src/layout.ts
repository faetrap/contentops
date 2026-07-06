import fs from "node:fs";
import path from "node:path";
import { atomicWrite, type Vault } from "./vault.js";

export interface Point {
  x: number;
  y: number;
}
export type Layout = Record<string, Point>;

/**
 * Canvas card positions, stored in a dotfile inside the vault so it never
 * clutters Obsidian (the vault walker skips dot-prefixed entries) and never
 * touches note frontmatter on every drag.
 */
export class LayoutStore {
  private readonly file: string;
  constructor(vault: Vault) {
    this.file = path.join(vault.root, ".contentops", "canvas.json");
  }

  read(): Layout {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8")) as Layout;
    } catch {
      return {};
    }
  }

  /** Merge new positions over existing ones. */
  merge(positions: Layout): Layout {
    const next = { ...this.read(), ...positions };
    atomicWrite(this.file, JSON.stringify(next, null, 2));
    return next;
  }
}
