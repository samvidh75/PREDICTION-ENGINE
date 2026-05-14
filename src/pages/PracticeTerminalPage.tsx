import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import { MarketService } from "../services/market/marketService";
import { useMarketService } from "../services/ui/environmentSync";
import { buildPortfolioIntelligence, type PortfolioHolding, type SectorId } from "../services/portfolio/portfolioIntelligenceEngine";
import { useMotionController } from "../components/motion/MotionController";
import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";

type PositionEvent = {
  id: string;
  at: number;
  kind: "simulate" | "evaluate" | "market";
  text: string;
};

type SectorMeta = {
  id: SectorId;
  label: string;
};

type TickerMeta = {
  ticker: string;
  company: string;
  sector: SectorId;
};

const DEFAULT_CAPITAL = 10_00_000; // ₹10,00,000 (simulated)

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

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatTime(at: number): string {
  const d = new Date(at);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm} IST`;
}

const SECTORS: SectorMeta[] = [
  { id: "Banking", label: "Banking" },
  { id: "IT", label: "IT" },
  { id: "Energy", label: "Energy" },
  { id: "FMCG", label: "FMCG" },
  { id: "Pharma", label: "Pharma" },
  { id: "Defence", label: "Defence" },
  { id: "Auto", label: "Auto" },
  { id: "Infrastructure", label: "Infrastructure" },
];

const TICKERS: TickerMeta[] = [
  { ticker: "HDFCBANK", company: "HDFC BANK", sector: "Banking" },
  { ticker: "INFY", company: "INFOSYS", sector: "IT" },
  { ticker: "RELIANCE", company: "RELIANCE", sector: "Energy" },
  { ticker: "HINDUNILVR", company: "HINDUNILVR", sector: "FMCG" },
  { ticker: "SUNPHARMA", company: "SUN PHARMA", sector: "Pharma" },
  { ticker: "DRDO_LENS", company: "DEFENCE LENS", sector: "Defence" },
  { ticker: "TATAMOTORS", company: "TATA MOTORS", sector: "Auto" },
  { ticker: "LTI_INFRA", company: "LTI INFRA", sector: "Infrastructure" },
];

function computeWeightPct(positions: PortfolioHolding[]): Array<PortfolioHolding & { weightPct: number }> {
  const sum = positions.reduce((acc, p) => acc + Math.max(0, p.weight), 0);
  const denom = sum || 1;
  return positions.map((p) => ({
    ...p,
    weightPct: (Math.max(0, p.weight) / denom) * 100,
  }));
}

function behaviouralTeachingMessage(args: {
  tradeCount60s: number;
  concentration: number;
  volatilitySensitivity: number;
  defensiveAlignment: number;
  environment: string;
}): { title: string; body: string } {
  const { tradeCount60s, concentration, volatilitySensitivity, defensiveAlignment, environment } = args;

  const isOverconcentrated = concentration >= 0.36;
  const isVolSensitive = volatilitySensitivity >= 0.7;
  const isFastActivity = tradeCount60s >= 3;
  const isDefensive = defensiveAlignment >= 0.64;

  if (isFastActivity && isOverconcentrated) {
    return {
      title: "Positioning behaviour is becoming timing-sensitive",
      body: "Recent activity suggests faster decision cycles; combine this environment with concentration-aware pacing and liquidity conditioning to keep interpretation structurally grounded.",
    };
  }

  if (isVolSensitive && !isDefensive) {
    return {
      title: "Volatility sensitivity is contributing to exposure texture",
      body: "This environment increases interpretation sensitivity; a calmer approach is to prioritise structure and alignment checks before expanding emphasis across cyclical segments.",
    };
  }

  if (isOverconcentrated && isDefensive) {
    return {
      title: "Concentration is present, but defensive alignment is supporting structure",
      body: "Even with elevated concentration, the environment remains relatively disciplined. Focus on continuity: evaluate exposure shifts against institutional alignment rather than short-term intensity.",
    };
  }

  if (tradeCount60s === 0) {
    return {
      title: "Behaviour remains consistent during the simulated window",
      body: "No recent positioning activity was added; interpret market inputs through continuity and observe how confidence environments adapt without forcing changes.",
    };
  }

  if (isOverconcentrated) {
    return {
      title: "Concentration is gradually tightening",
      body: "As concentration increases, sensitivity to volatility and liquidity conditions becomes more meaningful. Keep adjustments incremental and avoid chasing short-term intensity.",
    };
  }

  return {
    title: "Behaviour appears structurally disciplined",
    body: "Recent simulation activity is staying within a composed range. Use the timeline to reflect on how market structure and confidence environments shape interpretation over time.",
  };
}

export default function PracticeTerminalPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state: confidenceState, narrativeKey, marketState: _marketStateLabel } = useConfidenceEngine();
  const { isMobile } = useMotionController();

  const marketServiceRef = useRef<MarketService | null>(null);
  if (!marketServiceRef.current) marketServiceRef.current = new MarketService();

  const marketSnapshot = useMarketService(marketServiceRef.current);

  const [capital] = useState<number>(DEFAULT_CAPITAL);
  const [positions, setPositions] = useState<PortfolioHolding[]>([]);
  const [events, setEvents] = useState<PositionEvent[]>([]);

  const [selectedTicker, setSelectedTicker] = useState<string>(TICKERS[0]!.ticker);
  const [allocationPct, setAllocationPct] = useState<number>(12);

  const [reflection, setReflection] = useState<string>("");
  const [reflectionLog, setReflectionLog] = useState<Array<{ id: string; at: number; text: string }>>([]);

  const simStartAtRef = useRef<number>(Date.now());

  const positionsN = useMemo(() => computeWeightPct(positions), [positions]);

  const allocated = useMemo(() => positions.reduce((acc, p) => acc + Math.max(0, p.weight), 0), [positions]);
  const remainingCash = clamp(capital - allocated, 0, capital);

  const marketInputs = marketSnapshot.snapshot.marketInputs;

  const portfolioIntelligence = useMemo(() => {
    return buildPortfolioIntelligence({
      holdings: positions,
      confidenceState,
      marketInputs,
      narrativeKey,
    });
  }, [positions, confidenceState, marketInputs, narrativeKey]);

  const recentTradeCount60s = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => e.kind === "simulate" && now - e.at <= 60_000).length;
  }, [events]);

  const behaviourMsg = useMemo(() => {
    return behaviouralTeachingMessage({
      tradeCount60s: recentTradeCount60s,
      concentration: portfolioIntelligence.health.concentration,
      volatilitySensitivity: portfolioIntelligence.health.volatilitySensitivity,
      defensiveAlignment: portfolioIntelligence.health.defensiveAlignment,
      environment: portfolioIntelligence.health.environment,
    });
  }, [recentTradeCount60s, portfolioIntelligence]);

  useEffect(() => {
    // Create a calm “market pulse” timeline entry when confidence state changes.
    if (!marketSnapshot.snapshot.at) return;
  }, [marketSnapshot.snapshot.at]);

  const lastMarketLogRef = useRef<number>(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastMarketLogRef.current < 10_000) return;

    // Only log market shifts when pulses meaningfully change.
    const vix = marketSnapshot.snapshot.marketState.vix;
    const breadth = marketSnapshot.snapshot.marketState.breadthPct;

    const last = events[events.length - 1];
    const shouldLog = !last || last.kind !== "market";

    if (shouldLog) {
      lastMarketLogRef.current = now;
      const txt =
        vix >= 15.5
          ? "Market environment is trending toward higher volatility sensitivity in the simulated window."
          : "Market structure remains supportive; observe how confidence environments adapt.";
      setEvents((prev) => [
        ...prev,
        {
          id: `m_${now}`,
          at: now,
          kind: "market",
          text: txt,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketSnapshot.snapshot.marketState.vix, marketSnapshot.snapshot.marketState.breadthPct]);

  const selected = useMemo(() => TICKERS.find((t) => t.ticker === selectedTicker) ?? TICKERS[0]!, [selectedTicker]);

  const simulatePosition = () => {
    const pct = clamp(allocationPct, 1, 60);
    if (remainingCash <= 0) {
      setEvents((prev) => [
        ...prev,
        { id: `sim_${Date.now()}`, at: Date.now(), kind: "evaluate", text: "Simulated environment is near full allocation. Re-evaluate exposure before adding more." },
      ]);
      return;
    }

    const desiredAmount = (pct / 100) * capital;
    const delta = clamp(desiredAmount, 0, remainingCash);

    if (delta <= 0) return;

    setPositions((prev) => {
      const existing = prev.find((p) => p.ticker === selected.ticker);
      if (!existing) {
        return [
          ...prev,
          {
            id: `pos_${selected.ticker}_${Date.now()}`,
            company: selected.company,
            ticker: selected.ticker,
            sector: selected.sector,
            weight: delta,
          },
        ];
      }

      return prev.map((p) =>
        p.ticker === selected.ticker
          ? { ...p, weight: Math.max(0, p.weight + delta) }
          : p,
      );
    });

    setEvents((prev) => [
      ...prev,
      {
        id: `sim_${Date.now()}`,
        at: Date.now(),
        kind: "simulate",
        text: `Simulated exposure added: ${selected.company} (${selected.sector}) into the educational portfolio environment.`,
      },
    ]);
  };

  const resetSimulation = () => {
    const now = Date.now();
    setPositions([]);
    setEvents([
      {
        id: `reset_${now}`,
        at: now,
        kind: "evaluate",
        text: "Simulation environment reset. Begin building a simulated market environment again.",
      },
    ]);
    setReflection("");
    setReflectionLog([]);
    simStartAtRef.current = now;
  };

  const sessionProgress = useMemo(() => {
    const elapsed = Date.now() - simStartAtRef.current;
    const minutes = Math.max(1, Math.round(elapsed / 60_000));
    const eventsCount = events.length;
    // A calm “learning progress” indicator, not a game score.
    const progress = clamp((eventsCount / (minutes * 4 + 2)) * 0.8 + (positions.length > 0 ? 0.2 : 0), 0, 1);
    return progress;
  }, [events, positions.length]);

  const allocationTerrain = useMemo(() => {
    return portfolioIntelligence.health.environment;
  }, [portfolioIntelligence.health.environment]);

  const orbTightening = portfolioIntelligence.orbPulseTightening;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />
      {!isMobile && <SentimentFlow />}

      <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[96px] pb-[80px]">
        {/* Practice Hero Layer */}
        <section className="relative" style={{ height: isMobile ? "auto" : "62vh" }}>
          <div className="absolute inset-0" />

          {/* Top row */}
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-[560px]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
                Practice Terminal • Simulated environment for educational and analytical purposes
              </div>
              <div className="mt-3 text-[42px] font-semibold leading-[1.1] tracking-[-0.04em]">
                Virtual portfolio intelligence
              </div>
              <div className="mt-4 text-[15px] leading-[1.8] text-white/85">
                Observe how confidence environments evolve as exposure concentration and volatility sensitivity change.
                No trading execution. No certainty claims.
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[8px] inline-flex items-center gap-2">
                  <span className="h-[8px] w-[8px] rounded-full" style={{ background: "rgba(0,255,210,0.35)", boxShadow: "0 0 18px rgba(0,255,210,0.16)" }} />
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                    Simulated capital: ₹{formatINR(capital)}
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[8px] inline-flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                    Remaining cash: ₹{formatINR(remainingCash)}
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[8px] inline-flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                    Learning pace: {Math.round(sessionProgress * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Right: confidence environment */}
            <div className="w-[420px] max-w-[420px]">
              <div
                className="rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
                style={{
                  boxShadow: `0 0 40px rgba(0,0,0,0.35), 0 0 ${orbTightening > 0.75 ? 120 : 70}px rgba(0,255,210,0.03)`,
                }}
              >
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Confidence atmosphere</div>
                <div className="mt-3 text-[22px] font-semibold text-white/92">{confidenceLabel(confidenceState)}</div>
                <div className="mt-3 text-[14px] leading-[1.7] text-white/80">
                  {portfolioIntelligence.health.environment}
                </div>

                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Behavioural intelligence</div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/85">
                    {behaviourMsg.title}
                  </div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/75">
                    {behaviourMsg.body}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    VIX proxy: {marketSnapshot.snapshot.marketState.vix.toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={resetSimulation}
                    className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Centre: orb visualisation */}
          <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
            <motion.div
              style={{ scale: prefersReducedMotion ? 1 : 1 + orbTightening * 0.02 }}
              animate={prefersReducedMotion ? undefined : { rotate: [0, 0.6, 0] }}
              transition={{ duration: 8, repeat: prefersReducedMotion ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
            >
              <MarketOrb />
              <OrbEffects />
            </motion.div>

            <div className="mt-4 text-center">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">Exposure environment</div>
              <div className="text-[13px] leading-[1.6] text-white/85">{allocationTerrain}</div>
            </div>
          </div>
        </section>

        {/* Main sections */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Section: Simulation Portfolio + Position Analysis */}
          <div className="lg:col-span-5">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Simulation portfolio</div>
                  <div className="mt-3 text-[22px] font-medium text-white/92">Virtual allocation landscape</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Educational only
                </div>
              </div>

              <div className="mt-5">
                {positions.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                    <div className="text-[13px] leading-[1.7] text-white/85">
                      Begin building a simulated market environment by adding educational exposure modules.
                    </div>
                    <div className="mt-3 text-[12px] uppercase tracking-[0.18em] text-white/45">
                      No positions yet
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {positionsN
                      .slice()
                      .sort((a, b) => b.weightPct - a.weightPct)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{p.company}</div>
                              <div className="mt-2 text-[14px] text-white/90">{p.ticker}</div>
                              <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-white/45">
                                Sector: {p.sector}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[22px] font-semibold text-white/92">{p.weightPct.toFixed(0)}%</div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">simulated weight</div>
                            </div>
                          </div>

                          <div className="mt-3 text-[13px] leading-[1.6] text-white/80">
                            Confidence alignment: {portfolioIntelligence.orbColorKey.toUpperCase()} environment (contextual).
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Market Execution Sandbox (Simulate Position) */}
          <div className="lg:col-span-4">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market execution sandbox</div>
                <div className="mt-3 text-[22px] font-medium text-white/92">Test allocation behaviour</div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Simulate exposure</div>
                  <div className="mt-3">
                    <select
                      value={selectedTicker}
                      onChange={(e) => setSelectedTicker(e.target.value)}
                      className="w-full h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                    >
                      {TICKERS.map((t) => (
                        <option key={t.ticker} value={t.ticker} className="bg-[#0A0D10]">
                          {t.company} • {t.sector}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Allocation intensity</div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      value={allocationPct}
                      min={1}
                      max={60}
                      onChange={(e) => setAllocationPct(Number(e.target.value))}
                      className="w-[140px] h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                    />
                    <div className="text-[13px] leading-[1.6] text-white/75">
                      Adds a simulated module to your educational environment.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.button
                    type="button"
                    onClick={() => {
                      simulatePosition();
                    }}
                    whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                    className="h-[58px] rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                  >
                    Simulate Position
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setEvents((prev) => [
                        ...prev,
                        { id: `eval_${Date.now()}`, at: Date.now(), kind: "evaluate", text: "Evaluate exposure: compare concentration texture against confidence environment and liquidity sensitivity." },
                      ]);
                    }}
                    whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                    className="h-[58px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 hover:text-white/85 transition"
                  >
                    Evaluate Exposure
                  </motion.button>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Environment highlights</div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/85">
                    {portfolioIntelligence.narrative.headline}
                  </div>
                  <div className="mt-2 text-[13px] leading-[1.6] text-white/70">
                    {portfolioIntelligence.narrative.supporting}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Behavioural Intelligence + Positions timeline */}
          <div className="lg:col-span-3">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Behavioural intelligence layer</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Learning pulse</div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Recent positioning behaviour</div>
                <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{behaviourMsg.title}</div>
                <div className="mt-2 text-[13px] leading-[1.6] text-white/75">{behaviourMsg.body}</div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Environment pulse</div>
                <div className="mt-2 text-[13px] leading-[1.6] text-white/85">
                  Concentration tightening: {(portfolioIntelligence.health.concentrationTightening * 100).toFixed(0)}%
                </div>
                <div className="mt-2 text-[13px] leading-[1.6] text-white/70">
                  Volatility sensitivity: {(portfolioIntelligence.health.volatilitySensitivity * 100).toFixed(0)}%
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Simulation timeline</div>

                <div className="mt-3 space-y-3">
                  {events.slice(-5).reverse().map((e) => (
                    <div key={e.id} className="text-[12px] leading-[1.7] text-white/80">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{formatTime(e.at)}</div>
                      <div className="mt-1">{e.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline full */}
        <section className="mt-10">
          <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Simulation timeline</div>
                <div className="mt-3 text-[22px] font-medium text-white/92">Chronological intelligence feed</div>
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">No broker logs • only educational events</div>
            </div>

            <div className="mt-6 relative pl-10">
              <div className="absolute left-[8px] top-0 bottom-0 w-[2px] rounded-full bg-white/10" />
              <div className="space-y-4">
                <AnimatePresence>
                  {events.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="text-[14px] leading-[1.8] text-white/80"
                    >
                      Begin building a simulated market environment by adding exposure modules.
                    </motion.div>
                  ) : (
                    events
                      .slice()
                      .reverse()
                      .map((e) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="relative pl-4"
                        >
                          <div className="absolute left-[-2px] top-[6px] h-[10px] w-[10px] rounded-full bg-white/20" />
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{formatTime(e.at)}</div>
                          <div className="mt-1 text-[14px] leading-[1.7] text-white/85">{e.text}</div>
                        </motion.div>
                      ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Learning + reflection */}
        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Learning intelligence feed</div>
                  <div className="mt-3 text-[22px] font-medium text-white/92">Market structure lessons</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Educational • editorial • calm</div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  {
                    id: "l1",
                    title: "Confidence environments are contextual",
                    body: "Your simulated confidence atmosphere changes as concentration and volatility sensitivity evolve, without assuming certainty.",
                  },
                  {
                    id: "l2",
                    title: "Liquidity and timing shape exposure texture",
                    body: portfolioIntelligence.scenario.riskFraming,
                  },
                  {
                    id: "l3",
                    title: "Sector exposure becomes the primary lens",
                    body: "When allocation concentration tightens, sector-level interpretation becomes more meaningful for how behavioural signals are read.",
                  },
                  {
                    id: "l4",
                    title: "Behaviour learning is the real outcome",
                    body: "Use the timeline to observe whether pacing stays composed during volatility-conditioned sensitivity.",
                  },
                ].map((c) => (
                  <div key={c.id} className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{c.title}</div>
                    <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{c.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Strategy reflection</div>
                  <div className="mt-3 text-[22px] font-medium text-white/92">Build long-term behavioural intelligence</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[13px] leading-[1.8] text-white/80">
                  Reflect calmly on your recent simulation pacing: concentration, volatility sensitivity, and how you chose to evaluate exposure.
                </div>

                <textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Write an editorial reflection (educational only)…"
                  className="mt-4 w-full min-h-[140px] rounded-[22px] border border-white/10 bg-black/25 p-4 text-[14px] leading-[1.7] text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                />

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Keep it analytical • no guilt • no shaming
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => {
                      const text = reflection.trim();
                      if (!text) return;
                      setReflectionLog((prev) => [...prev, { id: `rf_${Date.now()}`, at: Date.now(), text }]);
                      setReflection("");
                    }}
                    whileHover={!prefersReducedMotion ? { translateY: -2 } : undefined}
                    className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                  >
                    Save Reflection
                  </motion.button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {reflectionLog.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-black/25 p-5 text-[13px] leading-[1.7] text-white/75">
                    No reflections yet. When ready, save one calmly and editorially.
                  </div>
                ) : (
                  reflectionLog
                    .slice()
                    .reverse()
                    .slice(0, 4)
                    .map((r) => (
                      <div key={r.id} className="rounded-[22px] border border-white/10 bg-black/25 p-5">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{formatTime(r.at)}</div>
                        <div className="mt-2 text-[14px] leading-[1.8] text-white/85">{r.text}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 text-center text-[12px] uppercase tracking-[0.18em] text-white/45">
          Simulated environment for educational and analytical purposes • No trade execution • No investment advice
        </div>
      </div>
    </div>
  );
}
