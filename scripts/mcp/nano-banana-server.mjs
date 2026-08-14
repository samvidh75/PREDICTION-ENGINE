#!/usr/bin/env node
/**
 * Nano Banana MCP server for Claude Code - StockEx (StockEX Philippines).
 *
 * A ZERO-DEPENDENCY Model Context Protocol (MCP) server that uses Google's
 * Gemini 2.5 Flash Image model ("Nano Banana") to generate real images and
 * write them directly into the repo under `public/assets/nano-banana/`.
 *
 * Why zero-dependency?
 *   - This repo keeps node_modules in a pruned layout (.ignored_* dirs) where
 *     extra scoped packages do not reliably land where `require` can see them.
 *   - MCP stdio is a small, well-defined JSON-RPC-2.0-over-stdio protocol, so
 *     we implement just the surface a Claude Code tools server needs instead of
 *     pulling in the full SDK.
 *   - Gemini is called over plain HTTPS REST with Node's built-in https.
 *
 * Run it (wired into .mcp.json):
 *   node scripts/mcp/nano-banana-server.mjs
 *
 * API key resolution (first match wins):
 *   1. process.env.GEMINI_API_KEY
 *   2. process.env.GOOGLE_API_KEY
 *   3. GEMINI_API_KEY / GOOGLE_API_KEY from `.env.local` or `.env`
 *
 * Exposed tools:
 *   generate_image - create a PNG from a text prompt -> public/assets/nano-banana/
 *   edit_image     - restyle a reference image already in the repo
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import { createInterface } from "node:readline";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSET_DIR = join(REPO_ROOT, "public", "assets", "nano-banana");
const MODEL = "gemini-2.5-flash-image";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/* ------------------------------- env loader ------------------------------ */
function loadDotEnv() {
  const out = {};
  for (const f of [join(REPO_ROOT, ".env.local"), join(REPO_ROOT, ".env")]) {
    let txt;
    try { txt = readFileSync(f, "utf8"); } catch { continue; }
    for (const raw of txt.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
const fileEnv = loadDotEnv();
const API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  fileEnv.GEMINI_API_KEY ||
  fileEnv.GOOGLE_API_KEY;

/* ------------------------------ HTTPS helper ----------------------------- */
function httpsPost(url, body, headers = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolvePromise({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", rejectPromise);
    req.write(JSON.stringify(body));
    req.end();
  });
}
