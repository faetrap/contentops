import { spawn } from "node:child_process";
import fs from "node:fs";
import express from "express";
import { loadConfig, WEB_DIST } from "./config.js";
import { registerOperator } from "./operators/registry.js";
import { classifierOperator } from "./operators/classifier.js";
import { ideaHookOperator } from "./operators/ideaHook.js";
import { trendTranslatorOperator } from "./operators/trendTranslator.js";
import { visualDirectionOperator } from "./operators/visualDirection.js";
import { carouselBuilderOperator } from "./operators/carouselBuilder.js";
import { buildRoutes } from "./routes.js";
import { Vault } from "./vault.js";

const config = loadConfig();
const vault = new Vault(config.vaultPath);
vault.bootstrap();

registerOperator(classifierOperator);
registerOperator(ideaHookOperator);
registerOperator(trendTranslatorOperator);
registerOperator(visualDirectionOperator);
registerOperator(carouselBuilderOperator);

const app = express();
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`);
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use("/api", buildRoutes(vault, config));

if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get("*", (_req, res) => res.sendFile(`${WEB_DIST}/index.html`));
}

app.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  console.log(`ContentOps running at ${url}`);
  console.log(`Vault: ${config.vaultPath}`);
  if (process.env.NO_OPEN !== "1" && process.platform === "darwin" && fs.existsSync(WEB_DIST)) {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  }
});
