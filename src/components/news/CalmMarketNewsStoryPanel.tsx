import React, { useEffect, useMemo } from "react";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { CompanyUniverseModel } from "../../types/CompanyUniverse";

import ProgressiveDisclosure from "../../shared/ui/components/ProgressiveDisclosure";
import { NewsEventCard } from "./NewsEventCard";
import { CardBody, CardLabel, MicroLabel, SectionTitle } from "../../shared/ui/components/TypographyIntelligence";
import SSGlassCard from "../ui/SSGlassCard";

import { buildNewsStory } from "../../services/news/newsStoryEngine";
import { loadCachedNewsStory, saveCachedNewsStory } from "../../services/news/newsStoryCache";
import type { BuiltNewsStory, NewsStoryLayerId, NewsEvent } from "../../services/news/newsStoryTypes";

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner: boolean;

  /**
   * Optional company context (company-specific intelligence layer).
   * When absent, we still render the market-wide story.
   */
  company?: CompanyUniverseModel | null;

  isMobile: boolean;

  /**
   * Which layers to include in the progressive disclosure.
   * Defaults to the full calm “market story” stack.
   */
  layerOrder?: NewsStoryLayerId[];

  /**
   * Optional connection layer callback:
   * makes related-company chips navigable.
   */
  onOpenCompany?: (ticker: string) => void;
};

function getLayerLabel(layer: NewsStoryLayerId): string {
  switch (layer) {
    case "major":
      return "Major market developments";
    case "sector":
      return "Sector movement";
    case "company":
      return "Company-specific updates";
    case "macro":
      return "Macroeconomic events";
    case "earnings":
      return "Earnings & business developments";
    case "educational":
      return "Educational market context";
    default:
      return "Context layer";
  }
}

function getLayerKicker(layer: NewsStoryLayerId, beginner: boolean): string {
  switch (layer) {
    case "major":
      return beginner ? "Major changes (calm summary)" : "Major changes (structured learning node)";
    case "sector":
      return "Sector pacing & relevance";
    case "company":
      return "Company intelligence (bounded interpretation)";
    case "macro":
      return "Macro context (scenario framing)";
    case "earnings":
      return beginner ? "Earnings context (simplified)" : "Earnings context (interpretation depth)";
    case "educational":
      return "How to read (glossary + trust line)";
    default:
      return "Educational context";
  }
}

function renderEventsGrid(events: NewsEvent[], theme: ConfidenceTheme, beginner: boolean, isMobile: boolean, onOpenCompany?: (ticker: string) => void) {
  if (!events.length) return null;

  return (
    <div className={isMobile ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
      {events.map((e) => (
        <NewsEventCard key={e.id} event={e} theme={theme} beginner={beginner} isMobile={isMobile} onOpenCompany={onOpenCompany} />
      ))}
    </div>
  );
}

export default function CalmMarketNewsStoryPanel({
  synthesis,
  confidenceState,
  theme,
  beginner,
  company = null,
  isMobile,
  layerOrder,
  onOpenCompany,
}: Props): JSX.Element {
  const debugOpen = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("debugOpenCalmNewsStory");
      return raw === "1" || raw?.toLowerCase() === "true";
    } catch {
      return false;
    }
  }, []);

  // Deterministic “seed” from current synthesis timestamp.
  const narrativeSeed = useMemo(() => {
    const at = synthesis.marketCompositeAt;
    return Number.isFinite(at) ? Math.floor(at) : 0;
  }, [synthesis.marketCompositeAt]);

  const companyTicker = company?.ticker?.toUpperCase().trim() ?? undefined;

  const cached = useMemo(() => {
    return loadCachedNewsStory({ narrativeSeed, companyTicker, beginner });
  }, [narrativeSeed, companyTicker, beginner]);

  const story: BuiltNewsStory = useMemo(() => {
    if (cached) return cached;

    return buildNewsStory({
      synthesis,
      confidenceState,
      theme,
      beginner,
      company,
      narrativeKey: narrativeSeed,
    });
  }, [cached, synthesis, confidenceState, theme, beginner, company, narrativeSeed]);

  useEffect(() => {
    if (cached) return;

    saveCachedNewsStory(story, {
      narrativeSeed,
      companyTicker,
      beginner,
      ttlMs: 1000 * 60 * 20, // 20 minutes: enough for “freshness” without churn
    });
  }, [cached, story, narrativeSeed, companyTicker, beginner]);

  const defaultLayerOrder: NewsStoryLayerId[] = ["major", "sector", "company", "macro", "earnings", "educational"];
  const effectiveLayerOrder = layerOrder ?? defaultLayerOrder;

  const steps = useMemo(() => {
    return effectiveLayerOrder.map((layer) => {
      const events = story.layers[layer] ?? [];

      return {
        id: layer,
        label: getLayerLabel(layer),
        content: (
          <div className="space-y-4">
            <SSGlassCard variant="secondary" className="p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{getLayerKicker(layer, beginner)}</div>
              <div className="mt-3 text-[16px] font-semibold text-white/92 leading-[1.25]">{getLayerLabel(layer)}</div>
                <div className="mt-2 text-[13px] leading-[1.8] text-white/80">
                Signal framing for calm scanning
              </div>
            </SSGlassCard>

            {layer === "educational" ? (
              <SSGlassCard variant="primary" className="p-6">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{story.educational.headline}</div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{story.educational.body}</div>

                <SSGlassCard variant="secondary" className="mt-5 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Glossary (calm learning)</div>
                  <div className="mt-3 space-y-3">
                    {story.educational.glossary.map((g) => (
                      <div key={g.term}>
                        <div className="text-[12px] font-semibold text-white/92">{g.term}</div>
                        <div className="mt-1 text-[13px] leading-[1.7] text-white/80">{g.definition}</div>
                      </div>
                    ))}
                  </div>
                </SSGlassCard>

                <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">{story.educational.trustLine}</div>
              </SSGlassCard>
            ) : (
              renderEventsGrid(events, theme, beginner, isMobile, onOpenCompany)
            )}
          </div>
        ),
      };
    });
  }, [story, theme, beginner, isMobile, onOpenCompany, effectiveLayerOrder]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <ProgressiveDisclosure
          debugLabel="calm_news_story_panel"
          front={
            <SSGlassCard variant="primary" className="p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <CardLabel>Contextual market storytelling</CardLabel>
              <SectionTitle>Structured “what changed?” interpretation</SectionTitle>
              <CardBody className="leading-[1.9] text-white/85 max-w-[92ch]">
                Calm signal grouping across major changes, sector pacing, company updates, and macro context.
                Complexity unfolds progressively—built for calm scanning.
              </CardBody>
              <MicroLabel className="mt-4">Learning context</MicroLabel>
            </SSGlassCard>
          }
          steps={steps}
          collapsedCtaLabel="Expand market story"
          collapseCtaLabel="Collapse"
          initialOpen={debugOpen}
          className="mt-0"
        />
      </div>
    </section>
  );
}
