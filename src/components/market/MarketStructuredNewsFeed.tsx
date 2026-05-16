import React, { useMemo, useState } from "react";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type CategoryId = "rbi_policy" | "inflation_rates" | "budgets_cycle" | "global_influence" | "sector_regulation";

type CategoryDef = {
  id: CategoryId;
  label: string;
  hint: string;
};

type NewsProxyItem = {
  id: string;
  title: string;
  body: string;
  whenLabel?: string;
  confidenceTone: ConfidenceState;
};

type Props = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
  variant?: "page" | "embedded";
};

const CATEGORIES: CategoryDef[] = [
  {
    id: "rbi_policy",
    label: "RBI policy sensitivity",
    hint: "Rate-setting context as a conditioning variable (SEBI-safe).",
  },
  {
    id: "inflation_rates",
    label: "Inflation & rates",
    hint: "Inflation texture and rates pressure translated into calm context.",
  },
  {
    id: "budgets_cycle",
    label: "Budget cycle",
    hint: "Fiscal cycle tone → liquidity & confidence texture (educational proxy).",
  },
  {
    id: "global_influence",
    label: "Global influence",
    hint: "Global risk windows as calm scenario framing.",
  },
  {
    id: "sector_regulation",
    label: "Sector regulation",
    hint: "Sector policy-like constraints interpreted as pacing cues (not headlines).",
  },
];

function glowFor(state: ConfidenceState, theme: ConfidenceTheme): string {
  switch (state) {
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

function deriveTone(confidenceState: ConfidenceState, idx: number): ConfidenceState {
  // Keep it calm and consistent: alternate only slightly.
  if (idx % 4 === 0) return confidenceState;
  if (confidenceState === "ELEVATED_RISK") return idx % 2 === 0 ? "MOMENTUM_WEAKENING" : "ELEVATED_RISK";
  if (confidenceState === "MOMENTUM_WEAKENING") return idx % 2 === 0 ? "NEUTRAL_ENVIRONMENT" : "MOMENTUM_WEAKENING";
  if (confidenceState === "CONFIDENCE_RISING") return idx % 2 === 0 ? "STABLE_CONVICTION" : "CONFIDENCE_RISING";
  return confidenceState;
}

function pickTimeline(synthesis: NeuralMarketSynthesis, max: number): NeuralMarketSynthesis["timeline"] {
  const list = synthesis.timeline ?? [];
  return list.slice(0, Math.max(0, max));
}

export default function MarketStructuredNewsFeed({
  synthesis,
  confidenceState,
  theme,
  beginner = false,
  variant = "page",
}: Props): JSX.Element {
  const anchors = useMemo(() => pickTimeline(synthesis, 5), [synthesis]);

  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId>("rbi_policy");

  const confidenceToneForItem = (idx: number) => deriveTone(confidenceState, idx);

  const itemsByCategory = useMemo(() => {
    const anchor0 = anchors[0]?.text ?? synthesis.macroGeopolitical.headline;
    const anchor1 = anchors[1]?.text ?? synthesis.liquidityIntelligenceCore;
    const anchor2 = anchors[2]?.text ?? synthesis.institutionalBehaviour;
    const anchor3 = anchors[3]?.text ?? synthesis.behaviouralPsychology;
    const anchor4 = anchors[4]?.text ?? synthesis.sectorRotationMatrix;

    const sectorRegText = synthesis.sectorRotationMatrix;
    const firstScanner = synthesis.scannerCards?.[0]?.title ?? "Sector leadership cues";

    const bodyPrefix = "Educational, SEBI-safe context (no headlines). ";
    const safeNoCert = "We frame this as conditioning texture—not certainty, not trade advice.";

    const byCat: Record<CategoryId, NewsProxyItem[]> = {
      rbi_policy: [
        {
          id: "news_rbi_0",
          title: "Policy-like rates sensitivity (conditioning)",
          body: `${bodyPrefix}${anchor0} ${safeNoCert}`,
          whenLabel: anchors[0]?.whenLabel,
          confidenceTone: confidenceToneForItem(0),
        },
      ],
      inflation_rates: [
        {
          id: "news_infl_0",
          title: "Inflation & rates texture (stability lens)",
          body: `${bodyPrefix}${anchor1} ${safeNoCert}`,
          whenLabel: anchors[1]?.whenLabel,
          confidenceTone: confidenceToneForItem(1),
        },
      ],
      budgets_cycle: [
        {
          id: "news_budget_0",
          title: "Budget cycle tone → liquidity confidence",
          body: `${bodyPrefix}${anchor2} ${safeNoCert}`,
          whenLabel: anchors[2]?.whenLabel,
          confidenceTone: confidenceToneForItem(2),
        },
      ],
      global_influence: [
        {
          id: "news_global_0",
          title: "Global influence windows (scenario framing)",
          body: `${bodyPrefix}${anchor3} ${safeNoCert}`,
          whenLabel: anchors[3]?.whenLabel,
          confidenceTone: confidenceToneForItem(3),
        },
      ],
      sector_regulation: [
        {
          id: "news_sector_0",
          title: "Sector regulation / policy pacing (interpreted cue)",
          body: `${bodyPrefix}${anchor4} ${safeNoCert} Suggested learning node: ${firstScanner}.`,
          whenLabel: anchors[4]?.whenLabel,
          confidenceTone: confidenceToneForItem(4),
        },
        ...(beginner
          ? []
          : [
              {
                id: "news_sector_1",
                title: "Regulatory pacing: what to watch calmly",
                body: `${bodyPrefix}${sectorRegText} We focus on interpretation margins and participation sensitivity.`,
                confidenceTone: deriveTone(confidenceState, 7),
              },
            ]),
      ],
    };

    return byCat;
  }, [anchors, synthesis, confidenceState, beginner]);

  const categoriesForUI = useMemo(() => {
    // Beginner: show fewer categories first (still calm; no “headline flood”).
    if (!beginner) return CATEGORIES;
    return CATEGORIES.filter((c) => c.id === "rbi_policy" || c.id === "inflation_rates" || c.id === "global_influence");
  }, [beginner]);

  const activeCategory = categoriesForUI.find((c) => c.id === activeCategoryId) ?? categoriesForUI[0];
  const activeItems = itemsByCategory[activeCategory.id] ?? [];

  const panelGlow = glowFor(confidenceState, theme);

  const wrapperClass = variant === "embedded" ? "relative z-[12]" : "relative z-[12] px-6 sm:px-[72px] pb-14";

  return (
    <section className={wrapperClass}>
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Structured Market News Ecosystem</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Market-wide context (calm, grouped)</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80 max-w-[90ch]">
              No newsroom chaos. We translate macro-like signals into grouped learning nodes, separated from company news.
            </div>
          </div>

          <div
            className="shrink-0 rounded-full border border-white/10 bg-black/20 px-[14px] py-[10px]"
            style={{ boxShadow: `0 0 70px rgba(0,0,0,0.2), 0 0 120px ${panelGlow}` }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">SEBI-safe framing</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">No certainty claims</div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap gap-2 items-center">
            {categoriesForUI.map((c) => {
              const active = c.id === activeCategory.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryId(c.id)}
                  className={[
                    "h-[34px] rounded-full border px-[14px] text-[11px] uppercase tracking-[0.18em] transition ss-focus-outline",
                    active ? "border-white/20 bg-white/[0.05] text-white/90" : "border-white/10 bg-black/20 text-white/65 hover:text-white/85",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Category intent</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{activeCategory.hint}</div>

                <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">How to read</div>
                  <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
                    You’re learning the conditioning environment, not buying/selling based on headlines.
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="space-y-4">
                {activeItems.map((it) => {
                  const glow = glowFor(it.confidenceTone, theme);
                  return (
                    <article
                      key={it.id}
                      className="rounded-[24px] border border-white/10 bg-black/25 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
                      style={{ boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 70px rgba(0,0,0,0.0), 0 0 60px ${glow}` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">
                            {it.whenLabel ? it.whenLabel : "Market context"}
                          </div>
                          <div className="mt-2 text-[18px] font-semibold leading-[1.4] text-white/92">{it.title}</div>
                        </div>

                        <div
                          className="h-[10px] w-[10px] rounded-full shrink-0 mt-2"
                          style={{ background: glow, boxShadow: `0 0 18px ${glow}` }}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="mt-4 text-[15px] leading-[1.9] text-white/85">{it.body}</div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
                grouped learning nodes • calm density • no breaking-news presentation
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
