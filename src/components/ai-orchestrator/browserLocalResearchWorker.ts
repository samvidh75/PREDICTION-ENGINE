/**
 * Phase 18B — Browser-local Web Worker for AI explanation generation.
 *
 * Runs @mlc-ai/web-llm inside a dedicated Web Worker so the main thread
 * stays responsive.  The worker is loaded **on-demand** — never at page
 * render — and communicates via `BrowserLocalWorkerRequest/Response`.
 *
 * @mlc-ai/web-llm version 0.2.84
 */

import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";

import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  WorkerEnvelope,
} from "./browserLocalWorkerTypes";

let engine: MLCEngine | null = null;
let loadedModelId: string | null = null;

/** A small model that works well on consumer GPUs. */
const DEFAULT_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

function post(payload: BrowserLocalWorkerResponse, correlationId?: string): void {
  const msg: WorkerEnvelope<BrowserLocalWorkerResponse> = {
    correlationId: correlationId ?? "",
    payload,
  };
  self.postMessage(msg);
}

function progress(stage: "loading" | "compiling" | "ready" | "generating", percent?: number, message?: string): void {
  post({ tag: "progress", stage, percent, message });
}

self.onmessage = async (event: MessageEvent<WorkerEnvelope<BrowserLocalWorkerRequest>>) => {
  const { correlationId, payload } = event.data;

  try {
    switch (payload.tag) {
      case "init":
        await handleInit(payload.model, correlationId);
        break;
      case "explain":
        await handleExplain(payload.prompt, payload.maxTokens, correlationId);
        break;
      case "checkCapability":
        handleCheckCapability(correlationId);
        break;
      case "reset":
        await handleReset(correlationId);
        break;
      case "unload":
        await handleUnload(correlationId);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ tag: "error", message, recoverable: true }, correlationId);
  }
};

async function handleInit(modelId?: string, correlationId?: string): Promise<void> {
  const id = modelId ?? DEFAULT_MODEL;
  progress("loading", 0, `Loading model…`);

  engine = await CreateMLCEngine(id, {
    initProgressCallback: (report) => {
      progress(
        report.text.includes("compiling") || report.text.includes("Fetching") ? "compiling" : "loading",
        Math.round(report.progress * 100),
        report.text,
      );
    },
  });

  loadedModelId = id;
  progress("ready", 100, "Model ready");
  post({ tag: "initResult", ok: true, message: `Model "${id}" loaded` }, correlationId);
}

async function handleExplain(prompt: string, maxTokens?: number, correlationId?: string): Promise<void> {
  if (!engine) {
    post({ tag: "error", message: "Engine not initialized. Call init first.", recoverable: true }, correlationId);
    return;
  }

  progress("generating", undefined, "Generating explanation…");
  const start = performance.now();

  const reply = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a helpful Indian stock research assistant. Keep answers concise (2-4 sentences), factual, and grounded in the provided context. Do not make investment recommendations.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens ?? 512,
    temperature: 0.3,
  });

  const text = reply.choices?.[0]?.message?.content ?? null;
  const runtimeMs = Math.round(performance.now() - start);

  post({ tag: "explainResult", ok: true, text, runtimeMs }, correlationId);
}

function handleCheckCapability(correlationId?: string): void {
  const hasWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;
  post(
    {
      tag: "capabilityResult",
      canUseWebLLM: hasWebGpu,
      message: hasWebGpu ? "WebGPU supported" : "WebGPU not available",
    },
    correlationId,
  );
}

async function handleReset(correlationId?: string): Promise<void> {
  if (engine) {
    await engine.resetChat();
  }
  post({ tag: "resetResult", ok: true }, correlationId);
}

async function handleUnload(correlationId?: string): Promise<void> {
  engine = null;
  loadedModelId = null;
  post({ tag: "unloadResult", ok: true }, correlationId);
}
