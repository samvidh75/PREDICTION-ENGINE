import type { ResearchAiResponse } from "./researchAiTypes";

export type BrowserLocalWorkerStatus =
  | "idle"
  | "checking"
  | "loading"
  | "ready"
  | "failed"
  | "unsupported";

export interface BrowserLocalWorkerModelConfig {
  modelId: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
}

export type BrowserLocalWorkerRequest =
  | { type: "init"; requestId: string; config?: BrowserLocalWorkerModelConfig }
  | {
      type: "ask";
      requestId: string;
      compressedContext: string;
      question: string;
    }
  | { type: "cancel"; requestId: string }
  | { type: "reset"; requestId: string };

export type BrowserLocalWorkerResponse =
  | {
      type: "status";
      requestId?: string;
      status: BrowserLocalWorkerStatus;
      message?: string;
    }
  | {
      type: "progress";
      requestId?: string;
      phase: "checking" | "loading" | "ready";
      percent?: number;
    }
  | {
      type: "answer";
      requestId: string;
      text: string;
    }
  | {
      type: "safe-failure";
      requestId?: string;
      reason: ResearchAiResponse["reason"];
    };
