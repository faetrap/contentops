import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface AppConfig {
  vaultPath: string;
  model: string;
  port: number;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadConfig(): AppConfig {
  const configPath = path.join(repoRoot, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing config.json at ${configPath}. Copy config.example.json to config.json and set your vault path.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!raw.vaultPath || typeof raw.vaultPath !== "string") {
    throw new Error("config.json must include a vaultPath string.");
  }
  return {
    vaultPath: raw.vaultPath,
    model: typeof raw.model === "string" ? raw.model : "sonnet",
    port: typeof raw.port === "number" ? raw.port : 4820,
  };
}

export const WEB_DIST = path.join(repoRoot, "web", "dist");
