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
  cancelRequest,
  getLastRequestId,
} from "./browserLocalRuntime";

export interface ProgressInfo {
  stage: string;
  percent?: number;
  message?: string;
}

export interface UseBrowserLocalRuntimeReturn {
  /** Current status (unloaded | checking | loading | ready | failed | unsupported) */
  status: BrowserLocalRuntimeState;
  /** Whether an explanation request is in flight */
  busy: boolean;
  /** True while the model is being loaded/started */
  isStarting: boolean;
  /** True while an explanation is being generated */
  isGenerating: boolean;
  /** Latest progress info from model loading / generation */
  progress: ProgressInfo | null;
  /** Generated explanation text (null until a request completes) */
  explanation: string | null;
  /** Start the worker and load the model */
  start: () => Promise<void>;
  /** Generate an explanation for the given compressed context and question */
  explain: (compressedContext: string, question: string) => Promise<string | null>;
  /** Cancel the current explanation request */
  cancel: () => Promise<void>;
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
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (mountedRef.current) { setBusy(true); setIsStarting(true); }
    if (mountedRef.current) setProgress({ stage: "checking", percent: 0, message: "Checking enhanced explanation." });

    try {
      const s = await ensureWorker((nextState) => {
        if (mountedRef.current) {
          setStatus(nextState);
          setProgress({ stage: nextState.status, message: nextState.statusMessage });
        }
      });
      if (mountedRef.current) setStatus(s);
      if (s.status !== "ready") {
        if (mountedRef.current) setProgress({ stage: s.status, message: s.statusMessage });
      } else {
        if (mountedRef.current) setProgress({ stage: "ready", percent: 100, message: "Enhanced explanation is ready." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (mountedRef.current) setStatus({ status: "failed", statusMessage: msg });
      if (mountedRef.current) setProgress({ stage: "failed", message: msg });
    } finally {
      if (mountedRef.current) { setBusy(false); setIsStarting(false); }
    }
  }, []);

  const explain = useCallback(
    async (compressedContext: string, question: string): Promise<string | null> => {
      if (mountedRef.current) { setBusy(true); setIsGenerating(true); }
      if (mountedRef.current) setProgress({ stage: "loading", message: "Preparing enhanced explanation." });

      try {
        const result = await requestExplanation(compressedContext, question);
        if (result.ok && result.text) {
          if (mountedRef.current) setExplanation(result.text);
          if (mountedRef.current) setProgress(null);
          return result.text;
        }
        if (mountedRef.current) setProgress({ stage: result.reason ?? "failed", message: "Standard explanation remains available for this view." });
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        if (mountedRef.current) setProgress({ stage: "failed", message: msg });
        return null;
      } finally {
        if (mountedRef.current) { setBusy(false); setIsGenerating(false); }
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
    if (mountedRef.current && !cap.canUse) {
      setStatus({ status: "unsupported", statusMessage: cap.message });
    }
    return cap.canUse;
  }, []);

  const cancel = useCallback(async () => {
    await cancelRequest();
    if (mountedRef.current) { setBusy(false); setIsGenerating(false); setProgress(null); }
  }, []);

  const clearExplanation = useCallback(() => {
    if (mountedRef.current) setExplanation(null);
  }, []);

  return {
    status,
    busy,
    isStarting,
    isGenerating,
    progress,
    explanation,
    start,
    explain,
    cancel,
    reset,
    stop,
    canUse,
    clearExplanation,
  };
}
