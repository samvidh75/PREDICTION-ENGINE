import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import type { MarketInputs } from "../services/intelligence/marketState";
import type { MarketState } from "../types/MarketState";
import type { PortfolioHolding } from "../services/portfolio/portfolioIntelligenceEngine";

export type PracticeReplayFrame = {
  id: string;
  at: number;

  marketState: MarketState;
  marketInputs: MarketInputs;

  confidenceState: ConfidenceState;
  narrativeKey: number;

  holdings: PortfolioHolding[];
};

type UsePracticeReplayEngineOptions = {
  maxFrames?: number;
};

function cloneHoldings(holdings: PortfolioHolding[]): PortfolioHolding[] {
  // Ensure replay snapshots don’t mutate if live state changes.
  return holdings.map((h) => ({ ...h }));
}

export default function usePracticeReplayEngine(
  options: UsePracticeReplayEngineOptions = {},
): {
  frames: PracticeReplayFrame[];
  cursorIndex: number;
  isReplayMode: boolean;

  cursorFrame: PracticeReplayFrame | null;

  enterReplay: () => void;
  exitReplay: () => void;
  setCursorIndex: (idx: number) => void;

  captureFrame: (args: Omit<PracticeReplayFrame, "id" | "holdings"> & { holdings: PortfolioHolding[] }) => void;
  clear: () => void;
} {
  const { maxFrames = 140 } = options;

  const [frames, setFrames] = useState<PracticeReplayFrame[]>([]);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [cursorIndex, setCursorIndex] = useState<number>(0);

  const framesRef = useRef<PracticeReplayFrame[]>(frames);
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  const cursorFrame = useMemo(() => {
    if (frames.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(frames.length - 1, cursorIndex));
    return frames[safeIdx] ?? null;
  }, [frames, cursorIndex]);

  useEffect(() => {
    if (!isReplayMode && frames.length > 0) {
      setCursorIndex(frames.length - 1);
    }
  }, [frames.length, isReplayMode]);

  const captureFrame = useCallback(
    (args: Omit<PracticeReplayFrame, "id" | "holdings"> & { holdings: PortfolioHolding[] }) => {
      const id = `pr_${args.at}_${Math.random().toString(16).slice(2)}`;

      setFrames((prev) => {
        const next: PracticeReplayFrame[] = [
          ...prev,
          {
            id,
            at: args.at,
            marketState: args.marketState,
            marketInputs: args.marketInputs,
            confidenceState: args.confidenceState,
            narrativeKey: args.narrativeKey,
            holdings: cloneHoldings(args.holdings),
          },
        ];

        if (next.length <= maxFrames) return next;

        const extra = next.length - maxFrames;
        return next.slice(extra);
      });
    },
    [maxFrames],
  );

  const clear = useCallback(() => {
    setFrames([]);
    setIsReplayMode(false);
    setCursorIndex(0);
  }, []);

  const enterReplay = useCallback(() => {
    if (framesRef.current.length === 0) return;
    setIsReplayMode(true);
    setCursorIndex(framesRef.current.length - 1);
  }, []);

  const exitReplay = useCallback(() => {
    setIsReplayMode(false);
  }, []);

  const safeSetCursorIndex = useCallback(
    (idx: number) => {
      setCursorIndex((prev) => {
        const maxIdx = framesRef.current.length - 1;
        if (maxIdx < 0) return 0;
        return Math.max(0, Math.min(maxIdx, idx));
      });
    },
    [],
  );

  return {
    frames,
    cursorIndex,
    isReplayMode,
    cursorFrame,
    enterReplay,
    exitReplay,
    setCursorIndex: safeSetCursorIndex,
    captureFrame,
    clear,
  };
}
