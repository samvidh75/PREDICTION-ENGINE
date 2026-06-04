import React, { useMemo } from "react";
import type { FinancialTelemetryPoint, CompanyHealthState, HealthTheme } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import { CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function glowForHealth(healthState: CompanyHealthState, theme: HealthTheme): string {
  switch (healthState) {
    case "STRUCTURALLY_HEALTHY":
    case "STABLE_EXPANSION":
    case "CONFIDENCE_IMPROVING":
      return theme.glowCyan;
    case "LIQUIDITY_FRAGILE":
    case "STRUCTURALLY_WEAKENING":
      return theme.glowAmber;
    case "VOLATILITY_SENSITIVE":
    default:
      return theme.glowWarning;
  }
}

function formatDebtRatio(d: number): string {
  if (!Number.isFinite(d)) return "—";
  return `${(d * 100).toFixed(1)}%`;
}

export default function CompanyDebtRatioCorridor({
  points,
  healthState,
  healthTheme,
  beginner = false,
}: {
  points: FinancialTelemetryPoint[];
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  beginner?: boolean;
}): JSX.Element {
  const shown = useMemo(() => (beginner ? points.slice(0, 4) : points), [points, beginner]);

  const glow = useMemo(() => glowForHealth(healthState, healthTheme), [healthState, healthTheme]);

  const { min, max } = useMemo(() => {
    const values = shown.map((p) => p.debtRatio).filter((v) => Number.isFinite(v));
    if (values.length === 0) return { min: 0.1, max: 0.6 };
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    return { min: minV, max: Math.max(minV + 1e-6, maxV) };
  }, [shown]);

  return (
    <CompanyUniverseCard className="p-5">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Debt ratio corridor (balance lens)</div>

      <div className="mt-3 text-[14px] leading-[1.7] text-white/80">
        Educational framing only • keeps interpretation bounded to leverage texture (not outcomes).
      </div>

      <div className="mt-4">
        <div className="flex items-end gap-2">
          {shown.map((p, idx) => {
            const v = p.debtRatio;
            const t = (v - min) / Math.max(1e-6, max - min);
            const h = 22 + clamp(t, 0, 1) * 56;

            const active = idx === shown.length - 1;
            return (
              <div key={p.id} className="flex-1 min-w-0">
                <div
                  className="w-full rounded-[14px] border border-white/10 bg-black/20"
                  style={{
                    height: h,
                    boxShadow: active ? `0 0 60px ${glow}` : "none",
                  }}
                >
                  <div
                    className="h-full w-full rounded-[14px] rounded-t-[14px]"
                    style={{
                      background: active ? glow : "rgba(255,255,255,0.04)",
                      opacity: active ? 0.22 : 0.12,
                    }}
                  />
                </div>

                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/45 text-center">
                  {p.label.slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
        <span>low {formatDebtRatio(min)}</span>
        <span>high {formatDebtRatio(max)}</span>
      </div>
    </CompanyUniverseCard>
  );
}
