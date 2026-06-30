import type { ResearchAiResponse } from "./researchAiTypes";

export type BrowserLocalWorkerStatus =
  | "idle"
  | "checking"
  | "loading"
  | "ready"
  | "failed"
  | "unsupported";

export type BrowserLocalWorkerRequest =
  | { type: "init"; requestId: string }
  | {
      type: "ask";
      requestId: string;
      compressedContext: string;
      question: string;
    }
  | { type: "reset"; requestId: string };

export type BrowserLocalWorkerResponse =
  | {
      type: "status";
      requestId?: string;
      status: BrowserLocalWorkerStatus;
      message?: string;
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
