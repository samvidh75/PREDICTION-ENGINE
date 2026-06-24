import React, { createContext, useContext, useMemo } from "react";
import type { CompanyHealthState, HealthTheme, FinancialTelemetryPoint } from "../../types/CompanyUniverse";
import type { InfographicTempo } from "./useInfographicTempo";
import { useInfographicTempo } from "./useInfographicTempo";
import { useCompanyFinancials, formatPE, formatMarketCap } from "../../services/company/useCompanyFinancials";

type FinanceDerived = {
  marketCap: number | null;
  pe: number | null;
  industryPe: number | null;
  fiveYearPeAvg: number | null;
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

  // Finance sourced from real API (TRACK-96A): no deterministic generation
  finance: FinanceDerived;

  // Primary glow tone for "emotional pacing" + focus guidance.
  toneGlow: string;
  toneEdgeGlow: string;
};

const MasterInfographicContext = createContext<MasterInfographicContextValue | null>(null);

export function useMasterInfographics(): MasterInfographicContextValue {
  const ctx = useContext(MasterInfographicContext);
  if (!ctx) throw new Error("useMasterInfographics must be used within <MasterInfographicEngine />");
  return ctx;
}

function toneForHealth(healthState: CompanyHealthState, healthTheme: HealthTheme): { toneGlow: string; toneEdgeGlow: string } {
  switch (healthState) {
    case "STRUCTURALLY_HEALTHY":
      return { toneGlow: healthTheme.glowCyan, toneEdgeGlow: healthTheme.glowCyan };
    case "STABLE_EXPANSION":
      return { toneGlow: healthTheme.glowslate, toneEdgeGlow: healthTheme.glowslate };
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

  // TRACK-96A: Real financial data from API, not deterministic generation
  const financialsState = useCompanyFinancials(ticker);

  const finance = useMemo<FinanceDerived>(() => {
    if (financialsState.kind === "loading" || financialsState.kind === "idle") {
      return {
        marketCap: null,
        pe: null,
        industryPe: null,
        fiveYearPeAvg: null,
        marketCapExact: "Loading financials...",
        marketCapWords: "",
        peFormatted: "—",
      };
    }

    if (financialsState.kind === "error" || financialsState.kind === "unavailable") {
      return {
        marketCap: null,
        pe: null,
        industryPe: null,
        fiveYearPeAvg: null,
        marketCapExact: "Awaiting financial data",
        marketCapWords: "",
        peFormatted: "—",
      };
    }

    const { data } = financialsState;
    const m = formatMarketCap(data.market_cap ?? undefined);
    const peText = formatPE(data.pe_ratio);

    return {
      marketCap: data.market_cap ?? null,
      pe: data.pe_ratio ?? null,
      industryPe: null,
      fiveYearPeAvg: null,
      marketCapExact: m.exact,
      marketCapWords: m.words,
      peFormatted: peText,
    };
  }, [financialsState]);

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
