import React, { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { useMotionController } from "../components/motion/MotionController";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";

import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";
import StockStoryChartIntegration from "../components/charts/StockStoryChartIntegration";

function confidenceLabel(state: ConfidenceState): string {
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

function stateCategory(state: ConfidenceState): { tone: string; rationale: string } {
  switch (state) {
    case "CONFIDENCE_RISING":
      return {
        tone: "Constructive institutional tone",
        rationale: "Signals remain constructive with selective strength; confidence improves as breadth holds responsibly.",
      };
    case "STABLE_CONVICTION":
      return {
        tone: "Stable confidence environment",
        rationale: "Market health checks remain controlled; interpretation stays balanced as risk intensity is contained.",
      };
    case "NEUTRAL_ENVIRONMENT":
      return {
        tone: "Observational balance",
        rationale: "Liquidity and volatility reorganize slowly; behavioural interpretations remain consistent without escalation.",
      };
    case "MOMENTUM_WEAKENING":
      return {
        tone: "Momentum becomes selective",
        rationale: "Follow-through thins slightly; structure remains intact while confirmation cycles lengthen.",
      };
    case "ELEVATED_RISK":
      return {
        tone: "Volatility-conditioned caution",
        rationale: "Risk intensity elevates under volatility pressure; interpretation tightens without assuming directional certainty.",
      };
  }
}

function safeStockNarrative(state: ConfidenceState, variant: number): string {
  const v = variant % 2 === 0;
  switch (state) {
    case "CONFIDENCE_RISING":
      return v
        ? "Institutional participation remains selective despite broader market complexity, supporting a steadier confidence environment."
        : "Large-cap leadership continues consolidating around durable participation, while uncertainty is absorbed with controlled breadth.";
    case "STABLE_CONVICTION":
      return v
        ? "Market structure reflects stable institutional confidence; momentum remains balanced while risk sensitivity stays contained."
        : "Confidence conditions hold: signals stay constructive and breadth remains supportive without aggressive behavioural expansion.";
    case "NEUTRAL_ENVIRONMENT":
      return v
        ? "The environment remains observational—energy reorganizes gradually as liquidity quality and volatility posture stabilize."
        : "Interpretive confidence is calm: participation continues, but narrative focus stays selective rather than expansive.";
    case "MOMENTUM_WEAKENING":
      return v
        ? "Momentum participation appears increasingly concentrated; follow-through is more selective even as structure remains workable."
        : "Behavioural signals soften modestly—confirmation cycles lengthen, suggesting caution in interpretation rather than breakdown.";
    case "ELEVATED_RISK":
      return v
        ? "Volatility conditions widen the confidence margin; institutional signals persist, but interpretive clarity becomes tighter."
        : "Risk intensity increases under volatility pressure—participation can fragment, so narrative interpretation stays guarded.";
  }
}

type StockProfile = {
  company: string;
  ticker: string;
  sector: string;
};

function profileFromUrl(): StockProfile {
  if (typeof window === "undefined") {
    return { company: "TATA MOTORS", ticker: "TTM", sector: "Automobile" };
  }
  const params = new URLSearchParams(window.location.search);
  const ticker = params.get("ticker")?.toUpperCase().trim() || "TTM";
  const map: Record<string, StockProfile> = {
    INFY: { company: "INFOSYS", ticker: "INFY", sector: "IT Services" },
    TCS: { company: "TATA CONSULTANCY SERVICES", ticker: "TCS", sector: "IT Services" },
    RELIANCE: { company: "RELIANCE", ticker: "RELIANCE", sector: "Energy & Retail" },
    HDFCBANK: { company: "HDFC BANK", ticker: "HDFCBANK", sector: "Banking" },
    TTM: { company: "TATA MOTORS", ticker: "TTM", sector: "Automobile" },
  };
  return map[ticker] ?? { company: ticker, ticker, sector: "Multi-sector" };
}

function badgeGlow(state: ConfidenceState, theme: { cyanGlow: string; warningGlow: string; deepBlueGlow: string; magentaGlow: string }): string {
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

export default function StockStoryPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, narrativeKey, narrativeVariant, marketState } = useConfidenceEngine();
  const { scrollProgress, isMobile } = useMotionController();
  const stock = useMemo(() => profileFromUrl(), []);

  const { tone, rationale } = useMemo(() => stateCategory(state), [state]);
  const narrative = useMemo(() => safeStockNarrative(state, narrativeVariant), [state, narrativeVariant]);

  const heroScale = prefersReducedMotion ? 1 : scrollProgress;

  const confidencePanelContent = useMemo(() => {
    const key = narrativeKey % 4;
    const behavioural =
      state === "ELEVATED_RISK"
        ? "Behaviour remains risk-conditioned; institutions keep signals selective."
        : state === "MOMENTUM_WEAKENING"
          ? "Participation becomes more concentrated; confirmation cycles lengthen."
          : state === "NEUTRAL_ENVIRONMENT"
            ? "Energy reorganizes calmly; volatility pressure stays measured."
            : state === "CONFIDENCE_RISING"
              ? "Selective strength supports steadier participation breadth."
              : "Confidence holds with balanced breadth and contained sensitivity.";
    return {
      state: confidenceLabel(state),
      rationale: rationale,
      behavioural,
      key,
    };
  }, [state, narrativeKey, rationale]);

  const institutionalCards = useMemo(() => {
    const base = [
      { id: "i1", label: "Private banking bias", body: "Defensive allocation continues with measured confidence under current conditioning." },
      { id: "i2", label: "Block participation tone", body: "Selectivity persists; accumulation patterns appear structured rather than impulsive." },
      { id: "i3", label: "Sector allocation shifts", body: "Rotation is present with editorial caution on follow-through timing." },
    ];
    if (state === "MOMENTUM_WEAKENING") {
      return [
        { id: "i1", label: "Institutional selectivity", body: "Breadth remains present, but responsiveness slows across near-term participation." },
        { id: "i2", label: "Follow-through restraint", body: "Momentum signals thin slightly—structure remains intact, interpretation stays cautious." },
        { id: "i3", label: "Liquidity conditioning", body: "Liquidity quality moderates; confirmation timing becomes more important." },
      ];
    }
    if (state === "ELEVATED_RISK") {
      return [
        { id: "i1", label: "Risk-conditioned positioning", body: "Institutions keep signals selective as volatility pressure widens interpretive margins." },
        { id: "i2", label: "Distribution sensitivity", body: "Liquidity sensitivity rises; narrative interpretation stays measured, not directional." },
        { id: "i3", label: "Condition monitoring", body: "Breadth can fragment—observational mode remains active for structure." },
      ];
    }
    return base;
  }, [state]);

  const financialCards = useMemo(() => {
    const v = narrativeKey % 2 === 0;
    const isRisk = state === "ELEVATED_RISK";
    const cash = isRisk ? "Moderate Cash Flow Stability" : v ? "Strong Cash Flow Stability" : "Operational Cash Flow Resilience";
    const profit = state === "MOMENTUM_WEAKENING" ? "Profitability Quality: Steady, selective" : "Profitability Quality: structurally supported";
    const leverage = state === "ELEVATED_RISK" ? "Debt Structure: monitoring under volatility" : "Debt Structure: contained sensitivity";
    const efficiency = "Operating Efficiency: disciplined execution";
    return [
      { id: "f1", cat: "Cash Flow Stability", metric: cash, interp: "Operational cash generation remains structurally healthy despite cyclical volatility." },
      { id: "f2", cat: "Profitability Quality", metric: profit, interp: "Earnings posture stays measured; the environment supports clarity without assuming acceleration." },
      { id: "f3", cat: "Debt & Balance", metric: leverage, interp: "Leverage sensitivity is interpreted cautiously; the narrative focuses on resilience rather than certainty." },
      { id: "f4", cat: "Operating Efficiency", metric: efficiency, interp: "Process discipline remains intact, supporting steadier institutional interpretation." },
    ];
  }, [state, narrativeKey]);

  const behaviouralCards = useMemo(() => {
    if (state === "ELEVATED_RISK") {
      return [
        { id: "b1", title: "Volatility-conditioned participation", body: "Momentum participation can fragment near pressure windows; behaviour stays selective rather than chaotic." },
        { id: "b2", title: "Speculation cooling", body: "Short-term intensity softens—interpretation prioritizes structure and liquidity conditioning." },
        { id: "b3", title: "Exhaustion risk (interpretive)", body: "Monitoring remains important as confidence margins tighten under volatility." },
      ];
    }
    if (state === "MOMENTUM_WEAKENING") {
      return [
        { id: "b1", title: "Concentrated momentum psychology", body: "Participation appears increasingly concentrated among near-term flows; follow-through becomes more selective." },
        { id: "b2", title: "Cooling confirmation cycles", body: "Selling pressure stabilizes; uncertainty is present, yet breakdown signals remain limited." },
        { id: "b3", title: "Liquidity-led stabilization", body: "Liquidity conditions help temper momentum drift—interpretation stays calm and structural." },
      ];
    }
    if (state === "NEUTRAL_ENVIRONMENT") {
      return [
        { id: "b1", title: "Calm reorganization", body: "Energy reorganizes slowly; momentum maintains a steady tone with measured liquidity sensitivity." },
        { id: "b2", title: "Institutional consistency", body: "Institutional posture remains observational; narratives adjust without sudden replacement." },
        { id: "b3", title: "Behavioral equilibrium", body: "Conditions remain stable enough for editorial clarity, without pushing certainty." },
      ];
    }
    if (state === "CONFIDENCE_RISING") {
      return [
        { id: "b1", title: "Selective accumulation", body: "Institutional participation supports a steadier confidence environment while uncertainty persists." },
        { id: "b2", title: "Momentum leadership stays disciplined", body: "Momentum improves with breadth holding responsibly; interpretive confidence rises gradually." },
        { id: "b3", title: "Risk absorption", body: "Volatility pressure remains present but absorbed efficiently; the system stays composed." },
      ];
    }
    return [
      { id: "b1", title: "Balanced confidence posture", body: "Momentum remains stable with controlled breadth; behavioural interpretation stays grounded." },
      { id: "b2", title: "Institutional selectivity maintained", body: "Participation is structured rather than impulsive; risk intensity stays contained." },
      { id: "b3", title: "Editorial continuity", body: "Narrative coherence remains intact, supporting calm decision structure." },
    ];
  }, [state]);

  const timeline = useMemo(() => {
    const base = [
      { id: "t1", when: "Recent session", text: "Volatility posture adjusted; interpretive confidence remains calm and contextual." },
      { id: "t2", when: "Weekly window", text: "Institutional signals stayed selective; breadth continues to support structural reading." },
      { id: "t3", when: "Earnings cadence", text: "Operational stability reflected in behavioural interpretation; uncertainty remains monitored." },
      { id: "t4", when: "Sector lens", text: "Rotation indicators suggest controlled repositioning rather than aggressive expansion." },
      { id: "t5", when: "Liquidity lens", text: "Liquidity quality reads stable; participation remains workable with measured sensitivity." },
      { id: "t6", when: "Risk environment", text: "Risk intensity conditions recalibrate gently—no fear-based narrative framing." },
    ];

    const pick = (idx: number) => base[(idx + (narrativeKey % 3)) % base.length];

    return [pick(0), pick(1), pick(2), pick(3)];
  }, [narrativeKey]);

  const sectorPositioning = useMemo(() => {
    if (state === "ELEVATED_RISK") {
      return [
        { id: "s1", label: "Relative structure", value: "Resilience monitored", detail: "Participation remains intact while interpretive margins tighten." },
        { id: "s2", label: "Sector behaviour", value: "Defensive rotation signals", detail: "Capital distribution stays measured with cautious timing." },
        { id: "s3", label: "Momentum posture", value: "Selective leadership", detail: "Follow-through becomes more dependent on liquidity conditioning." },
      ];
    }
    if (state === "MOMENTUM_WEAKENING") {
      return [
        { id: "s1", label: "Relative structure", value: "Stability with caution", detail: "Momentum leadership remains stable while confirmation cycles lengthen." },
        { id: "s2", label: "Sector behaviour", value: "Consolidating rotation", detail: "Rotation is present but follow-through is selective." },
        { id: "s3", label: "Momentum posture", value: "Controlled participation", detail: "Behavior shifts toward measured responsiveness." },
      ];
    }
    if (state === "NEUTRAL_ENVIRONMENT") {
      return [
        { id: "s1", label: "Relative structure", value: "Observational balance", detail: "Energy reorganizes calmly; narrative continuity remains intact." },
        { id: "s2", label: "Sector behaviour", value: "Gradual repositioning", detail: "Institutional posture is measured and consistent." },
        { id: "s3", label: "Momentum posture", value: "Steady, disciplined", detail: "Participation is present without aggressive expansion." },
      ];
    }
    if (state === "CONFIDENCE_RISING") {
      return [
        { id: "s1", label: "Relative structure", value: "Strength with selectivity", detail: "Institutional confidence improves while uncertainty is absorbed responsibly." },
        { id: "s2", label: "Sector behaviour", value: "Constructive rotation", detail: "Capital movement supports leadership without chasing volatility." },
        { id: "s3", label: "Momentum posture", value: "Measured acceleration", detail: "Breadth holds with controlled interpretive confidence." },
      ];
    }
    return [
      { id: "s1", label: "Relative structure", value: "Stable conviction", detail: "Market structure remains supportive; interpretation stays balanced." },
      { id: "s2", label: "Sector behaviour", value: "Selective consolidation", detail: "Technology/sector leadership consolidates around durable participation." },
      { id: "s3", label: "Momentum posture", value: "Balanced leadership", detail: "Participation remains disciplined and structurally consistent." },
    ];
  }, [state]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      <SentimentFlow />
      <IntelligenceHUD />

      {/* Ambient Hero Layer */}
      <section
        className="relative z-[11]"
        style={{
          height: isMobile ? "auto" : "68vh",
          minHeight: isMobile ? 640 : undefined,
          paddingTop: 96,
          paddingBottom: 64,
          paddingLeft: isMobile ? 20 : 72,
          paddingRight: isMobile ? 20 : 72,
        }}
      >
        <div className="absolute inset-0" />

        <div className="relative h-full">
          {/* Left: stock identity + story */}
          <div className="absolute left-0 top-0 w-full sm:w-[520px]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
              {stock.sector} • {marketState}
            </div>

            <div className="mt-3 text-[52px] font-semibold leading-[1.05] tracking-[-0.04em]">
              {stock.company}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="text-[13px] uppercase tracking-[0.18em] text-white/70">{stock.ticker}</div>
              <div className="h-[6px] w-[6px] rounded-full" style={{ background: badgeGlow(state, theme), boxShadow: `0 0 18px ${badgeGlow(state, theme)}` }} />
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">{confidenceLabel(state)}</div>
            </div>

            <div className="mt-5 text-[18px] leading-[1.9] text-white/85 max-w-[520px]">{narrative}</div>

            <div className="mt-5 rounded-[999px] border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px] inline-flex items-center gap-2">
              <div className="h-[8px] w-[8px] rounded-full" style={{ background: badgeGlow(state, theme), boxShadow: `0 0 18px ${badgeGlow(state, theme)}` }} />
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
                Live environment • recalibrating key:{narrativeKey % 1000}
              </div>
            </div>
          </div>

          {/* Center: orb ecosystem */}
          <motion.div
            className="absolute left-[58%] top-[38%] -translate-x-1/2 -translate-y-1/2"
            style={{ scale: heroScale }}
          >
            <MarketOrb />
            <OrbEffects />
          </motion.div>

          {/* Right: confidence environment panel */}
          <div className="absolute right-0 top-0 w-[340px]">
            <div
              className="rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
              style={{ boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 120px ${badgeGlow(state, theme)}` }}
            >
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Confidence Environment</div>
              <div className="mt-3 text-[20px] font-semibold text-white/92">{confidencePanelContent.state}</div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{tone}</div>
              <div className="mt-4 text-[13px] leading-[1.7] text-white/75">{confidencePanelContent.rationale}</div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Behavioural summary</div>
                <div className="mt-2 text-[13px] leading-[1.6] text-white/85">{confidencePanelContent.behavioural}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Institutional Activity Layer */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Institutional Activity Layer</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Floating intelligence capsules</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">measured • interpretive • calm</div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {institutionalCards.map((c) => (
              <motion.div
                key={c.id}
                className="min-w-[280px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : { y: -2, boxShadow: `0 0 60px rgba(0,0,0,0.45), 0 0 120px ${badgeGlow(state, theme)}` }
                }
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              >
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{c.label}</div>
                <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{c.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: Financial Intelligence System */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Financial Intelligence System</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Cinematic metric environments</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">no tables • only interpretation</div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {financialCards.map((m) => (
              <div
                key={m.id}
                className="h-[180px] rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
              >
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{m.cat}</div>
                <div className="mt-4 text-[20px] font-semibold text-white/92">{m.metric}</div>
                <div className="mt-4 text-[13px] leading-[1.7] text-white/80">{m.interp}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: Behavioural Analysis Layer */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Behavioural Analysis Layer</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Ambient behavioral waveforms</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {behaviouralCards.map((b, idx) => (
              <div key={b.id} className="relative rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08]" style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,255,210,0.65), transparent 55%)" }} />
                <div className="relative">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{`Signal ${idx + 1}`}</div>
                  <div className="mt-3 text-[16px] font-semibold text-white/92">{b.title}</div>
                  <div className="mt-3 text-[14px] leading-[1.7] text-white/80">{b.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: Risk Environment */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Risk Environment</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Measured caution, not fear</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">desaturated • controlled • professional</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                { id: "r1", cat: "Volatility environment", val: state === "ELEVATED_RISK" ? "Elevated and irregular" : "Contained and orderly" },
                { id: "r2", cat: "Liquidity concerns", val: state === "ELEVATED_RISK" ? "Sensitivity increases under stress" : "Quality remains supportive" },
                { id: "r3", cat: "Earnings uncertainty", val: state === "MOMENTUM_WEAKENING" ? "Confirmation cycles lengthen" : "Structural posture remains intact" },
              ].map((r) => (
                <div key={r.id} className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{r.cat}</div>
                  <div className="mt-3 text-[14px] leading-[1.7] text-white/85">{r.val}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-[13px] leading-[1.8] text-white/80">
              Risk framing stays balanced: uncertainty is interpreted structurally, with no fear-based user pressure.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Timeline Intelligence Feed */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Timeline Intelligence Feed</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Chronological interpretation</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="relative">
              <div className="absolute left-[16px] top-0 bottom-0 w-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="space-y-4">
                {timeline.map((t, idx) => (
                  <div key={t.id} className="relative pl-10">
                    <div
                      className="absolute left-[8px] top-[4px] h-[10px] w-[10px] rounded-full"
                      style={{ background: idx === timeline.length - 1 ? badgeGlow(state, theme) : "rgba(255,255,255,0.12)", boxShadow: idx === timeline.length - 1 ? `0 0 18px ${badgeGlow(state, theme)}` : "none" }}
                    />
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">{t.when}</div>
                    <div className="mt-2 text-[14px] leading-[1.8] text-white/85">{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: Sector Positioning Layer */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Sector Positioning Layer</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Relative intelligence, not heatmaps</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sectorPositioning.map((s) => (
              <div key={s.id} className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">{s.label}</div>
                <div className="mt-3 text-[16px] font-semibold text-white/92">{s.value}</div>
                <div className="mt-3 text-[14px] leading-[1.7] text-white/80">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9-10: Market Interpretation Summary (+ Chart placeholder) */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-24">
        <div className="mx-auto max-w-[1680px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market Interpretation Summary</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">A calm, probabilistic reading</div>
              <div className="mt-4 text-[15px] leading-[1.9] text-white/85">
                This stock currently reflects <span style={{ color: "rgba(255,255,255,0.94)" }}>{tone}</span>, with confidence
                environments evolving under market structure. Interpretations remain context-aware—risk intensity and liquidity conditions
                shape confidence breadth without asserting certainty.
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Current confidence state</div>
                <div className="mt-2 text-[14px] leading-[1.7] text-white/85">
                  {confidenceLabel(state)} • narrative key:{narrativeKey % 1000}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Chart Integration System</div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                Narrative-first cinematic chart surface (TradingView-ready): subtle, calm, and interpretation-supported.
              </div>

              <div className="mt-4">
                <StockStoryChartIntegration ticker={stock.ticker} defaultTimeframe="1M" />
              </div>
            </div>
          </div>

          {/* Fine print (SEBI-safe / trust) */}
          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Educational market intelligence only • No trade execution • No guaranteed returns
          </div>
        </div>
      </section>
    </div>
  );
}

// Fixed premium HUD (top nav + search + toast) is currently implemented in IntelligenceHUD.
import IntelligenceHUD from "../components/intelligence/IntelligenceHUD";
