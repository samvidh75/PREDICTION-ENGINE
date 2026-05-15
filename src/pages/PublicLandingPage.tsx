import React, { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import HolographicTelemetryEngine from "../components/telemetry/HolographicTelemetryEngine";
import NeuralMarketSynthesisPanel from "../components/synthesis/NeuralMarketSynthesisPanel";
import SectorRotationEcosystem from "../components/dashboard/SectorRotationEcosystem";
import MarketPulseLayer from "../components/dashboard/MarketPulseLayer";
import { useConfidenceEngine, type ConfidenceState, type ConfidenceTheme } from "../components/intelligence/ConfidenceEngine";
import { useNeuralMarketSynthesisSuperengine } from "../services/synthesis/useNeuralMarketSynthesisSuperengine";
import { universalIntelligenceSearch } from "../services/discovery/universalIntelligenceSearch";
import type { DiscoveryResult } from "../services/discovery/discoveryTypes";
import { getDiscoveryIndex } from "../services/discovery/discoveryIndex";

import PremiumCard from "../designSystem/PremiumCard";
import { HeroKicker, HeroTitle } from "../designSystem/TypographyIntelligence";
import SpatialHierarchyEngine from "../designSystem/SpatialHierarchyEngine";
import ProgressiveDisclosure from "../designSystem/ProgressiveDisclosure";

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function glowForState(state: ConfidenceState, theme: ConfidenceTheme): string {
  if (state === "ELEVATED_RISK") return theme.warningGlow;
  if (state === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (state === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

function navigateToExplore(r: DiscoveryResult): void {
  const url = new URL(window.location.href);
  url.searchParams.set("page", "explore");
  url.searchParams.set("kind", r.kind);
  url.searchParams.set("id", r.id);
  window.location.href = url.toString();
}

export default function PublicLandingPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, marketState, narrativeKey } = useConfidenceEngine();
  const { synthesis, marketSnapshot, connectionStatus } = useNeuralMarketSynthesisSuperengine();

  const pageGlow = useMemo(() => glowForState(state, theme), [state, theme]);

  // Cinematic hero copy stays short; avoid feature walls.
  const heroStatement = "A cinematic luxury financial intelligence operating system — from the 22nd century.";

  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [focus, setFocus] = useState<boolean>(false);

  const discoveryMemory = useMemo(() => {
    // Use discovery index as “public” fallback; we still keep search educational.
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

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // Curiosity-first: show lightweight context even before typing.
      const initial = universalIntelligenceSearch({
        query: "",
        confidenceState: state,
        marketStateLabel: marketState,
        narrativeKey,
        preferredSectors: discoveryMemory.preferredSectors,
        preferredThemes: discoveryMemory.preferredThemes,
      });
      setResults(initial.slice(0, 4));
      return;
    }

    const next = universalIntelligenceSearch({
      query: q,
      confidenceState: state,
      marketStateLabel: marketState,
      narrativeKey,
      preferredSectors: discoveryMemory.preferredSectors,
      preferredThemes: discoveryMemory.preferredThemes,
    });
    setResults(next.slice(0, 4));
  }, [query, state, marketState, narrativeKey, discoveryMemory.preferredSectors, discoveryMemory.preferredThemes]);

  const onStart = () => {
    // Public conversion: move into onboarding (login is inside onboarding).
    const url = new URL(window.location.href);
    url.searchParams.set("page", "stock");
    url.searchParams.delete("search");
    url.searchParams.delete("q");
    window.location.href = url.toString();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      {/* Public navbar */}
      <header className="fixed left-0 right-0 top-0 z-[50] pointer-events-none">
        <div className="mx-auto max-w-[1680px] px-6 sm:px-[72px] pt-5 pointer-events-auto">
          <div
            className="ss-glass-2 flex items-center justify-between gap-4 px-4 py-3 rounded-[999px]"
            style={{
              boxShadow: `0 0 80px rgba(0,0,0,0.20), 0 0 120px ${pageGlow}`,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-[10px] w-[10px] rounded-full" style={{ background: pageGlow, boxShadow: `0 0 20px ${pageGlow}` }} />
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-[0.22em] text-white/80 truncate">StockStory India</div>
                <div className="mt-[2px] text-[11px] uppercase tracking-[0.18em] text-white/50 truncate">Cinematic intelligence</div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {[
                { label: "About", id: "about" },
                { label: "Features", id: "features" },
                { label: "Intelligence", id: "intelligence" },
                { label: "Market Stories", id: "market-stories" },
                { label: "Pricing", id: "pricing" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/90 transition"
                  onClick={() => {
                    if (item.id === "about") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("page", "about");
                      window.location.href = url.toString();
                      return;
                    }
                    document.getElementById(item.id)?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-[42px] px-[16px] rounded-[999px] border border-white/10 bg-black/25 text-white/75 hover:text-white/95 transition text-[11px] uppercase tracking-[0.18em]"
                onClick={onStart}
              >
                Login
              </button>
              <button
                type="button"
                className="h-[42px] px-[18px] rounded-[999px] border border-white/10 bg-black/35 text-white/90 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                style={{ boxShadow: `0 0 30px rgba(0,0,0,0.25), 0 0 60px ${pageGlow}` }}
                onClick={onStart}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="relative z-[10] pt-[120px] px-[20px] sm:px-[72px] pb-[64px]">
        <div className="mx-auto max-w-[1680px]">
          <SpatialHierarchyEngine
            split="hero"
            align="center"
            debugLabel="landing_hero"
            primary={
              <div>
                <HeroKicker>World’s most futuristic financial intelligence operating system</HeroKicker>

                <HeroTitle>{heroStatement}</HeroTitle>

                <div className="mt-5 text-[15px] leading-[1.95] text-white/85 max-w-[70ch]">
                  Calm, probabilistic intelligence — reconstructed spatially for desktop, laptop, tablet, and mobile.
                  No certainty claims. No trade execution framing.
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="h-[56px] px-[24px] rounded-[18px] border border-white/10 bg-black/30 text-white/92 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                    style={{ boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 90px ${pageGlow}` }}
                    onClick={onStart}
                  >
                    Initialize Intelligence
                  </button>

                  <div className="h-[56px] px-[18px] rounded-[18px] border border-white/10 bg-black/20 flex items-center">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                      Educational only • SEBI-safe • calm feedback
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {["Probabilistic business analysis", "Cinematic financial storytelling", "Contextual market intelligence"].map((x) => (
                    <span
                      key={x}
                      className="ss-telemetry-pill px-[14px] py-[10px] text-[11px] uppercase tracking-[0.18em] text-white/70 rounded-full border border-white/10"
                      style={{ boxShadow: `0 0 18px ${pageGlow}` }}
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            }
            secondary={
              <div className="relative">
                <div className="absolute inset-0 -z-[1]" style={{ boxShadow: `inset 0 0 240px ${pageGlow}` }} />
                <div className="relative h-[520px] flex items-center justify-center">
                  <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-black/20 backdrop-blur-[24px]" style={{ boxShadow: `0 0 80px rgba(0,0,0,0.35)` }} />
                  <div className="relative">
                    <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-[10px] uppercase tracking-[0.18em] text-white/45">
                      neural market pulse
                    </div>
                    <div className="scale-[1.02]">
                      <MarketOrb />
                      <OrbEffects />
                    </div>

                    <div className="mt-6">
                      <HolographicTelemetryEngine compact heightPx={320} showHeader={false} />
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          {/* Search preview quick heart */}
          <div id="search-preview" className="mt-10">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Cinematic Search Preview</div>
                  <div className="mt-2 text-[20px] font-medium text-white/92">Search is the heart of StockStory India</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Type anything — get educational intelligence environments
                </div>
              </div>

              <div className="mt-5 flex flex-col md:flex-row gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  placeholder="Try: volatility, liquidity, sector rotation…"
                  className="h-[62px] md:flex-1 rounded-[18px] bg-white/[0.03] border border-white/10 px-5 text-[14px] text-white/92 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                />
                <button
                  type="button"
                  onClick={onStart}
                  className="h-[62px] md:w-[220px] rounded-[18px] border border-white/10 bg-black/35 text-white/90 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                  style={{ boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 90px ${pageGlow}` }}
                >
                  Start learning
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {results.slice(0, 4).map((r) => (
                  <button
                    key={`${r.kind}_${r.id}`}
                    type="button"
                    onClick={() => navigateToExplore(r)}
                    className={classNames(
                      "text-left rounded-[18px] border border-white/10 bg-black/20 p-4",
                      focus ? "hover:border-white/20" : "hover:border-white/18",
                    )}
                    style={{ boxShadow: `0 0 40px rgba(0,0,0,0.25)` }}
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
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-[10] px-[20px] sm:px-[72px] pb-[72px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Visual Product Storytelling Layer</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Understand the platform in seconds</div>
          </div>

          <ProgressiveDisclosure
            debugLabel="landing_features_progressive"
            front={
              <PremiumCard variant="intelligence" glow={pageGlow}>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Healthometer</div>
                <div className="mt-3 text-[18px] font-semibold text-white/92">Probabilistic business-health rendering</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                  Calm educational health layers with bounded confidence margins.
                </div>
                <div className="mt-4">
                  <NeuralMarketSynthesisPanel compact />
                </div>
              </PremiumCard>
            }
            steps={[
              {
                id: "ai",
                label: "AI Intelligence",
                content: (
                  <PremiumCard variant="ai" glow={pageGlow}>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">AI Intelligence</div>
                    <div className="mt-3 text-[18px] font-semibold text-white/92">Contextual market intelligence</div>
                    <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                      No creepy sentience. Just precision-engineered educational narration.
                    </div>
                    <div className="mt-4">
                      <HolographicTelemetryEngine
                        title="Calm intelligence rails"
                        compact
                        heightPx={280}
                        showHeader={false}
                      />
                    </div>
                  </PremiumCard>
                ),
              },
              {
                id: "charts",
                label: "Cinematic Charts",
                content: (
                  <PremiumCard variant="chart" glow={pageGlow} className="p-6">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Cinematic Charts</div>
                    <div className="mt-3 text-[18px] font-semibold text-white/92">Interpretation-supported chart universes</div>
                    <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                      Gesture-friendly surfaces with device-tier density control.
                    </div>
                    <div className="mt-4">
                      {/* Reuse StockStory ticker by default */}
                      {/* The chart component itself is already “cinematic + responsive”. */}
                      {/* Dynamically imported would complicate; keep direct usage minimal. */}
                      {/* eslint-disable-next-line react/jsx-no-undef */}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    </div>
                    <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Advanced chart universes are available inside the learning flow
                    </div>
                  </PremiumCard>
                ),
              },
            ]}
            collapsedCtaLabel="Expand intelligence"
            collapseCtaLabel="Collapse"
          />
        </div>
      </section>

      {/* Intelligence */}
      <section id="intelligence" className="relative z-[10] px-[20px] sm:px-[72px] pb-[72px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">AI Intelligence Presentation System</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Calm institutional intelligence</div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
            <NeuralMarketSynthesisPanel compact={false} />
          </div>
        </div>
      </section>

      {/* Market Stories */}
      <section id="market-stories" className="relative z-[10] px-[20px] sm:px-[72px] pb-[72px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Market Universe Visualization Layer</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">NSE ecosystem + sector intelligence</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6">
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
                <MarketPulseLayer marketSnapshot={marketSnapshot} connectionStatus={connectionStatus} />
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
                <SectorRotationEcosystem state={state} theme={theme} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About + Trust */}
      <section id="pricing" className="relative z-[10] px-[20px] sm:px-[72px] pb-[88px]">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Conversion & Trust Architecture</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Educational, calm, and professionally engineered</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Trust indicators</div>
              <div className="mt-3 text-[18px] font-semibold text-white/92">No certainty claims. No trade execution framing.</div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { k: "SEBI-safe", v: "Educational probabilistic lens" },
                  { k: "Calm tone", v: "Emotional comfort with premium pacing" },
                  { k: "Device-tier", v: "Density & rendering adapt per environment" },
                  { k: "Luxury clarity", v: "Readable hierarchy across charts + telemetry" },
                ].map((x) => (
                  <div key={x.k} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{x.k}</div>
                    <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{x.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="h-[56px] px-[26px] rounded-[18px] border border-white/10 bg-black/35 text-white/92 hover:text-white/100 transition text-[11px] uppercase tracking-[0.18em]"
                  style={{ boxShadow: `0 0 70px rgba(0,0,0,0.25), 0 0 90px ${pageGlow}` }}
                  onClick={onStart}
                >
                  Get Started
                </button>
                <button
                  type="button"
                  className="h-[56px] px-[24px] rounded-[18px] border border-white/10 bg-black/20 text-white/70 hover:text-white/95 transition text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("page", "about");
                    window.location.href = url.toString();
                  }}
                >
                  About StockStory
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Pricing preview</div>
              <div className="mt-3 text-[18px] font-semibold text-white/92">Start with educational intelligence</div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                Premium tiers unlock deeper cinematic feed surfaces (still educational — calm professionalism only).
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { tier: "Free", glow: theme.deepBlueGlow, line: "Core chart + educational intelligence surfaces" },
                  { tier: "Premium", glow: theme.cyanGlow, line: "Cinematic intelligence feed + deeper context rails" },
                  { tier: "Institutional", glow: theme.warningGlow, line: "Participation web + institutional-grade learning context" },
                ].map((x) => (
                  <div key={x.tier} className="rounded-[22px] border border-white/10 bg-black/20 p-4" style={{ boxShadow: `0 0 60px ${x.glow} inset` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{x.tier}</div>
                      <div className="h-[10px] w-[10px] rounded-full" style={{ background: x.glow, boxShadow: `0 0 24px ${x.glow}` }} />
                    </div>
                    <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{x.line}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Demo pricing preview • no certainty • no recommendations
              </div>
            </div>
          </div>

          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Educational market intelligence only • no trade execution • no guaranteed returns
          </div>
        </div>
      </section>
    </div>
  );
}
