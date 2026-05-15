import React, { useMemo } from "react";
import { useMasterInfographics } from "../infographics/MasterInfographicEngine";
import type { FinancialTelemetryPoint, HealthTheme } from "../../types/CompanyUniverse";
import type { CompanyHealthState } from "../../types/CompanyUniverse";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function colorForHealth(healthState: CompanyHealthState, healthTheme: HealthTheme): { bar: string; glow: string } {
  switch (healthState) {
    case "STRUCTURALLY_HEALTHY":
    case "CONFIDENCE_IMPROVING":
      return { bar: healthTheme.glowCyan, glow: healthTheme.glowCyan };
    case "STABLE_EXPANSION":
      return { bar: healthTheme.glowAmber, glow: healthTheme.glowAmber };
    case "VOLATILITY_SENSITIVE":
      return { bar: healthTheme.glowWarning, glow: healthTheme.glowWarning };
    case "LIQUIDITY_FRAGILE":
      return { bar: healthTheme.glowWarning, glow: healthTheme.glowWarning };
    case "STRUCTURALLY_WEAKENING":
    default:
      return { bar: healthTheme.glowWarning, glow: healthTheme.glowWarning };
  }
}

export default function CompanyFinancialInfographicEcosystem({
  points,
  beginner = false,
  healthState,
  healthTheme,
}: {
  points: FinancialTelemetryPoint[];
  beginner?: boolean;
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
}): JSX.Element {
  const { toneGlow, finance } = useMasterInfographics();

  const safe = useMemo(() => points.slice(0, 6), [points]);
  const { bar: healthBarGlow, glow: healthGlow } = useMemo(
    () => colorForHealth(healthState, healthTheme),
    [healthState, healthTheme],
  );

  const maxRevenue = useMemo(() => Math.max(...safe.map((p) => p.revenue), 1), [safe]);
  const maxProfit = useMemo(() => Math.max(...safe.map((p) => p.profit), 1), [safe]);
  const maxEbitda = useMemo(() => Math.max(...safe.map((p) => p.ebitda), 1), [safe]);

  const latest = safe[safe.length - 1] ?? null;
  const early = safe[0] ?? null;

  const changeShort = useMemo(() => {
    // “3-month” in spec — with year-like snapshots we use a short window slice for educational tone.
    const a = safe[1] ?? safe[0] ?? null;
    const b = safe[3] ?? safe[safe.length - 1] ?? null;
    if (!a || !b) return { revenue: 0, profit: 0, ebitda: 0 };
    return {
      revenue: pctChange(a.revenue, b.revenue),
      profit: pctChange(a.profit, b.profit),
      ebitda: pctChange(a.ebitda, b.ebitda),
    };
  }, [safe]);

  const changeMid = useMemo(() => {
    const a = safe[0] ?? null;
    const b = safe[4] ?? safe[safe.length - 1] ?? null;
    if (!a || !b) return { revenue: 0, profit: 0, ebitda: 0 };
    return {
      revenue: pctChange(a.revenue, b.revenue),
      profit: pctChange(a.profit, b.profit),
      ebitda: pctChange(a.ebitda, b.ebitda),
    };
  }, [safe]);

  const changeLong = useMemo(() => {
    if (!early || !latest) return { revenue: 0, profit: 0, ebitda: 0 };
    return {
      revenue: pctChange(early.revenue, latest.revenue),
      profit: pctChange(early.profit, latest.profit),
      ebitda: pctChange(early.ebitda, latest.ebitda),
    };
  }, [early, latest]);

  const shortShown = beginner ? safe.slice(0, 4) : safe;

  const barRow = (values: number[], max: number, glow: string): React.ReactNode => {
    return (
      <div className="flex items-end gap-2">
        {values.map((v, idx) => {
          const h = clamp((v / max) * 84, 6, 84);
          return (
            <div key={`br_${idx}`} className="flex-1 min-w-0">
              <div
                className="rounded-[12px] border border-white/10 bg-black/20"
                style={{
                  height: 96,
                  padding: 6,
                  display: "flex",
                  alignItems: "flex-end",
                  boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 ${Math.round(h * 0.8)}px ${glow}`,
                }}
              >
                <div
                  className="w-full rounded-[10px]"
                  style={{
                    height: h,
                    background: glow,
                    opacity: 0.35,
                    boxShadow: `0 0 44px ${glow}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mt-6 rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Financial Infographic Ecosystem</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">Evolution corridors (educational)</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">profit • ebitda • revenue • bounded interpretation</div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Profit & EBITDA evolution</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Profit density row</div>
              {barRow(shortShown.map((p) => p.profit), maxProfit, toneGlow)}
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
                <div>start</div>
                <div>latest</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">EBITDA density row</div>
              {barRow(shortShown.map((p) => p.ebitda), maxEbitda, healthGlow)}
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
                <div>start</div>
                <div>latest</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Revenue histogram + change corridors</div>

          <div className="mt-4">
            {barRow(shortShown.map((p) => p.revenue), maxRevenue, healthBarGlow)}
          </div>

          <div className="mt-4 text-[13px] leading-[1.8] text-white/80">
            Industry PE (5y avg, contextual): <span className="text-white/92 font-semibold">{finance.fiveYearPeAvg.toFixed(1)}x</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Short evolution (≈3-month slice)</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-white/85">
                <span>Revenue: {changeShort.revenue >= 0 ? "+" : ""}{changeShort.revenue.toFixed(1)}%</span>
                <span>EBITDA: {changeShort.ebitda >= 0 ? "+" : ""}{changeShort.ebitda.toFixed(1)}%</span>
              </div>
              <div className="mt-2 text-[13px] text-white/75">
                Profit: {changeShort.profit >= 0 ? "+" : ""}{changeShort.profit.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Mid evolution (≈6-month slice)</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-white/85">
                <span>Revenue: {changeMid.revenue >= 0 ? "+" : ""}{changeMid.revenue.toFixed(1)}%</span>
                <span>EBITDA: {changeMid.ebitda >= 0 ? "+" : ""}{changeMid.ebitda.toFixed(1)}%</span>
              </div>
              <div className="mt-2 text-[13px] text-white/75">
                Profit: {changeMid.profit >= 0 ? "+" : ""}{changeMid.profit.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Long evolution (≈9-month slice)</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-white/85">
                <span>Revenue: {changeLong.revenue >= 0 ? "+" : ""}{changeLong.revenue.toFixed(1)}%</span>
                <span>EBITDA: {changeLong.ebitda >= 0 ? "+" : ""}{changeLong.ebitda.toFixed(1)}%</span>
              </div>
              <div className="mt-2 text-[13px] text-white/75">
                Profit: {changeLong.profit >= 0 ? "+" : ""}{changeLong.profit.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/45">
        Educational corridors • not forecasts • bounded interpretation only
      </div>
    </div>
  );
}
