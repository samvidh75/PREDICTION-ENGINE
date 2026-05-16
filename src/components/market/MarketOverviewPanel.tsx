import React, { useMemo } from "react";
import type { MarketComposite } from "../../services/market/marketService";
import type { NeuralMarketSynthesis, NeuralScannerCard } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type Props = {
  marketSnapshot: MarketComposite;
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
  variant?: "page" | "embedded";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmtPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function sentimentMood(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "risk-conditioned learning tone";
    case "MOMENTUM_WEAKENING":
      return "selective momentum / confirmation-aware tone";
    case "CONFIDENCE_RISING":
      return "constructive participation / disciplined optimism";
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return "calm, structured educational tone";
  }
}

function vixLabel(vix: number): string {
  if (vix >= 15) return "Volatility active (but not chaotic)";
  if (vix >= 13) return "Volatility moderate (pocket pressure)";
  return "Volatility contained (orderly conditions)";
}

function fiiDiiLabel(tone: number): string {
  if (tone >= 0.8) return "Institutional accumulation strength";
  if (tone >= 0.2) return "Institutional support / constructive bias";
  if (tone <= -0.8) return "Caution tone / defensive positioning";
  if (tone <= -0.2) return "Filtered caution / sensitivity management";
  return "Balanced institutional posture";
}

function labelForScannerCategory(category: NeuralScannerCard["category"]): string {
  switch (category) {
    case "strongest_structural_health":
      return "Structural stability";
    case "institutional_confidence":
      return "Institutional confidence";
    case "defensive_stability":
      return "Defensive stability";
    case "innovation_expansion":
      return "Innovation expansion";
    case "valuation_compression":
      return "Valuation compression";
    case "earnings_consistency":
      return "Earnings consistency";
    case "long_term_resilience":
    default:
      return "Long-term resilience";
  }
}

export default function MarketOverviewPanel({
  marketSnapshot,
  synthesis,
  confidenceState,
  theme,
  beginner = false,
  variant = "page",
}: Props): JSX.Element {
  const {
    marketState: { nifty, sensex, bankNifty, vix, breadthPct, fiiDiiTone },
    marketInputs,
    connectionStatus,
  } = marketSnapshot;

  const pseudoMovement = useMemo(() => {
    // MarketState only gives levels; for UX we present a calm "movement texture".
    // Derived from breadth + vix + flows + synthesis confidence margins.
    const breadthTerm = (breadthPct - 52) / 20; // roughly -0.85..1.0
    const vixTerm = (vix - 13) / 10; // roughly -0.5..1.7
    const flowTerm = fiiDiiTone / 2.0; // -0.8..0.8
    const confTerm = confidenceState === "ELEVATED_RISK" ? -0.8 : confidenceState === "MOMENTUM_WEAKENING" ? -0.35 : confidenceState === "CONFIDENCE_RISING" ? 0.55 : 0.1;

    const base = 1.2 * breadthTerm + 0.9 * flowTerm - 1.0 * vixTerm + confTerm * 0.45;

    const niftyMove = clamp(base * 0.95 + marketInputs.trendConsistency * 0.35, -3.2, 3.2);
    const sensexMove = clamp(base * 0.85 + marketInputs.sectorMomentum * 0.22 - marketInputs.volatilityStability * 0.15, -3.2, 3.2);
    const bankMove = clamp(base * 1.05 + marketInputs.institutionalParticipation * 0.18 - marketInputs.volatilityStability * 0.12, -3.2, 3.2);

    return { niftyMove, sensexMove, bankMove };
  }, [
    breadthPct,
    vix,
    fiiDiiTone,
    confidenceState,
    marketInputs.trendConsistency,
    marketInputs.sectorMomentum,
    marketInputs.volatilityStability,
    marketInputs.institutionalParticipation,
  ]);

  const breadthInterpretation = useMemo(() => {
    if (breadthPct <= 44) return "Breadth narrows → participation becomes sensitive";
    if (breadthPct <= 52) return "Breadth moderates → interpretation stays structured";
    return "Breadth supportive → confidence tone remains calm";
  }, [breadthPct]);

  const topSectorCards = useMemo(() => {
    const cards = synthesis.scannerCards ?? [];
    const shown = beginner ? cards.slice(0, 2) : cards.slice(0, 3);
    return shown.map((c) => ({
      id: c.id,
      title: c.title,
      label: labelForScannerCategory(c.category),
    }));
  }, [synthesis.scannerCards, beginner]);

  const glow = useMemo(() => {
    if (confidenceState === "ELEVATED_RISK") return theme.warningGlow;
    if (confidenceState === "MOMENTUM_WEAKENING") return theme.magentaGlow;
    if (confidenceState === "CONFIDENCE_RISING") return theme.cyanGlow;
    return theme.deepBlueGlow;
  }, [confidenceState, theme]);

  const statusLabel = useMemo(() => {
    if (connectionStatus === "connecting" || connectionStatus === "reconnecting") return "Syncing market overview";
    if (connectionStatus === "disconnected") return "Market snapshot (offline texture)";
    return "Market overview (calm & educational)";
  }, [connectionStatus]);

  const wrapperClass =
    variant === "embedded" ? "relative z-[12]" : "relative z-[12] px-6 sm:px-[72px] pb-14";

  return (
    <section className={wrapperClass}>
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Overview Architecture</div>
            <div className="mt-3 text-[22px] font-medium text-white/92 leading-[1.2]">Context-first market summary</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80 max-w-[84ch]">
              A calm, instantly understandable environment: index texture, breadth, volatility posture, and institutional tone—no panic framing, no newsroom chaos.
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 whitespace-nowrap">{statusLabel}</div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${glow}` }}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">NIFTY</div>
                  <div className="mt-2 text-[18px] font-semibold text-white/92">{nifty.toFixed(0)}</div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/75">
                    move (texture):{" "}
                    <span className="text-white/92 font-semibold">{fmtPct(pseudoMovement.niftyMove)}</span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">SENSEX</div>
                  <div className="mt-2 text-[18px] font-semibold text-white/92">{sensex.toFixed(0)}</div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/75">
                    move (texture):{" "}
                    <span className="text-white/92 font-semibold">{fmtPct(pseudoMovement.sensexMove)}</span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Bank Nifty</div>
                  <div className="mt-2 text-[18px] font-semibold text-white/92">{bankNifty.toFixed(0)}</div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/75">
                    move (texture):{" "}
                    <span className="text-white/92 font-semibold">{fmtPct(pseudoMovement.bankMove)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market breadth & volatility</div>
                    <div className="mt-3 text-[16px] font-semibold text-white/92">Breadth {breadthPct.toFixed(0)}% • VIX {vix.toFixed(1)}</div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">sentiment: {sentimentMood(confidenceState)}</div>
                </div>

                <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
                  {breadthInterpretation}. {vixLabel(vix)}.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Breadth interpretation</div>
                    <div className="mt-2 text-[13px] leading-[1.8] text-white/80">{breadthInterpretation}</div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Institutional participation</div>
                    <div className="mt-2 text-[13px] leading-[1.8] text-white/80">
                      {fiiDiiLabel(fiiDiiTone)} (educational lens).
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Sector leaders (educational)</div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
                  Interpreting sector movement as calm learning nodes—derived from the current scanner architecture.
                </div>

                <div className="mt-4 space-y-3">
                  {topSectorCards.map((s) => (
                    <div key={s.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{s.label}</div>
                      <div className="mt-2 text-[13px] leading-[1.8] text-white/85 font-semibold">{s.title}</div>
                    </div>
                  ))}
                </div>

                {!beginner && (
                  <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
                    educational • no outcomes promise • no trading advice
                  </div>
                )}
              </div>

              {!beginner && (
                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-5">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Sentiment summary (macro-linked)</div>
                  <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{synthesis.narrative.editorialHeadline}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            overview only • probabilistic context • no newsroom chaos • no trade execution framing
          </div>
        </div>
      </div>
    </section>
  );
}
