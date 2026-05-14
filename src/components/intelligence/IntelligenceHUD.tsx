import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useTransform } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";

type SearchResult = {
  id: string;
  label: string;
  kind: "stock" | "sector" | "theme" | "market_narrative";
};

function labelForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Increased Sector Rotation";
    case "STABLE_CONVICTION":
      return "Stable Market Conditions";
    case "NEUTRAL_ENVIRONMENT":
      return "Liquidity Strength Improving";
    case "MOMENTUM_WEAKENING":
      return "Elevated Sector Drift";
    case "ELEVATED_RISK":
      return "Elevated Volatility";
    default:
      return "Market Conditions";
  }
}

function notificationForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Institutional activity reads steadier across large-cap banking exposures.";
    case "STABLE_CONVICTION":
      return "Market health checks remain controlled—signals stay constructive with contained risk intensity.";
    case "NEUTRAL_ENVIRONMENT":
      return "Energy is reorganizing slowly—liquidity and volatility are showing cautious balance.";
    case "MOMENTUM_WEAKENING":
      return "Mid-cycle momentum softens—follow-through becomes selective, not unstable.";
    case "ELEVATED_RISK":
      return "Volatility pressure is widening—risk intensity elevates with tighter interpretive confidence.";
  }
}

export default function IntelligenceHUD(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme } = useConfidenceEngine();
  const { scrollProgress } = useMotionController();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);

  const [toastOpen, setToastOpen] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const navHeight = useTransform(scrollProgress, [0, 1], [72, 64]);
  const navOpacity = useTransform(scrollProgress, [0, 1], [0.75, 0.92]);
  const navBlur = useTransform(scrollProgress, [0, 1], ["blur(0px)", "blur(10px)"]);

  const statusPill = useMemo(() => labelForState(state), [state]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const all: SearchResult[] = [
      { id: "r_1", label: "NSE Banking Momentum", kind: "theme" },
      { id: "r_2", label: "Large-cap Institutional Flow", kind: "market_narrative" },
      { id: "r_3", label: "Liquidity Breadth Watch", kind: "theme" },
      { id: "r_4", label: "Sector Rotation Signal", kind: "market_narrative" },
      { id: "r_5", label: "Volatility Conditions Monitor", kind: "theme" },
      { id: "r_6", label: "Banking & Payments Exposure", kind: "sector" },
      { id: "r_7", label: "Institutional Accumulation Index", kind: "theme" },
      { id: "r_8", label: "Risk Intensity Readout", kind: "market_narrative" },
    ];

    if (!q) return all.slice(0, 6);

    const ranked = all
      .map((r) => {
        const text = (r.label + " " + r.kind).toLowerCase();
        const score = text.includes(q) ? 100 : 0;
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);

    return ranked.length ? ranked : all.slice(0, 6);
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return;
    if (!query.trim()) {
      setVisibleCount(0);
      return;
    }

    if (prefersReducedMotion) {
      setVisibleCount(searchResults.length);
      return;
    }

    setVisibleCount(0);
    const stepMs = 140;
    const total = Math.min(searchResults.length, 6);

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisibleCount((prev) => Math.max(prev, i));
      if (i >= total) window.clearInterval(id);
    }, stepMs);

    return () => window.clearInterval(id);
  }, [searchOpen, query, prefersReducedMotion, searchResults]);

  useEffect(() => {
    // Toast appears softly and automatically; no aggressive UI.
    if (toastOpen) return;

    const id = window.setTimeout(() => {
      setToastOpen(true);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => setToastOpen(false), 5200);
    }, 1500);

    return () => window.clearTimeout(id);
  }, [toastOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const pillGlow = state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow;

  return (
    <div className="pointer-events-none absolute inset-0 z-[10]" style={{ opacity: 0.95 }}>
      {/* Top Navigation */}
      <motion.div
        style={{
          height: navHeight,
          opacity: navOpacity,
          backdropFilter: navBlur,
        }}
        className="pointer-events-auto fixed left-0 right-0 top-0 z-[12]"
      >
        <div
          className="mx-auto w-full max-w-[1680px] px-6 sm:px-[72px] flex items-center justify-between"
          style={{
            background: "linear-gradient(180deg, rgba(2,3,4,0.75) 0%, rgba(2,3,4,0.00) 100%)",
          }}
        >
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="text-[12px] uppercase tracking-[0.22em] text-white/80">
              StockStory India
            </div>
          </div>

          {/* Center: market state pill */}
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                height: 32,
                padding: "0 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 18px ${pillGlow}`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">{statusPill}</div>
            </div>
          </div>

          {/* Right controls + micro indicator */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative h-2 w-2">
                <motion.span
                  className="absolute inset-0 rounded-full bg-white/70"
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          opacity: [0.45, 0.85, 0.45],
                          scale: [0.9, 1.15, 0.9],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                Market Intelligence Active
              </div>
            </div>

            {/* Buttons (visual only; future wiring) */}
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              Search
            </button>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              onClick={() => setToastOpen(true)}
              aria-label="Notifications"
            >
              Intel
            </button>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              aria-label="Profile"
            >
              Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Toast (institutional / premium) */}
      <AnimatePresence>
        {toastOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute right-6 top-[90px] z-[14]"
            style={{
              width: 340,
              background: "rgba(12,14,18,0.58)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
              borderRadius: 24,
              padding: 16,
              boxShadow: "0 0 40px rgba(0,0,0,0.35)",
            }}
            aria-hidden="true"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Institutional Intelligence</div>
            <div className="mt-2 text-[14px] leading-[1.6] text-white/85">{notificationForState(state)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search overlay scaffolding */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-[20] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
            <div className="absolute inset-0 backdrop-blur-[10px]" />
            <div className="relative h-full flex items-start justify-center pt-[96px] px-6">
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "min(920px, 100%)",
                  borderRadius: 24,
                  background: "rgba(14,16,20,0.72)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 0 60px rgba(0,0,0,0.5)",
                }}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    />
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Intelligence Search</div>
                  </div>

                  <div className="mt-5">
                    <motion.input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search stocks, sectors, themes…"
                      className="w-full outline-none"
                      style={{
                        height: 64,
                        borderRadius: 24,
                        paddingLeft: 24,
                        paddingRight: 24,
                        background: "rgba(14,16,20,0.72)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: 18,
                        letterSpacing: "-0.01em",
                      }}
                    />
                  </div>

                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Results recalibrating progressively
                    </div>

                    <AnimatePresence mode="popLayout">
                      {query.trim().length > 0 && (
                        <div className="mt-3 space-y-2">
                          {searchResults.slice(0, visibleCount).map((r, i) => (
                            <motion.div
                              key={r.id}
                              initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                              exit={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                              transition={{ duration: 0.35, delay: i * 0.03 }}
                              className="rounded-[16px] border border-white/10 bg-black/25 px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[13px] text-white/90">{r.label}</div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                                  {r.kind.replaceAll("_", " ")}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-4 sm:p-6 pt-0 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
