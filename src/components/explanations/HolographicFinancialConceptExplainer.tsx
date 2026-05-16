import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";
import { useConfidenceEngine } from "../../components/intelligence/ConfidenceEngine";
import HolographicConceptVisual from "./HolographicConceptVisual";
import type { ConceptVisualPayload } from "./HolographicConceptVisual";

export type FinancialConceptKey = "marketCap" | "pe" | "liquidity" | "volatility" | "debtRatio";

type ExplainerText = {
  title: string;
  whatItMeans: string;
  whyItMatters: string;
  contextNote: string;
};

type HolographicFinancialConceptExplainerProps = {
  concept: FinancialConceptKey;
  open: boolean;
  onClose: () => void;
  themeOverride?: ConfidenceTheme;
  stateOverride?: ConfidenceState;
  visualPayload?: ConceptVisualPayload;
};

function toneGlow(state: ConfidenceState, theme: ConfidenceTheme): string {
  switch (state) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
      return theme.deepBlueGlow;
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function buildExplainer(concept: FinancialConceptKey, beginner: boolean): ExplainerText {
  switch (concept) {
    case "marketCap":
      return beginner
        ? {
            title: "Market cap (educational context)",
            whatItMeans:
              "Market cap is a size-view: it shows how the market is valuing a company overall, based on share price and number of shares.",
            whyItMatters:
              "Size helps you interpret the kind of attention a company may attract—while your confidence atmosphere determines how quickly the interpretation becomes sensitive.",
            contextNote: "Educational only: used for positioning and learning framing (no forecasting, no certainty claims).",
          }
        : {
            title: "Market cap (bounded learning lens)",
            whatItMeans:
              "Market cap reflects valuation texture. In this interface, it helps categorize whether your interpretation is likely to be driven more by stability cues or by sensitivity cues under changing confidence environments.",
            whyItMatters:
              "Valuation size can align with broader participation patterns, but the narrative still depends on liquidity, volatility posture, and confidence boundaries.",
            contextNote: "Used as a calm contextual rail—bounded variance, educational framing, no execution.",
          };

    case "pe":
      return beginner
        ? {
            title: "PE (educational context)",
            whatItMeans:
              "PE compares a company’s price to its earnings. It helps you understand how much the market is paying for each rupee of earnings.",
            whyItMatters:
              "A higher PE often suggests the market is pricing earnings more optimistically relative to averages; a lower PE can suggest the opposite. Here we treat it as valuation texture, not a prediction.",
            contextNote:
              "Educational only: we describe valuation feeling under confidence environments—without trade advice and without certainty language.",
          }
        : {
            title: "PE (contextual valuation texture)",
            whatItMeans:
              "PE is a comparative valuation ratio (price relative to earnings). Here it is interpreted as a bounded learning signal—how the valuation narrative can feel under current confidence and liquidity posture.",
            whyItMatters:
              "Interpretive sensitivity changes when confidence becomes more risk-conditioned or momentum-selective. Earnings consistency cues help keep your understanding grounded.",
            contextNote: "This explainer avoids outcome claims; it’s a precision-engineered educational overlay.",
          };

    case "liquidity":
      return beginner
        ? {
            title: "Liquidity (educational context)",
            whatItMeans:
              "Liquidity is how easily the market can exchange buying and selling activity without the experience becoming rough. In our learning lens, we treat liquidity as a pacing variable.",
            whyItMatters:
              "When liquidity is supportive, signals tend to transmit more smoothly into your confidence atmosphere. When liquidity becomes tighter, the same news can feel sharper and more selective.",
            contextNote:
              "Educational only: this is about interpretation texture and pacing, not trade execution or certainty.",
          }
        : {
            title: "Liquidity (transmission pacing)",
            whatItMeans:
              "Liquidity describes market depth/flow conditions that shape how quickly and smoothly information translates into confidence behavior. It’s a conditioning layer for interpretive pacing.",
            whyItMatters:
              "Liquidity-conditioned environments influence whether narratives feel continuity-first or selectively amplified. That effect matters more for interpretation than direction certainty.",
            contextNote:
              "Bounded educational framework—no outcome claims and no execution framing.",
          };

    case "volatility":
      return beginner
        ? {
            title: "Volatility (educational context)",
            whatItMeans:
              "Volatility describes how much market movement can vary over short periods. In this system, it’s treated as sensitivity—how responsive your learning lens becomes to new information.",
            whyItMatters:
              "Higher volatility usually makes interpretation more time-sensitive: the same context can feel more reactive. Lower volatility supports steadier, continuity-first reading.",
            contextNote:
              "Educational only: we explain sensitivity texture and pacing boundaries without predictions.",
          }
        : {
            title: "Volatility (sensitivity field)",
            whatItMeans:
              "Volatility acts like a sensitivity field. It doesn’t guarantee outcomes; it changes how quickly your confidence atmosphere responds to exposure texture (participation, liquidity conditioning, and earnings context).",
            whyItMatters:
              "Under elevated volatility conditions, interpretive margins tighten: narratives need stronger structure-first grounding to stay calm.",
            contextNote:
              "Precision-engineered educational overlay—no certainty language and no execution framing.",
          };

    case "debtRatio":
      return beginner
        ? {
            title: "Debt ratio (educational context)",
            whatItMeans:
              "Debt ratio is a leverage intensity lens: it represents how much financial burden/obligation load exists relative to flexibility. In this interface, it’s model-derived and used for comparative learning texture.",
            whyItMatters:
              "Higher debt-ratio intensity generally increases how sensitive a business narrative can feel—because financing obligations reduce room for adjustment when conditions change.",
            contextNote:
              "Educational only: relative tension lens (not real-time audited numbers). We avoid over-precision and avoid trade advice.",
          }
        : {
            title: "Debt ratio (structural tension lens)",
            whatItMeans:
              "Debt ratio is treated as a structural tension signal—an interpretive layer for how financing constraints can condition narrative calmness versus sensitivity. In this UI it’s a bounded learning texture (model-derived).",
            whyItMatters:
              "When debt-ratio intensity rises, interpretation becomes more resilience-first: governance and liquidity discipline are weighted more heavily to keep understanding stable.",
            contextNote:
              "SEBI-safe educational framing: no outcome promises, no execution, and no certainty claims.",
          };

    default: {
      // Exhaustiveness guard
      const _exhaustive: never = concept;
      return {
        title: "Financial concept",
        whatItMeans: "Educational explanation is available for this concept.",
        whyItMatters: "It matters for interpretive context in this learning interface.",
        contextNote: "Educational only • no certainty • no execution.",
      };
    }
  }
}

export default function HolographicFinancialConceptExplainer({
  concept,
  open,
  onClose,
  themeOverride,
  stateOverride,
  visualPayload,
}: HolographicFinancialConceptExplainerProps): JSX.Element {
  const { state, theme } = useConfidenceEngine();

  const usedState = stateOverride ?? state;
  const usedTheme = themeOverride ?? theme;

  const { experienceLevel } = useBeginnerIntelligenceCalibration();
  const beginner = experienceLevel === "beginner";

  const glow = useMemo(() => toneGlow(usedState, usedTheme), [usedState, usedTheme]);

  const text = useMemo(() => buildExplainer(concept, beginner), [concept, beginner]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Financial concept explainer"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
            }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-[760px] rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.45)]"
            initial={{ y: 10, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              boxShadow: `0 0 80px ${glow}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Concept explanation</div>
                <div className="mt-2 text-[22px] font-semibold text-white/92 leading-[1.2]">{text.title}</div>
                <div className="mt-2 text-[13px] leading-[1.7] text-white/75">
                  Educational only • calm interpretation • no execution
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-[44px] w-[44px] rounded-full border border-white/10 bg-black/25 text-white/75 hover:text-white/95 transition shrink-0"
                aria-label="Close explainer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Learning visualization</div>
              <div className="mt-3">
                <HolographicConceptVisual
                  concept={concept}
                  confidenceState={usedState}
                  toneGlow={glow}
                  toneEdgeGlow={glow}
                  beginner={beginner}
                  payload={visualPayload}
                />
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Educational texture • SEBI-safe framing • non-execution
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">What it means</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{text.whatItMeans}</div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Why it matters</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{text.whyItMatters}</div>
              </div>

              <div className="md:col-span-2 rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Context note</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{text.contextNote}</div>
              </div>
            </div>

            <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
              Appears on demand • non-intrusive learning • SEBI-safe educational framing
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
