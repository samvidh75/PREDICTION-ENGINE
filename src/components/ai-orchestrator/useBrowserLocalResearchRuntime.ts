/**
 * Phase 18B — React hook for browser-local AI explanation runtime.
 *
 * Provides a component-friendly wrapper around the Web Worker.
 * The worker is **never** started on mount — call `start()` explicitly.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { BrowserLocalRuntimeState } from "./browserLocalRuntime";
import {
  ensureWorker,
  requestExplanation,
  checkCapability,
  resetWorkerChat,
  unloadWorker,
  getStatus,
} from "./browserLocalRuntime";

export interface ProgressInfo {
  stage: string;
  percent?: number;
  message?: string;
}

export interface UseBrowserLocalRuntimeReturn {
  /** Current status (unloaded | loading | ready | error | unsupported) */
  status: BrowserLocalRuntimeState;
  /** Whether an explanation request is in flight */
  busy: boolean;
  /** Latest progress info from model loading / generation */
  progress: ProgressInfo | null;
  /** Generated explanation text (null until a request completes) */
  explanation: string | null;
  /** Start the worker and load the model */
  start: () => Promise<void>;
  /** Generate an explanation for the given prompt */
  explain: (prompt: string, maxTokens?: number) => Promise<string | null>;
  /** Reset the worker's chat session */
  reset: () => Promise<void>;
  /** Unload the model and terminate the worker */
  stop: () => Promise<void>;
  /** Check whether the browser is capable */
  canUse: () => Promise<boolean>;
  /** Clear the current explanation text */
  clearExplanation: () => void;
}

export function useBrowserLocalResearchRuntime(): UseBrowserLocalRuntimeReturn {
  const [status, setStatus] = useState<BrowserLocalRuntimeState>(getStatus());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (mountedRef.current) setBusy(true);
    if (mountedRef.current) setProgress({ stage: "loading", percent: 0, message: "Initializing…" });

    try {
      const s = await ensureWorker({
        onProgress: (stage, percent, message) => {
          if (mountedRef.current) setProgress({ stage, percent, message });
        },
        onError: (_msg) => {
          /* status updated by ensureWorker */
        },
      });
      if (mountedRef.current) setStatus(s);
      if (s.status !== "ready") {
        if (mountedRef.current) setProgress({ stage: "error", message: s.statusMessage });
      } else {
        if (mountedRef.current) setProgress({ stage: "ready", percent: 100, message: "Model ready" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (mountedRef.current) setStatus({ status: "error", statusMessage: msg });
      if (mountedRef.current) setProgress({ stage: "error", message: msg });
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, []);

  const explain = useCallback(
    async (prompt: string, maxTokens?: number): Promise<string | null> => {
      if (mountedRef.current) setBusy(true);
      if (mountedRef.current) setProgress({ stage: "generating", message: "Generating explanation…" });

      try {
        const result = await requestExplanation(prompt, maxTokens);
        if (result.ok && result.text) {
          if (mountedRef.current) setExplanation(result.text);
          if (mountedRef.current) setProgress(null);
          return result.text;
        }
        if (mountedRef.current) setProgress({ stage: "error", message: result.text ?? "No output" });
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        if (mountedRef.current) setProgress({ stage: "error", message: msg });
        return null;
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [],
  );

  const reset = useCallback(async () => {
    await resetWorkerChat();
    if (mountedRef.current) setExplanation(null);
    if (mountedRef.current) setProgress(null);
  }, []);

  const stop = useCallback(async () => {
    await unloadWorker();
    if (mountedRef.current) setStatus(getStatus());
    if (mountedRef.current) setExplanation(null);
    if (mountedRef.current) setProgress(null);
    if (mountedRef.current) setBusy(false);
  }, []);

  const canUse = useCallback(async () => {
    const cap = await checkCapability();
    return cap.canUse;
  }, []);

  const clearExplanation = useCallback(() => {
    if (mountedRef.current) setExplanation(null);
  }, []);

  return {
    status,
    busy,
    progress,
    explanation,
    start,
    explain,
    reset,
    stop,
    canUse,
    clearExplanation,
  };
}
