import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import type { PracticeReplayFrame } from "../../hooks/usePracticeReplayEngine";
import type { MarketState } from "../../types/MarketState";

type PracticeReplayPanelProps = {
  frames: PracticeReplayFrame[];
  cursorIndex: number;
  isReplayMode: boolean;

  cursorFrame: PracticeReplayFrame | null;

  enterReplay: () => void;
  exitReplay: () => void;
  setCursorIndex: (idx: number) => void;
};

function labelForConfidenceState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function formatRelativeAt(at: number, now: number): string {
  const delta = Math.max(0, now - at);
  const secs = Math.round(delta / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function formatMarketState(m: MarketState): string {
  // Compact, educational, and non-forecasty.
  return `VIX ${m.vix.toFixed(2)} • Breadth ${m.breadthPct.toFixed(0)}% • FII/DII ${m.fiiDiiTone.toFixed(2)}`;
}

export default function PracticeReplayPanel({
  frames,
  cursorIndex,
  isReplayMode,
  cursorFrame,
  enterReplay,
  exitReplay,
  setCursorIndex,
}: PracticeReplayPanelProps): JSX.Element {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  const now = Date.now();
  const headerMeta = useMemo(() => {
    if (!cursorFrame) return null;
    const topHolding = [...cursorFrame.holdings].sort((a, b) => b.weight - a.weight)[0];
    return {
      confidence: labelForConfidenceState(cursorFrame.confidenceState),
      market: formatMarketState(cursorFrame.marketState),
      atLabel: formatRelativeAt(cursorFrame.at, now),
      topHolding: topHolding ? `${topHolding.ticker} (${topHolding.sector})` : "No holdings",
    };
  }, [cursorFrame, now]);

  useEffect(() => {
    if (!isReplayMode) setIsPlaying(false);
  }, [isReplayMode]);

  useEffect(() => {
    if (!isReplayMode || !isPlaying) return;

    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setCursorIndex(cursorIndex + 1);
    }, 700);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplayMode, isPlaying, cursorIndex]);

  useEffect(() => {
    if (!isReplayMode || !isPlaying) return;
    const lastIdx = frames.length - 1;
    if (cursorIndex >= lastIdx) setIsPlaying(false);
  }, [cursorIndex, frames.length, isPlaying, isReplayMode]);

  const canReplay = frames.length >= 2;

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Replay Engine</div>
          <div className="mt-3 text-[22px] font-medium text-white/92 leading-[1.2]">Replay for learning</div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {!isReplayMode ? (
            <motion.button
              type="button"
              whileHover={!isPlaying ? { translateY: -2 } : undefined}
              disabled={!canReplay}
              onClick={enterReplay}
              className={[
                "h-[56px] px-[18px] rounded-[18px] border transition",
                canReplay ? "border-white/10 bg-black/25 text-white/85 hover:text-white/95" : "border-white/5 bg-black/15 text-white/35 cursor-not-allowed",
              ].join(" ")}
            >
              Replay session
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={!isPlaying ? { translateY: -2 } : undefined}
              onClick={() => {
                setIsPlaying(false);
                exitReplay();
              }}
              className="h-[56px] px-[18px] rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
            >
              Exit replay
            </motion.button>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-5">
        {!cursorFrame ? (
          <div className="text-[13px] leading-[1.8] text-white/70">
            Replay captures educational snapshots as you simulate and evaluate exposure. When you have at least 2 snapshots, you can replay and scrub confidently.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Confidence</div>
                <div className="mt-2 text-[14px] leading-[1.6] text-white/90">{headerMeta?.confidence}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market environment</div>
                <div className="mt-2 text-[14px] leading-[1.6] text-white/90">{headerMeta?.market}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Replay position</div>
                <div className="mt-2 text-[14px] leading-[1.6] text-white/90">
                  {cursorIndex + 1}/{frames.length} • {headerMeta?.atLabel}
                </div>
              </div>
            </div>

            <div className="mt-4 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Top simulated exposure</div>
                  <div className="mt-2 text-[14px] leading-[1.6] text-white/90 truncate">{headerMeta?.topHolding}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isReplayMode && (
                    <motion.button
                      type="button"
                      onClick={() => {
                        if (cursorIndex >= frames.length - 1) setCursorIndex(Math.max(0, frames.length - 2));
                        setIsPlaying((p) => !p);
                      }}
                      className="h-[44px] px-[14px] rounded-[14px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                      disabled={frames.length < 2}
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </motion.button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-2">Scrub through snapshots</div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, frames.length - 1)}
                  value={cursorIndex}
                  onChange={(e) => setCursorIndex(Number(e.target.value))}
                  className="w-full"
                  disabled={!isReplayMode || frames.length < 2}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCursorIndex(Math.max(0, cursorIndex - 1))}
                  disabled={!isReplayMode || frames.length < 2}
                  className="h-[42px] px-[14px] rounded-[14px] border border-white/10 bg-black/15 text-white/55 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Educational replay only • no trade execution • no certainty claims
                </div>
                <button
                  type="button"
                  onClick={() => setCursorIndex(Math.min(frames.length - 1, cursorIndex + 1))}
                  disabled={!isReplayMode || frames.length < 2}
                  className="h-[42px] px-[14px] rounded-[14px] border border-white/10 bg-black/15 text-white/55 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
