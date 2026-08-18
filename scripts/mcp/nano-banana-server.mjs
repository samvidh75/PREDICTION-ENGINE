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

/* --------------------------- asset path helpers -------------------------- */
function sanitizeName(name) {
  const cleaned = String(name || "stockex-image")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleaned || "stockex-image").slice(0, 80);
}

function publicUrlFor(absPath) {
  const rel = absPath.replace(REPO_ROOT, "").split(/[\\/]/).filter(Boolean).join("/");
  return "/" + rel;
}

function writeImage(base64, filename) {
  const buf = Buffer.from(base64, "base64");
  const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isPng && !isJpeg) {
    throw new Error("Gemini did not return a valid image payload (got non-image data). Nothing was written.");
  }
  const ext = isPng ? ".png" : ".jpg";
  const safe = sanitizeName(filename);
  const file = /\.(png|jpg|jpeg)$/.test(safe) ? safe : `${safe}${ext}`;
  const abs = join(ASSET_DIR, file);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buf);
  return { abs, url: publicUrlFor(abs), bytes: buf.length };
}

/* ----------------------------- Gemini request ---------------------------- */
function buildImageRequest(prompt, opts = {}, referenceB64) {
  const parts = referenceB64
    ? [{ inlineData: { mimeType: "image/png", data: referenceB64 } }, { text: prompt }]
    : [{ text: prompt }];
  const generationConfig = { responseModalities: ["TEXT", "IMAGE"] };
  if (opts.aspectRatio) {
    generationConfig.imageConfig = { aspectRatio: opts.aspectRatio };
  }
  if (opts.outputMimeType) {
    generationConfig.imageConfig = {
      ...(generationConfig.imageConfig || {}),
      outputMimeType: opts.outputMimeType,
    };
  }
  return { contents: [{ parts }], generationConfig };
}

async function generateImage(prompt, opts, referenceAbs) {
  if (!API_KEY) {
    throw new Error(
      "No GEMINI_API_KEY found. Add it to .env.local (GEMINI_API_KEY=...) or export it in your shell, then restart Claude Code.",
    );
  }
  let referenceB64 = null;
  if (referenceAbs) {
    if (!existsSync(referenceAbs)) throw new Error(`Reference image not found: ${referenceAbs}`);
    referenceB64 = readFileSync(referenceAbs).toString("base64");
  }
  const url = `${API_BASE}/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const body = buildImageRequest(prompt, opts, referenceB64);
  const res = await httpsPost(url, body);
  let data;
  try { data = JSON.parse(res.body); } catch { data = {}; }
  if (res.status >= 400) {
    const msg = data?.error?.message || data?.error?.status || `HTTP ${res.status}`;
    throw new Error(`Gemini API error (${res.status}): ${msg}`);
  }
  const candidate = data?.candidates?.[0];
  const parts = [
    ...(candidate?.content?.parts || []),
    ...(candidate?.generatedParts || []),
  ];
  const imagePart = parts.find((p) => p?.inlineData?.data);
  if (!imagePart) {
    const text = parts.map((p) => p.text || "").filter(Boolean).join(" ");
    throw new Error(
      `Gemini returned no image. finishReason=${candidate?.finishReason ?? "?"}` +
      (text ? ` - model said: ${text.slice(0, 300)}` : ""),
    );
  }
  return imagePart.inlineData.data;
}

/* -------------------------------- handlers ------------------------------- */
function resolveReferenceInRepo(ref) {
  if (!ref) return null;
  const normal = join(REPO_ROOT, String(ref).replace(/^\/+/, ""));
  if (!normal.startsWith(REPO_ROOT)) throw new Error("Reference image must be inside the repo.");
  return normal;
}

async function handleGenerate(args) {
  const prompt = String(args?.prompt || "").trim();
  if (!prompt) throw new Error("`prompt` is required.");
  const opts = {
    aspectRatio: String(args?.aspectRatio || "").trim() || undefined,
    outputMimeType: String(args?.outputMimeType || "").trim() || undefined,
  };
  const data = await generateImage(prompt, opts);
  const { abs, url, bytes } = writeImage(data, args?.filename);
  const kb = Math.round(bytes / 102.4) / 10;
  return `Generated OK\nPath: ${abs}\nURL : ${url}\nSize: ${kb} KB\n\nReact: <img src="${url}" alt="..."> or the <BananaHero> component.`;
}

async function handleEdit(args) {
  const prompt = String(args?.prompt || "").trim();
  const ref = String(args?.referenceImage || "").trim();
  if (!prompt) throw new Error("`prompt` is required.");
  if (!ref) throw new Error("`referenceImage` is required (e.g. public/assets/nano-banana/hero-source.png).");
  const referenceAbs = resolveReferenceInRepo(ref);
  const data = await generateImage(
    prompt,
    { aspectRatio: String(args?.aspectRatio || "").trim() || undefined },
    referenceAbs,
  );
  const { abs, url, bytes } = writeImage(data, args?.filename);
  const kb = Math.round(bytes / 102.4) / 10;
  return `Generated (from reference) OK\nRef : ${referenceAbs}\nOut : ${abs}\nURL : ${url}\nSize: ${kb} KB`;
}

/* ------------------------------- MCP wiring ------------------------------ */
const TOOLS = [
  {
    name: "generate_image",
    description:
      `Generate a premium image with Google Nano Banana (gemini-2.5-flash-image) and save it ` +
      `directly into public/assets/nano-banana/ in this repo. Use for website hero backgrounds, ` +
      `product visuals, and social cards. Every output is verified to be a real PNG/JPEG before writing.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed natural-language image prompt." },
        filename: { type: "string", description: "Optional output filename (lowercase [a-z0-9_-])." },
        aspectRatio: { type: "string", enum: ["16:9", "1:1", "9:16", "4:3", "3:4"] },
        outputMimeType: { type: "string", enum: ["image/png", "image/jpeg"] },
      },
      required: ["prompt"],
    },
  },
  {
    name: "edit_image",
    description:
      `Edit/restyle an existing image using Google Nano Banana. Pass referenceImage as a repo ` +
      `path (e.g. public/assets/nano-banana/source.png) plus edit instructions.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Instructions describing the edit to apply." },
        referenceImage: { type: "string", description: "Repo-relative path to the reference image." },
        filename: { type: "string", description: "Optional output filename." },
        aspectRatio: { type: "string", enum: ["16:9", "1:1", "9:16", "4:3", "3:4"] },
      },
      required: ["prompt", "referenceImage"],
    },
  },
];

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function log(msg) {
  send({ jsonrpc: "2.0", method: "notifications/message", params: { level: "info", data: msg } });
}

/* ------------------------------- CLI mode -------------------------------- */
// node scripts/mcp/nano-banana-server.mjs --generate "<prompt>" [--filename <name>] [--aspect 16:9]
const genIdx = process.argv.indexOf("--generate");
if (genIdx !== -1) {
  const prompt = String(process.argv[genIdx + 1] || "").trim();
  const fi = process.argv.indexOf("--filename");
  const fn = fi !== -1 ? process.argv[fi + 1] : undefined;
  const ai = process.argv.indexOf("--aspect");
  const av = ai !== -1 ? process.argv[ai + 1] : undefined;
  const aspect = av && ["16:9", "1:1", "9:16", "4:3", "3:4"].includes(av) ? av : undefined;
  (async () => {
    try {
      if (!prompt) throw new Error("Usage: --generate \"<prompt>\" [--filename <name>] [--aspect 16:9]");
      const data = await generateImage(prompt, { aspectRatio: aspect });
      const { abs, url, bytes } = writeImage(data, fn);
      console.log(`Wrote ${abs} (${url}, ${Math.round(bytes / 102.4) / 10} KB)`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exitCode = 1;
    }
    process.exit();
  })();
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

if (!API_KEY) {
  log("nano-banana: no GEMINI_API_KEY found - set it in .env.local or export it, then restart Claude Code.");
}

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const { id, method, params } = req;
  const hasId = typeof id !== "undefined" && id !== null;
  try {
    switch (method) {
      case "initialize":
        send({
          id, jsonrpc: "2.0",
          result: {
            protocolVersion: params?.protocolVersion || "2025-06-18",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "nano-banana", version: "1.0.0" },
          },
        });
        break;
      case "notifications/initialized":
      case "notifications/cancelled":
        break;
      case "ping":
        if (hasId) send({ id, jsonrpc: "2.0", result: {} });
        break;
      case "tools/list":
        send({ id, jsonrpc: "2.0", result: { tools: TOOLS } });
        break;
      case "tools/call": {
        const name = params?.name;
        const args = params?.arguments || {};
        let result;
        if (name === "generate_image") {
          result = { content: [{ type: "text", text: await handleGenerate(args) }] };
        } else if (name === "edit_image") {
          result = { content: [{ type: "text", text: await handleEdit(args) }] };
        } else {
          result = { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
        }
        if (hasId) send({ id, jsonrpc: "2.0", result });
        break;
      }
      default:
        if (hasId) send({ id, jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    log(`nano-banana: ${err?.message || err}`);
    if (hasId) {
      send({
        id, jsonrpc: "2.0",
        result: { content: [{ type: "text", text: `WARN ${err?.message || String(err)}` }], isError: true },
      });
    }
  }
});

process.stdout.on("error", (e) => { if (e?.code === "EPIPE") process.exit(0); });
