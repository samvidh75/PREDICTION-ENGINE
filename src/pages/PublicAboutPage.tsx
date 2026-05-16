import React, { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import HolographicTelemetryEngine from "../components/telemetry/HolographicTelemetryEngine";
import NeuralMarketSynthesisPanel from "../components/synthesis/NeuralMarketSynthesisPanel";
import SectorRotationEcosystem from "../components/dashboard/SectorRotationEcosystem";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../components/intelligence/ConfidenceEngine";
import { useNeuralMarketSynthesisSuperengine } from "../services/synthesis/useNeuralMarketSynthesisSuperengine";
import type { DiscoveryResult } from "../services/discovery/discoveryTypes";
import { universalIntelligenceSearch } from "../services/discovery/universalIntelligenceSearch";
import { getDiscoveryIndex } from "../services/discovery/discoveryIndex";

import PremiumCard from "../designSystem/PremiumCard";
import { HeroKicker, HeroTitle } from "../designSystem/TypographyIntelligence";
import ProgressiveDisclosure from "../designSystem/ProgressiveDisclosure";
import { navigateToExplore, navigateToStock } from "../architecture/navigation/routeCoordinator";

function glowForState(state: ConfidenceState, theme: ConfidenceTheme): string {
  if (state === "ELEVATED_RISK") return theme.warningGlow;
  if (state === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (state === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

export default function PublicAboutPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, marketState, narrativeKey } = useConfidenceEngine();
  const { synthesis } = useNeuralMarketSynthesisSuperengine();

  const pageGlow = useMemo(() => glowForState(state, theme), [state, theme]);

  // Lightweight “about search” preview (educational only).
  const [q, setQ] = useState<string>("institutional posture");
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const discoveryMemory = useMemo(() => {
    const index = getDiscoveryIndex();
    const preferredSectors: string[] = [];
    const preferredThemes: string[] = [];
    for (const e of index) {
      if (e.kind === "sector" && preferredSectors.length < 3) preferredSectors.push(e.title);
      if (e.kind === "theme" && preferredThemes.length < 3) preferredThemes.push(e.title);
      if (preferredSectors.length >= 3 && preferredThemes.length >= 3) break;
    }
    return { preferredSectors, preferredThemes };
  }, []);

  const results = useMemo<DiscoveryResult[]>(() => {
    return universalIntelligenceSearch({
      query: q,
      confidenceState: state,
      marketStateLabel: marketState,
      narrativeKey,
      preferredSectors: discoveryMemory.preferredSectors,
      preferredThemes: discoveryMemory.preferredThemes,
    }).slice(0, 4);
  }, [q, state, marketState, narrativeKey, discoveryMemory.preferredSectors, discoveryMemory.preferredThemes]);

  const openExplore = (r: DiscoveryResult) => {
    navigateToExplore(r.kind, r.id, { mode: "hard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      {/* Public hero/About */}
      <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[110px] pb-[64px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10">
            <div className="lg:flex-1">
              <HeroKicker>About StockStory India</HeroKicker>

              <HeroTitle>A calm intelligence workspace — engineered for understanding.</HeroTitle>

              <p className="mt-5 text-[15px] leading-[1.95] text-white/85 max-w-[78ch]">
                Most interfaces resize. StockStory India reconstructs spatial intelligence environments so the experience feels
                native on desktop, laptop, tablet, and mobile. The result: premium, readable, and emotionally calm learning—
                with educational, SEBI-safe framing only.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { k: "Spatial reconstruction", v: "Layout logic adapts to device environment—no compressed chaos." },
                  { k: "Adaptive intelligence density", v: "Guided progression prevents cognitive overload." },
                  { k: "Probabilistic calm", v: "No certainty claims. No trade execution framing." },
                ].map((x) => (
                  <PremiumCard key={x.k} variant="intelligence" glow={pageGlow}>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{x.k}</div>
                    <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{x.v}</div>
                  </PremiumCard>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="h-[56px] px-[26px] rounded-[18px] border border-white/10 bg-black/35 text-white/92 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                  style={{ boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 90px ${pageGlow}` }}
                  onClick={() => {
                    navigateToStock({ mode: "hard", preserveParamKeys: ["skipOnboarding"] });
                  }}
                >
                  Start the learning environment
                </button>

                <div className="h-[56px] px-[18px] rounded-[18px] border border-white/10 bg-black/20 flex items-center">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    Calm • educational • premium precision
                  </div>
                </div>
              </div>
            </div>

            {/* Orb / visual side */}
            <div className="lg:w-[520px] mt-10 lg:mt-0">
              <PremiumCard variant="hero" glow={pageGlow}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Calm learning tone</div>
                    <div className="mt-3 text-[22px] font-medium text-white/92">
                      {state === "ELEVATED_RISK"
                        ? "Volatility-conditioned caution"
                        : state === "MOMENTUM_WEAKENING"
                          ? "Momentum becomes selective"
                          : state === "CONFIDENCE_RISING"
                            ? "Confidence improves constructively"
                            : "Balanced observational framing"}
                    </div>
                  </div>

                  <div
                    className="rounded-full h-[44px] w-[44px] border border-white/10 bg-black/25 flex items-center justify-center"
                    style={{ boxShadow: `0 0 60px ${pageGlow}` }}
                    aria-hidden="true"
                  >
                    <div
                      className="h-[10px] w-[10px] rounded-full"
                      style={{ background: pageGlow, boxShadow: `0 0 22px ${pageGlow}` }}
                    />
                  </div>
                </div>

                <div className="mt-6 relative h-[340px]">
                  <div className="absolute inset-0 rounded-[28px]" style={{ boxShadow: `inset 0 0 260px ${pageGlow}` }} />
                  <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2">
                    <MarketOrb />
                    <OrbEffects />
                  </div>
                </div>

                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Your environment breathes, but stays readable.
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Intelligence Preview */}
      <div className="relative z-[12] px-[20px] sm:px-[72px] pb-[72px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Intelligence Preview</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">What “intelligence” means here</div>
          </div>

          <ProgressiveDisclosure
            debugLabel="about_intelligence_preview"
            front={
              <PremiumCard variant="intelligence" glow={pageGlow}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Calm probabilistic core</div>
                    <div className="mt-3 text-[20px] font-semibold text-white/92">A calm learning nucleus</div>
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">educational only</div>
                </div>

                <div className="mt-4">
                  <NeuralMarketSynthesisPanel compact />
                </div>
              </PremiumCard>
            }
            steps={[
              {
                id: "rails",
                label: "Guided rails",
                content: (
                  <PremiumCard variant="intelligence" glow={pageGlow}>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Structured intelligence rails</div>
                        <div className="mt-3 text-[20px] font-semibold text-white/92">Precision telemetry rendering</div>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">device-aware</div>
                    </div>

                    <div className="mt-4">
                      <HolographicTelemetryEngine title="Calm contextual rails" compact heightPx={320} showHeader={false} />
                    </div>
                  </PremiumCard>
                ),
              },
            ]}
            collapsedCtaLabel="Expand intelligence"
            collapseCtaLabel="Collapse"
          />

          {/* Market Universe (lightweight) */}
          <div className="mt-6">
            <PremiumCard variant="intelligence" glow={pageGlow}>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Market overview</div>
                  <div className="mt-3 text-[22px] font-medium text-white/92">Sector intelligence, rendered as calm context</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">no clutter • guided reading</div>
              </div>

              <div className="mt-6">
                <SectorRotationEcosystem state={state} theme={theme} compact />
              </div>
            </PremiumCard>
          </div>

          {/* Educational trust */}
          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Educational intelligence only • SEBI-safe • no trade execution • no certainty promises
          </div>
        </div>
      </div>

      {/* Search Preview Heart (interactive) */}
      <div className="relative z-[20] px-[20px] sm:px-[72px] pb-[96px]">
        <div className="mx-auto max-w-[1680px]">
          <PremiumCard variant="intelligence" glow={pageGlow}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Search preview</div>
                <div className="mt-2 text-[22px] font-medium text-white/92">Try a topic—get educational environments</div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">instant • calm • probabilistic</div>
            </div>

            <div className="mt-5 flex flex-col md:flex-row gap-3">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActiveIdx(0);
                }}
                className="h-[62px] md:flex-1 rounded-[18px] bg-white/[0.03] border border-white/10 px-5 text-[14px] text-white/92 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
              />
              <button
                type="button"
                className="h-[62px] md:w-[220px] rounded-[18px] border border-white/10 bg-black/35 text-white/90 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                style={{ boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 90px ${pageGlow}` }}
                onClick={() => {}}
              >
                Preview
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {results.map((r, idx) => (
                <button
                  key={`${r.kind}_${r.id}`}
                  type="button"
                  onClick={() => openExplore(r)}
                  className={classNames(
                    "text-left rounded-[18px] border border-white/10 bg-black/20 p-4 transition",
                    activeIdx === idx && "border-white/20",
                  )}
                  style={{ boxShadow: `0 0 40px rgba(0,0,0,0.25)` }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{r.kind.replaceAll("_", " ")}</div>
                  <div className="mt-2 text-[13px] text-white/92 font-medium leading-[1.35]">{r.title}</div>
                  <div className="mt-2 text-[12px] text-white/70 leading-[1.6] line-clamp-3">{r.narrativeSummary}</div>
                </button>
              ))}
            </div>

            <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Educational environments • SEBI-safe framing • no trade execution
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
