import React, { useMemo } from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralScannerCard, NeuralSynthesisTimelineEntry } from "../../services/synthesis/neuralMarketSynthesisTypes";
import { CompanyUniverseCard, CompanyUniverseSectionHeader } from "./CompanyUniverseSectionFrame";

function confidenceTone(confidenceState: ConfidenceState, theme: ConfidenceTheme): string {
  switch (confidenceState) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
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

function normalizeTimelineText(entry: NeuralSynthesisTimelineEntry): string {
  // In this demo set timeline text already represents educational market context.
  return entry.text;
}

export default function CompanyMarketEventsLayer({
  synthesis,
  confidenceState,
  theme,
  beginner = false,
}: {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
}): JSX.Element {
  const glow = useMemo(() => confidenceTone(confidenceState, theme), [confidenceState, theme]);

  const timeline = useMemo(() => {
    const safe = synthesis.timeline ?? [];
    return beginner ? safe.slice(0, 3) : safe.slice(0, 6);
  }, [synthesis.timeline, beginner]);

  const scanners = useMemo(() => {
    const safe = synthesis.scannerCards ?? [];
    return beginner ? safe.slice(0, 3) : safe.slice(0, 6);
  }, [synthesis.scannerCards, beginner]);

  const timelineHeader = useMemo(() => {
    return beginner ? "Market events timeline (simplified)" : "Market events timeline (structured context)";
  }, [beginner]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="MARKET NEWS & MARKET EVENTS LAYER"
          title="Market-wide context (organized, not noisy)"
          subtitle="Separate from company news: macro signals, policy-like conditions, sector pacing, and timeline texture—SEBI-safe educational framing."
        />

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <CompanyUniverseCard className="p-6">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Market tone anchor</div>
                <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.25]">
                  {synthesis.confidenceEnvironmentLabel}
                </div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
                  Macro narrative: {synthesis.narrative.editorialHeadline}
                </div>

                <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4" style={{ boxShadow: `0 0 90px ${glow}` }}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Healthometer-style market state</div>
                  <div className="mt-2 text-[14px] leading-[1.7] text-white/85">
                    {synthesis.healthometer.state} • educational lens (no recommendations)
                  </div>
                </div>

                <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Calm context • no fear • no trade execution framing
                </div>
              </CompanyUniverseCard>
            </div>

            <div className="lg:col-span-7">
              <CompanyUniverseCard className="p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Scanner events (structured)</div>
                    <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.25]">
                      {beginner ? "Simplified market signals" : "Full market signal cards"}
                    </div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    tone synced • editorial spacing
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {scanners.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-[20px] border border-white/10 bg-black/20 p-4"
                      style={{ boxShadow: `0 0 80px rgba(0,0,0,0), 0 0 70px ${glow}` }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{labelForScannerCategory(c.category)}</div>
                      <div className="mt-2 text-[14px] font-semibold text-white/90">{c.title}</div>
                      <div className="mt-2 text-[13px] leading-[1.85] text-white/80">{c.body}</div>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Educational market context • no certainty claims
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  SEBI-safe: educational probabilistic lens only
                </div>
              </CompanyUniverseCard>
            </div>
          </div>

          <CompanyUniverseCard className="p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{timelineHeader}</div>
                <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.25]">Events as narrative texture</div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">structure-first</div>
            </div>

            <div className="mt-5 space-y-4">
              {timeline.map((t, idx) => (
                <div key={t.id} className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                        Event {idx + 1} • {t.whenLabel}
                      </div>
                      <div className="mt-2 text-[14px] leading-[1.9] text-white/85">{normalizeTimelineText(t)}</div>
                    </div>
                    <div
                      className="h-[10px] w-[10px] rounded-full shrink-0 mt-2"
                      style={{
                        background: glow,
                        boxShadow: `0 0 22px ${glow}`,
                        opacity: 0.95,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Market texture • educational only • no execution framing
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
              Market events are separated from company news on purpose
            </div>
          </CompanyUniverseCard>
        </div>
      </div>
    </section>
  );
}
