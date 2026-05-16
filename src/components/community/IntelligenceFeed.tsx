import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type FeedCategory = "Market narratives" | "Sector observations" | "Behavioural analysis" | "Institutional interpretations";

type FeedItem = {
  id: string;
  author: string;
  category: FeedCategory;
  title: string;
  body: string;
  confidenceEnvironment: ConfidenceState;
};

function labelForState(state: ConfidenceState): string {
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

function softFeedCopy(state: ConfidenceState, key: number): { title: string; body: string } {
  const flip = key % 2 === 0;
  switch (state) {
    case "CONFIDENCE_RISING":
      return flip
        ? {
            title: "Selective strength persists across core participation",
            body: "Market structure continues to absorb complexity with composed confidence. Interpretation remains calm, context-aware, and continuity-first.",
          }
        : {
            title: "Institutional alignment reads steadier under current structure",
            body: "Confidence environments adapt gradually as breadth holds responsibly. The discussion focuses on timing rather than certainty claims.",
          };
    case "STABLE_CONVICTION":
      return flip
        ? {
            title: "Confidence remains balanced with supportive breadth",
            body: "Narratives stay editorial and measured. Risk sensitivity is contained, shaping interpretation toward structural clarity.",
          }
        : {
            title: "Broad participation stays constructive while details reorganize",
            body: "Liquidity posture supports calm analysis. Confidence conditions hold without aggressive storyline replacement.",
          };
    case "NEUTRAL_ENVIRONMENT":
      return flip
        ? {
            title: "Observational balance dominates the environment",
            body: "Energy reorganizes slowly as liquidity quality and volatility posture stabilize. Community notes emphasize continuity and disciplined interpretation.",
          }
        : {
            title: "Narratives recalibrate calmly under evolving conditions",
            body: "Volatility pressure remains measured, so confidence environments stay operational. Discussions remain calm and structurally grounded.",
          };
    case "MOMENTUM_WEAKENING":
      return flip
        ? {
            title: "Momentum becomes selective with longer confirmation cycles",
            body: "Behavioural notes suggest thinner follow-through while structure remains workable. The community prioritises liquidity conditioning and disciplined evaluation.",
          }
        : {
            title: "Selective leadership persists as breadth narrows subtly",
            body: "Discussions remain analytical—timing matters more than direction. Confidence environments tighten without fear-based framing.",
          };
    case "ELEVATED_RISK":
      return flip
        ? {
            title: "Volatility-conditioned sensitivity tightens interpretive margins",
            body: "Institutional signals persist, but confidence boundaries become narrower. Notes stay guarded and focused on structure rather than certainty outcomes.",
          }
        : {
            title: "Elevated volatility shifts attention toward conditioning",
            body: "Liquidity sensitivity rises; interpretation remains measured. Community narratives avoid aggressive guarantees and keep probabilistic framing.",
          };
  }
}

type Props = {
  compact?: boolean;
};

export default function IntelligenceFeed({ compact = false }: Props): JSX.Element {
  const { state, theme, narrativeKey } = useConfidenceEngine();
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("Market narratives");

  const categories: FeedCategory[] = useMemo(
    () => ["Market narratives", "Sector observations", "Behavioural analysis", "Institutional interpretations"],
    [],
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const k = narrativeKey % 1000;
    const baseAuthor = k % 3 === 0 ? "Analyst Desk" : k % 3 === 1 ? "Research Steward" : "Institutional Notes";
    const otherEnv: ConfidenceState =
      state === "ELEVATED_RISK" ? "MOMENTUM_WEAKENING" : state === "MOMENTUM_WEAKENING" ? "NEUTRAL_ENVIRONMENT" : "ELEVATED_RISK";

    const mk = (i: number, category: FeedCategory, env: ConfidenceState): FeedItem => {
      const copy = softFeedCopy(env, k + i);
      return {
        id: `feed_${category}_${i}_${k}`,
        author: i % 2 === 0 ? baseAuthor : "Community Research Thread",
        category,
        title: copy.title,
        body: copy.body,
        confidenceEnvironment: env,
      };
    };

    const all: FeedItem[] = [
      mk(1, "Market narratives", state),
      mk(2, "Sector observations", otherEnv),
      mk(3, "Behavioural analysis", state),
      mk(4, "Institutional interpretations", otherEnv),
      mk(5, "Market narratives", state),
      mk(6, "Behavioural analysis", otherEnv),
    ];

    return all;
  }, [state, narrativeKey]);

  const visible = useMemo(() => {
    const limit = compact ? 2 : 4;
    return feedItems.filter((it) => it.category === activeCategory).slice(0, limit);
  }, [feedItems, activeCategory, compact]);

  const activeGlow = glowFor(state, theme);

  return (
    <section className="w-full">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Intelligence Feed</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">Editorial market notes</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = c === activeCategory;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className="h-[32px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
                style={{
                  boxShadow: active ? `0 0 18px ${activeGlow}` : undefined,
                  borderColor: active ? "rgba(255,255,255,0.18)" : undefined,
                  color: active ? "rgba(255,255,255,0.85)" : undefined,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {visible.map((it) => (
            <motion.article
              key={it.id}
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
              className="w-full rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{it.author}</div>
                  <div className="mt-2 text-[18px] font-semibold leading-[1.5] text-white/92">{it.title}</div>
                </div>

                <div
                  className="h-[10px] w-[10px] rounded-full mt-2"
                  style={{
                    background: glowFor(it.confidenceEnvironment, theme),
                    boxShadow: `0 0 18px ${glowFor(it.confidenceEnvironment, theme)}`,
                    opacity: 0.9,
                  }}
                />
              </div>

              <div className="mt-4 text-[15px] leading-[1.8] text-white/85">{it.body}</div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{it.category}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Env: {labelForState(it.confidenceEnvironment)}
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
