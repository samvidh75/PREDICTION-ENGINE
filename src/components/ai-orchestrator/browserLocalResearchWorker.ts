import { sanitizeResearchAiOutput, sanitizeResearchAiQuestion } from "./researchAiGuardrails";
import type { ResearchAiResponse } from "./researchAiTypes";
import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  BrowserLocalWorkerStatus,
} from "./browserLocalWorkerTypes";

type MlceEngine = {
  chat: {
    completions: {
      create: (input: {
        messages: Array<{ role: "system" | "user"; content: string }>;
        max_tokens: number;
        temperature: number;
      }) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
  resetChat: () => Promise<void>;
};

let engine: MlceEngine | null = null;
let engineFactory:
  | ((modelId: string, options?: { initProgressCallback?: (report: { progress: number; text: string }) => void }) => Promise<MlceEngine>)
  | null = null;
const cancelledRequestIds = new Set<string>();

// Configuration received from the main-thread manifest via init message.
let activeModelId = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
let answerTimeoutMs = 30_000;
let maxOutputTokens = 180;
let temperature = 0.2;

function postMessageToMain(payload: BrowserLocalWorkerResponse): void {
  self.postMessage(payload);
}

function postStatus(
  status: BrowserLocalWorkerStatus,
  requestId?: string,
  message?: string,
): void {
  postMessageToMain({ type: "status", requestId, status, message });
}

function postProgress(
  phase: "checking" | "loading" | "ready",
  requestId?: string,
  percent?: number,
): void {
  postMessageToMain({ type: "progress", requestId, phase, percent });
}

function postFailure(reason: ResearchAiResponse["reason"], requestId?: string): void {
  postMessageToMain({ type: "safe-failure", requestId, reason });
}

async function ensureEngine(requestId?: string): Promise<boolean> {
  if (engine) {
    postProgress("ready", requestId, 100);
    return true;
  }

  if (requestId && cancelledRequestIds.has(requestId)) {
    return false;
  }

  postProgress("loading", requestId, 0);

  try {
    const specifier = "@mlc-ai/web-llm";
    const module = (await import(specifier)) as {
      CreateMLCEngine: (
        modelId: string,
        options?: { initProgressCallback?: (report: { progress: number; text: string }) => void },
      ) => Promise<MlceEngine>;
    };
    engineFactory = module.CreateMLCEngine;
  } catch {
    postStatus("unsupported", requestId, "Enhanced explanation is unavailable on this device.");
    return false;
  }

  if (!engineFactory) {
    postStatus("failed", requestId, "Enhanced explanation could not start.");
    return false;
  }

  if (requestId && cancelledRequestIds.has(requestId)) {
    return false;
  }

  try {
    engine = await engineFactory(activeModelId, {
      initProgressCallback: (report) => {
        postProgress(report.progress >= 1 ? "ready" : "loading", requestId, Math.round(report.progress * 100));
      },
    });
    postProgress("ready", requestId, 100);
    return true;
  } catch {
    postStatus("failed", requestId, "Enhanced explanation could not start.");
    engine = null;
    return false;
  }
}

function buildPrompt(compressedContext: string, question: string): string {
  return [
    "Use only the research context below.",
    "Give a short explanation in at most three sentences.",
    "Stay educational and factual.",
    "Do not give recommendations or targets.",
    "",
    `Research context: ${compressedContext}`,
    `Question: ${question}`,
  ].join("\n");
}

async function answerQuestion(requestId: string, compressedContext: string, question: string): Promise<void> {
  if (!compressedContext.trim()) {
    postFailure("no_context", requestId);
    return;
  }

  const sanitizedQuestion = sanitizeResearchAiQuestion(question);
  if (!sanitizedQuestion) {
    postFailure("unsupported", requestId);
    return;
  }

  if (cancelledRequestIds.has(requestId)) {
    return;
  }

  const ready = await ensureEngine(requestId);
  if (!ready || !engine) {
    if (requestId && !cancelledRequestIds.has(requestId)) {
      postFailure("not_ready", requestId);
    }
    return;
  }

  if (cancelledRequestIds.has(requestId)) {
    return;
  }

  const prompt = buildPrompt(compressedContext, sanitizedQuestion);

  try {
    const result = await Promise.race([
      engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You explain already-computed stock research context. Keep answers under three sentences. Do not make recommendations.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxOutputTokens,
        temperature,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), answerTimeoutMs);
      }),
    ]);

    if (cancelledRequestIds.has(requestId)) {
      return;
    }

    const rawText = result.choices?.[0]?.message?.content ?? "";
    const sanitizedText = sanitizeResearchAiOutput(rawText);
    if (!sanitizedText) {
      postFailure("unsafe_output", requestId);
      return;
    }

    if (cancelledRequestIds.has(requestId)) {
      return;
    }

    postMessageToMain({
      type: "answer",
      requestId,
      text: sanitizedText,
    });
  } catch (error) {
    if (requestId && !cancelledRequestIds.has(requestId)) {
      postFailure(error instanceof Error && error.message === "timeout" ? "timeout" : "failed", requestId);
    }
  }
}

async function resetEngine(requestId: string): Promise<void> {
  if (engine) {
    try {
      await engine.resetChat();
    } catch {
      // keep reset silent; deterministic fallback remains available
    }
  }
  postStatus("idle", requestId, "Enhanced explanation is idle.");
}

self.onmessage = async (event: MessageEvent<BrowserLocalWorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case "init":
      if (request.config) {
        activeModelId = request.config.modelId;
        maxOutputTokens = request.config.maxOutputTokens;
        temperature = request.config.temperature;
        answerTimeoutMs = request.config.timeoutMs;
      }
      await ensureEngine(request.requestId);
      break;
    case "ask":
      await answerQuestion(request.requestId, request.compressedContext, request.question);
      break;
    case "cancel":
      cancelledRequestIds.add(request.requestId);
      break;
    case "reset":
      cancelledRequestIds.clear();
      await resetEngine(request.requestId);
      break;
  }
};
