import React, { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";

type NarrativeCard = {
  id: string;
  category: string;
  desktop: { x: number; y: number };
};

type CardPulse = {
  id: string;
  color: "cyan" | "magenta" | "deepBlue" | "warning";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getPulseColor(state: ConfidenceState): CardPulse["color"] {
  if (state === "ELEVATED_RISK") return "warning";
  if (state === "MOMENTUM_WEAKENING") return "deepBlue";
  if (state === "CONFIDENCE_RISING") return "cyan";
  if (state === "NEUTRAL_ENVIRONMENT") return "deepBlue";
  return "cyan";
}

function glowFor(color: CardPulse["color"]): string {
  switch (color) {
    case "warning":
      return "rgba(255,120,120,0.26)";
    case "magenta":
      return "rgba(255,0,140,0.20)";
    case "deepBlue":
      return "rgba(0,120,255,0.20)";
    case "cyan":
    default:
      return "rgba(0,255,210,0.22)";
  }
}

const CONFIDENCE_LABEL: Record<ConfidenceState, string> = {
  CONFIDENCE_RISING: "Confidence Rising",
  STABLE_CONVICTION: "Stable Conviction",
  NEUTRAL_ENVIRONMENT: "Neutral Environment",
  MOMENTUM_WEAKENING: "Momentum Weakening",
  ELEVATED_RISK: "Elevated Risk",
};

type CardContentByState = Record<ConfidenceState, [string, string]>;
type CardContentLibrary = Record<string, CardContentByState>;

const CARD_CONTENT: CardContentLibrary = {
  c_inst: {
    CONFIDENCE_RISING: [
      "Large-cap banking-linked exposures show measured institutional accumulation—signals stay constructive even as uncertainty persists.",
      "Institutional activity reads steady and selective; breadth is supportive while the system remains watchful.",
    ],
    STABLE_CONVICTION: [
      "Banking momentum remains balanced: accumulation signals are intact while broader risk remains contained.",
      "Institutional positioning remains measured; confidence is stable with no aggressive narrative swing.",
    ],
    NEUTRAL_ENVIRONMENT: [
      "Institutional flow is present but subdued—activity continues, with no clear escalation or relief signal.",
      "Institutional tone remains observational; signals are consistent, with leadership selectively attentive.",
    ],
    MOMENTUM_WEAKENING: [
      "Institutional accumulation signals soften slightly—breadth looks present, but follow-through becomes more cautious.",
      "Large-cap participation remains but momentum weakens; activity is steady, yet responsiveness slows.",
    ],
    ELEVATED_RISK: [
      "Institutional signals persist, but risk intensity is elevated—distribution risk rises if liquidity/volatility pressure broadens.",
      "Institutional activity remains selective; elevated risk adds caution to the interpretive confidence level.",
    ],
  },
  c_liq: {
    CONFIDENCE_RISING: [
      "Liquidity depth improves gradually; conditions look supportive and less fragile around key risk windows.",
      "Liquidity signals suggest controlled breadth—depth is present with steadier transmission of market energy.",
    ],
    STABLE_CONVICTION: [
      "Liquidity remains supportive with selective follow-through; breadth is present while outcomes stay measured.",
      "Liquidity conditions are balanced—no abrupt compression, just controlled depth under uncertainty.",
    ],
    NEUTRAL_ENVIRONMENT: [
      "Liquidity is steady but not expanding; conditions look neutral with occasional pressure pockets.",
      "Liquidity dynamics remain calm—signals show stability with subtle dispersion rather than acceleration.",
    ],
    MOMENTUM_WEAKENING: [
      "Liquidity conditions hold, but pressure concentrates—breadth weakens modestly and follow-through becomes thinner.",
      "Liquidity transmission shows reduced momentum; conditions are still workable, but responsiveness slows.",
    ],
    ELEVATED_RISK: [
      "Liquidity becomes more sensitive; risk intensity suggests thinner buffers if volatility pressure spreads.",
      "Liquidity signals remain present, but elevated risk reduces interpretive clarity—pressure can widen under stress.",
    ],
  },
  c_vol: {
    CONFIDENCE_RISING: [
      "Volatility conditions remain contained; pressure is organized and not yet signaling dislocation.",
      "Volatility reads controlled; the system absorbs shocks without turning uncertainty into chaos.",
    ],
    STABLE_CONVICTION: [
      "Volatility stays moderate—signals point to disciplined behavior rather than unstable churn.",
      "Volatility pressure is stable; conditions suggest manageable risk intensity with editorial confidence.",
    ],
    NEUTRAL_ENVIRONMENT: [
      "Volatility remains neutral; pressure is neither escalating nor fully dissipating—observational mode persists.",
      "Volatility signals show steadiness; the system looks capable of absorbing turbulence with minimal drift.",
    ],
    MOMENTUM_WEAKENING: [
      "Volatility pressure softens unevenly; momentum weakens and the narrative shifts toward caution.",
      "Volatility behaves heavier on the margin—pressure concentrates, follow-through becomes less responsive.",
    ],
    ELEVATED_RISK: [
      "Volatility conditions become more irregular; elevated risk increases the odds of sudden dispersion pockets.",
      "Risk intensity rises with volatility pressure—signals suggest caution and slower confirmation cycles.",
    ],
  },
  c_sent: {
    CONFIDENCE_RISING: [
      "Sentiment reads calm-to-constructive; optimism exists, filtered through risk discipline rather than chase-driven momentum.",
      "Retail and market tone are steady—sentiment improves modestly while caution remains embedded.",
    ],
    STABLE_CONVICTION: [
      "Sentiment is controlled confidence; optimism is present but remains restrained by market health checks.",
      "Tone is measured: confidence is stable while the environment stays selective.",
    ],
    NEUTRAL_ENVIRONMENT: [
      "Sentiment is observational: energy moves slowly, with no decisive emotional swing yet.",
      "Market tone remains calm; uncertainty is present, but interpretations stay consistent.",
    ],
    MOMENTUM_WEAKENING: [
      "Sentiment softens slightly; optimism persists but decelerates as momentum weakens.",
      "Tone turns cautious: energy still flows, yet confirmation cycles lengthen.",
    ],
    ELEVATED_RISK: [
      "Sentiment becomes risk-aware; caution increases as volatility conditions gain irregularity.",
      "Tone stays calm but tighter: elevated risk narrows interpretive confidence margins.",
    ],
  },
  c_inst2: {
    CONFIDENCE_RISING: [
      "Risk intensity remains elevated only mildly—signals suggest stability with room for constructive confirmation.",
      "Risk intensity reads manageable: conditions look workable, and the system can recalibrate upward if liquidity holds.",
    ],
    STABLE_CONVICTION: [
      "Risk intensity is controlled; caution exists, but the system’s structure remains intact.",
      "Risk remains in balance—interpretive confidence stays steady with disciplined uncertainty management.",
    ],
    NEUTRAL_ENVIRONMENT: [
      "Risk intensity is neutral: pressure is present but not dominating the environment.",
      "Risk checks indicate observational mode—signals show consistency with mild uncertainty overhead.",
    ],
    MOMENTUM_WEAKENING: [
      "Risk intensity edges upward; momentum weakening increases the chance of delayed confirmation.",
      "Risk becomes heavier on the margin—pressure concentrates, interpretive confidence narrows slightly.",
    ],
    ELEVATED_RISK: [
      "Risk intensity is elevated—system warnings become more prominent if volatility widens.",
      "Elevated risk tightens the confidence lens; signals may disperse until conditions stabilize again.",
    ],
  },
};

function narrativeFor(cardId: string, state: ConfidenceState, variant: number): string {
  const entry = CARD_CONTENT[cardId];
  if (!entry) return "";
  const [a, b] = entry[state];
  return variant % 2 === 0 ? a : b;
}

export default function FloatingNarratives(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, narrativeVariant, narrativeKey } = useConfidenceEngine();
  const { isMobile } = useMotionController();

  const cards = useMemo<NarrativeCard[]>(
    () => [
      { id: "c_inst", category: "INSTITUTIONAL FLOW", desktop: { x: -270, y: 10 } },
      { id: "c_liq", category: "LIQUIDITY DYNAMICS", desktop: { x: 235, y: -70 } },
      { id: "c_vol", category: "VOLATILITY PRESSURE", desktop: { x: -165, y: 200 } },
      { id: "c_sent", category: "SENTIMENT TONE", desktop: { x: 235, y: 150 } },
      { id: "c_inst2", category: "RISK INTENSITY INDEX", desktop: { x: -10, y: 265 } },
    ],
    [],
  );

  const timestampLabel = useMemo(() => {
    // Timestamp is stable per narrativeKey recalibration (soft continuity).
    // Use narrativeKey parity rather than real clock jitter.
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    void narrativeKey;
    return `${hh}:${mm} IST`;
  }, [narrativeKey]);

  const pulseColor = getPulseColor(state);

  const textTransition = useMemo(
    () => ({
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1] as const,
    }),
    [],
  );

  return (
    <div className="absolute inset-0 z-[8] pointer-events-none">
      {/* Mobile feed */}
      {isMobile && (
        <div className="absolute inset-x-0 top-[130px] z-30 px-6">
          <div className="flex flex-col gap-4">
            {cards.map((c, idx) => {
              const narrative = narrativeFor(c.id, state, narrativeVariant);
              const confLabel = CONFIDENCE_LABEL[state];

              return (
                <motion.div
                  key={c.id}
                  className="pointer-events-auto"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : {
                          duration: 1.2,
                          ease: [0.22, 1, 0.36, 1] as const,
                          delay: idx * 0.06,
                        }
                  }
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          y: -3,
                          boxShadow: "0 0 40px rgba(0,0,0,0.35)",
                        }
                  }
                  style={{ filter: "none" }}
                >
                  <div className="rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{c.category}</div>

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${c.id}_${state}_${narrativeVariant}_${narrativeKey}`}
                            initial={
                              prefersReducedMotion
                                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                                : { opacity: 0, y: 8, filter: "blur(10px)" }
                            }
                            animate={
                              prefersReducedMotion
                                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                                : { opacity: 1, y: 0, filter: "blur(0px)" }
                            }
                            exit={
                              prefersReducedMotion
                                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                                : { opacity: 0, y: -6, filter: "blur(10px)" }
                            }
                            transition={textTransition}
                          >
                            <div className="mt-3 text-[15px] leading-[1.8] text-white/90">{narrative}</div>
                            <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/60">
                              Confidence: {confLabel}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="flex flex-col items-end gap-2 pt-1">
                        <div className="relative h-3 w-12 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden">
                          <motion.div
                            className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{
                              background: glowFor(pulseColor).replace("0.26", "0.32").replace("0.20", "0.32"),
                              boxShadow: `0 0 16px ${glowFor(pulseColor)}`,
                              opacity: 0.92,
                            }}
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    scale: [1, 1.35, 1],
                                    opacity: [0.55, 1, 0.65],
                                  }
                            }
                            transition={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    duration: clamp(theme.pulseSpeed * 0.7, 1.2, 3.4),
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                  }
                            }
                          />
                        </div>

                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{timestampLabel}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop */}
      {!isMobile && (
        <div className="absolute inset-0">
          {cards.map((c, idx) => {
            const left = `calc(50% + ${c.desktop.x}px)`;
            const top = `calc(44% + ${c.desktop.y}px)`;

            const narrative = narrativeFor(c.id, state, narrativeVariant);
            const confLabel = CONFIDENCE_LABEL[state];

            return (
              <motion.div
                key={c.id}
                className="pointer-events-auto"
                style={{
                  position: "absolute",
                  left,
                  top,
                  transform: "translate(-50%, -50%)",
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: 1.2,
                        ease: [0.22, 1, 0.36, 1] as const,
                        delay: idx * 0.08,
                      }
                }
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -3,
                        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
                      }
                }
              >
                <div className="w-[320px] rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{c.category}</div>

                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${c.id}_${state}_${narrativeVariant}_${narrativeKey}`}
                          initial={
                            prefersReducedMotion
                              ? { opacity: 1, y: 0, filter: "blur(0px)" }
                              : { opacity: 0, y: 8, filter: "blur(10px)" }
                          }
                          animate={
                            prefersReducedMotion
                              ? { opacity: 1, y: 0, filter: "blur(0px)" }
                              : { opacity: 1, y: 0, filter: "blur(0px)" }
                          }
                          exit={
                            prefersReducedMotion
                              ? { opacity: 1, y: 0, filter: "blur(0px)" }
                              : { opacity: 0, y: -6, filter: "blur(10px)" }
                          }
                          transition={textTransition}
                        >
                          <div className="mt-3 text-[15px] leading-[1.8] text-white/90">{narrative}</div>
                          <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/60">
                            Confidence: {confLabel}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-end gap-2 pt-1">
                      <div className="relative h-3 w-12 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden">
                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                          style={{
                            background: glowFor(pulseColor).replace("0.26", "0.32").replace("0.20", "0.32"),
                            boxShadow: `0 0 16px ${glowFor(pulseColor)}`,
                            opacity: 0.92,
                          }}
                          animate={
                            prefersReducedMotion
                              ? undefined
                              : {
                                  scale: [1, 1.35, 1],
                                  opacity: [0.55, 1, 0.65],
                                }
                          }
                          transition={
                            prefersReducedMotion
                              ? undefined
                              : {
                                  duration: clamp(theme.pulseSpeed * 0.7, 1.2, 3.4),
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }
                          }
                        />
                      </div>

                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{timestampLabel}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
