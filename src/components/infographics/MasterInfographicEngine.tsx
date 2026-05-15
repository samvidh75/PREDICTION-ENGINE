import React, { createContext, useContext, useMemo } from "react";
import type { CompanyHealthState, HealthTheme, FinancialTelemetryPoint } from "../../types/CompanyUniverse";
import type { InfographicTempo } from "./useInfographicTempo";
import { useInfographicTempo } from "./useInfographicTempo";
import { deriveDeterministicFinance, formatMarketCap, formatPE, hashStringToSeed } from "../companyUniverse/formatCompanyFinance";

type FinanceDerived = ReturnType<typeof deriveDeterministicFinance> & {
  marketCapExact: string;
  marketCapWords: string;
  peFormatted: string;
};

export type MasterInfographicContextValue = {
  enabled: boolean;
  ticker: string;
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  tempo: InfographicTempo;

  financialTelemetry: FinancialTelemetryPoint[];

  // Derived finance (deterministic: no execution / no claims)
  finance: FinanceDerived;

  // Primary glow tone for “emotional pacing” + focus guidance.
  toneGlow: string;
  toneEdgeGlow: string;
};

const MasterInfographicContext = createContext<MasterInfographicContextValue | null>(null);

export function useMasterInfographics(): MasterInfographicContextValue {
  const ctx = useContext(MasterInfographicContext);
  if (!ctx) throw new Error("useMasterInfographics must be used within <MasterInfographicEngine />");
  return ctx;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toneForHealth(healthState: CompanyHealthState, healthTheme: HealthTheme): { toneGlow: string; toneEdgeGlow: string } {
  switch (healthState) {
    case "STRUCTURALLY_HEALTHY":
      return { toneGlow: healthTheme.glowCyan, toneEdgeGlow: healthTheme.glowCyan };
    case "STABLE_EXPANSION":
      return { toneGlow: healthTheme.glowAmber, toneEdgeGlow: healthTheme.glowAmber };
    case "CONFIDENCE_IMPROVING":
      return { toneGlow: healthTheme.glowCyan, toneEdgeGlow: healthTheme.glowCyan };
    case "LIQUIDITY_FRAGILE":
      return { toneGlow: healthTheme.glowDeep, toneEdgeGlow: healthTheme.glowDeep };
    case "VOLATILITY_SENSITIVE":
      return { toneGlow: healthTheme.glowWarning, toneEdgeGlow: healthTheme.glowWarning };
    case "STRUCTURALLY_WEAKENING":
    default:
      return { toneGlow: healthTheme.glowWarning, toneEdgeGlow: healthTheme.glowWarning };
  }
}

export default function MasterInfographicEngine({
  enabled = true,
  ticker,
  healthState,
  healthTheme,
  financialTelemetry,
  children,
}: {
  enabled?: boolean;
  ticker: string;
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  financialTelemetry: FinancialTelemetryPoint[];
  children: React.ReactNode;
}): JSX.Element {
  const tempo = useInfographicTempo(enabled);

  const finance = useMemo<FinanceDerived>(() => {
    // Use deterministic seed to keep the visualization stable across renders.
    const seed = hashStringToSeed(`${ticker}_${healthState}_${financialTelemetry.length}`);
    const base = deriveDeterministicFinance(ticker, seed);

    const m = formatMarketCap(base.marketCap);
    const peText = formatPE(base.pe);

    return {
      ...base,
      marketCapExact: m.exact,
      marketCapWords: m.words,
      peFormatted: peText,
    };
  }, [ticker, healthState, financialTelemetry.length]);

  const { toneGlow, toneEdgeGlow } = useMemo(() => toneForHealth(healthState, healthTheme), [healthState, healthTheme]);

  const value = useMemo<MasterInfographicContextValue>(
    () => ({
      enabled,
      ticker,
      healthState,
      healthTheme,
      tempo,
      financialTelemetry,
      finance,
      toneGlow,
      toneEdgeGlow,
    }),
    [enabled, ticker, healthState, healthTheme, tempo, financialTelemetry, finance, toneGlow, toneEdgeGlow],
  );

  return <MasterInfographicContext.Provider value={value}>{children}</MasterInfographicContext.Provider>;
}
