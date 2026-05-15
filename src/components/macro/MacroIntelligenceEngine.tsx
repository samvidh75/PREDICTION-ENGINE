import React, { useMemo } from "react";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import HolographicTelemetryEngine from "../telemetry/HolographicTelemetryEngine";

type MacroIntelligenceEngineProps = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  compact?: boolean;
};

type MacroSystemCardDef = {
  key: string;
  systemLabel: string;
  title: string;
  body: string;
  glow: string;
};

function compactText(s: string, maxLen: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function toneGlow(conf: ConfidenceState, theme: ConfidenceTheme): string {
  switch (conf) {
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

export default function MacroIntelligenceEngine({
  synthesis,
  confidenceState,
  theme,
  compact = false,
}: MacroIntelligenceEngineProps): JSX.Element {
  const glow = useMemo(() => toneGlow(confidenceState, theme), [confidenceState, theme]);

  const cards = useMemo<MacroSystemCardDef[]>(() => {
    const health = synthesis.healthometer.state;

    const macroCoreTitle = "Global macro intelligence core";
    const macroCoreBody = `${synthesis.macroGeopolitical.headline}. ${compactText(
      synthesis.macroGeopolitical.body,
      220,
    )} Healthometer state anchors the tone as: ${health}.`;

    const ratesLiquidityTitle = "Interest rate & liquidity engine";
    const ratesLiquidityBody = `Liquidity pacing is treated as context: ${compactText(
      synthesis.liquidityIntelligenceCore,
      220,
    )} The engine avoids doom framing and stays probabilistic.`;

    const inflationCommodityTitle = "Inflation & commodity environment";
    const inflationCommodityBody =
      `Commodity-cycle interpretation uses volatility & liquidity texture as proxies. ${compactText(
        synthesis.futureProbabilityFramework,
        200,
      )} The narrative stays educational and non-overwhelming.`;

    const currencyTradeTitle = "Currency & trade intelligence layer";
    const currencyTradeBody = `Trade sensitivity is read through macro learning boundaries: ${compactText(
      synthesis.institutionalBehaviour,
      210,
    )} Export/import sensitivity is framed as probabilistic alignment, not certainty.`;

    const geoStabilityTitle = "Geopolitical stability matrix";
    const geoStabilityBody = `Geopolitical uncertainty is translated into market behaviour pacing. ${compactText(
      synthesis.behaviouralPsychology,
      210,
    )} Calm language only—no political bias, no alarm tone.`;

    const sectorSensitivityTitle = "Sector sensitivity mapping";
    const sectorSensitivityBody = `Sector response is rendered as a context lens: ${compactText(
      synthesis.sectorRotationMatrix,
      230,
    )} This links global texture to sector attention without claiming outcomes.`;

    const instFlowTitle = "Global institutional flow network";
    const instFlowBody = `Institutional behaviour is used as a learning anchor for macro-to-market interpretation. ${compactText(
      synthesis.institutionalBehaviour,
      220,
    )} FII/DII posture is treated as participation-quality context.`;

    const macroNarrativeTitle = "Macro narrative engine";
    const macroNarrativeBody = `${synthesis.narrative.editorialHeadline}. ${compactText(
      synthesis.narrative.conditionsNote,
      200,
    )} Macro-to-stock linking preview: macro texture → pacing sensitivity → ${health} tone.`;

    const worldInterfaceTitle = "Cinematic world intelligence interface";
    const worldInterfaceBody = `${compactText(synthesis.narrative.cinematicBody, 280)} The interface is massive yet calm: education-first, probabilistic, and emotionally comfortable.`;

    const planetTelemetryTitle = "Planetary market telemetry system";
    const planetTelemetryBody =
      "A cinematic spatial rendering of global flow texture. It communicates pace, breadth, and liquidity conditioning—never news, fear, or outcomes.";

    const globalCoreCard: MacroSystemCardDef = {
      key: "core",
      systemLabel: "GLOBAL MACRO INTELLIGENCE CORE",
      title: macroCoreTitle,
      body: macroCoreBody,
      glow: glow,
    };

    const telemetryCard: MacroSystemCardDef = {
      key: "planet",
      systemLabel: "PLANETARY MARKET TELEMETRY SYSTEM",
      title: planetTelemetryTitle,
      body: planetTelemetryBody,
      glow: theme.cyanGlow,
    };

    const ratesCard: MacroSystemCardDef = {
      key: "rates",
      systemLabel: "INTEREST RATE & LIQUIDITY ENGINE",
      title: ratesLiquidityTitle,
      body: ratesLiquidityBody,
      glow: theme.deepBlueGlow,
    };

    const inflationCard: MacroSystemCardDef = {
      key: "inflation",
      systemLabel: "INFLATION & COMMODITY ENVIRONMENT",
      title: inflationCommodityTitle,
      body: inflationCommodityBody,
      glow: theme.magentaGlow,
    };

    const currencyCard: MacroSystemCardDef = {
      key: "currency",
      systemLabel: "CURRENCY & TRADE INTELLIGENCE LAYER",
      title: currencyTradeTitle,
      body: currencyTradeBody,
      glow: theme.cyanGlow,
    };

    const geoCard: MacroSystemCardDef = {
      key: "geopolitics",
      systemLabel: "GEOPOLITICAL STABILITY MATRIX",
      title: geoStabilityTitle,
      body: geoStabilityBody,
      glow: theme.deepBlueGlow,
    };

    const sectorCard: MacroSystemCardDef = {
      key: "sector",
      systemLabel: "SECTOR SENSITIVITY MAPPING",
      title: sectorSensitivityTitle,
      body: sectorSensitivityBody,
      glow: theme.magentaGlow,
    };

    const instCard: MacroSystemCardDef = {
      key: "institutional",
      systemLabel: "GLOBAL INSTITUTIONAL FLOW NETWORK",
      title: instFlowTitle,
      body: instFlowBody,
      glow: theme.cyanGlow,
    };

    const narrativeCard: MacroSystemCardDef = {
      key: "narrative",
      systemLabel: "MACRO NARRATIVE ENGINE",
      title: macroNarrativeTitle,
      body: macroNarrativeBody,
      glow: glow,
    };

    const worldCard: MacroSystemCardDef = {
      key: "interface",
      systemLabel: "CINEMATIC WORLD INTELLIGENCE INTERFACE",
      title: worldInterfaceTitle,
      body: worldInterfaceBody,
      glow: theme.deepBlueGlow,
    };

    const ordered: MacroSystemCardDef[] = [
      globalCoreCard,
      telemetryCard,
      ratesCard,
      inflationCard,
      currencyCard,
      geoCard,
      sectorCard,
      instCard,
      narrativeCard,
      worldCard,
    ];

    if (!compact) return ordered;

    // Compact mode: keep core + narrative + linking systems; still keep 10? We’ll keep 7.
    return ordered.filter((c) =>
      new Set(["core", "planet", "rates", "inflation", "sector", "institutional", "narrative", "interface"]).has(c.key),
    );
  }, [confidenceState, theme, synthesis, glow, compact]);

  return (
    <section className="relative">
      <div className="rounded-[24px] border border-white/10 bg-black/10 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Macro Intelligence OS</div>
            <div className="mt-3 text-[26px] font-medium text-white/92 leading-[1.1]">Global macro intelligence ecosystem</div>
            <div className="mt-2 text-[14px] leading-[1.8] text-white/75 max-w-[82ch]">
              Cinematic, interconnected macro learning—analytical, calm, and probabilistic. No news feed. No fear framing.
            </div>
          </div>

          <div
            className="rounded-[999px] border border-white/10 bg-black/25 px-[14px] py-[10px] shrink-0"
            style={{ boxShadow: `0 0 90px ${glow}`, borderColor: "rgba(255,255,255,0.10)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Healthometer anchor</div>
            <div className="mt-1 text-[13px] text-white/92 font-semibold">{synthesis.healthometer.state}</div>
          </div>
        </div>

        {/* Planetary telemetry centerpiece */}
        <div className="mb-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Planetary Market Telemetry System</div>
              <div className="mt-3 text-[18px] font-medium text-white/92">Spatial macro flow texture (educational)</div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">calm • interconnected • non-alarmist</div>
          </div>

          <HolographicTelemetryEngine compact heightPx={320} showHeader={false} />
        </div>

        {/* Macro system cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.key}
              className="relative rounded-[22px] border border-white/10 bg-black/25 backdrop-blur-[18px] p-5 overflow-hidden"
              style={{
                boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 80px ${c.glow}`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{c.systemLabel}</div>
              <div className="mt-2 text-[16px] font-semibold leading-[1.3] text-white/92">{c.title}</div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{c.body}</div>
              <div className="mt-4 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">macro learning link</div>
                <div
                  className="h-[10px] w-[10px] rounded-full"
                  style={{ background: c.glow, boxShadow: `0 0 40px ${c.glow}`, opacity: 0.95 }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
          Analytical macro learning only • probabilistic framing • no fear • no political bias
        </div>
      </div>
    </section>
  );
}
