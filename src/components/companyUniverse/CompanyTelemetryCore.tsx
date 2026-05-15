import React, { useMemo } from "react";
import useCompanyLiveTelemetry, { type CompanyTelemetrySnapshot } from "./useCompanyLiveTelemetry";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function signFmt(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const v = pct;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function toneForMove(pct: number, theme: ConfidenceTheme): { glow: string; fg: string } {
  if (pct > 0.01) return { glow: theme.cyanGlow, fg: "rgba(0,255,210,0.95)" };
  if (pct < -0.01) return { glow: theme.magentaGlow, fg: "rgba(209,107,165,0.95)" };
  return { glow: theme.deepBlueGlow, fg: "rgba(200,215,255,0.85)" };
}

function pctBarStyle(value01: number, glow: string): React.CSSProperties {
  const v = clamp(value01, 0, 1);
  return {
    width: `${v * 100}%`,
    background: glow,
    boxShadow: `0 0 ${Math.round(40 + v * 60)}px ${glow}`,
    transition: "width 650ms ease",
  };
}

export default function CompanyTelemetryCore({
  ticker,
  companyHealthState,
  confidenceState,
  theme,
  enabled = true,
  isMobile = false,
  externalSnapshot = null,
}: {
  ticker: string;
  companyHealthState: CompanyHealthState;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  enabled?: boolean;
  isMobile?: boolean;
  externalSnapshot?: CompanyTelemetrySnapshot | null;
}): JSX.Element {
  const localSnap = useCompanyLiveTelemetry({
    ticker,
    companyHealthState,
    confidenceState,
    enabled: enabled && !externalSnapshot,
    tickMs: 1000,
  });

  const snap = externalSnapshot ?? localSnap;

  const moveTone = useMemo(() => toneForMove(snap.dailyChangePct, theme), [snap.dailyChangePct, theme]);

  const depthBidGlow = theme.cyanGlow;
  const depthAskGlow = theme.magentaGlow;

  const containerBoxShadow = useMemo(() => {
    const vol = snap.volatilityEnvironment;
    return `0 0 90px ${snap.dailyChangePct >= 0 ? theme.cyanGlow : theme.magentaGlow}, 0 0 ${Math.round(50 + vol * 80)}px rgba(0,0,0,0)`;
  }, [snap.dailyChangePct, snap.volatilityEnvironment, theme]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Live Market Telemetry Core</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Real-time behaviour, cinematic context</div>
            <div className="mt-2 text-[14px] leading-[1.9] text-white/75">
              {ticker.toUpperCase().trim()} • telemetry updates are educational and synthetic-safe
            </div>
          </div>

          <div
            className="rounded-full border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px] shrink-0"
            style={{
              boxShadow: `0 0 22px ${moveTone.glow}`,
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Daily movement</div>
            <div className="mt-2 text-[16px] font-semibold" style={{ color: moveTone.fg }}>
              {signFmt(snap.dailyChangePct)}
            </div>
          </div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: containerBoxShadow }}
        >
          <div className={isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 lg:grid-cols-12 gap-6"}>
            <div className={isMobile ? "" : "lg:col-span-4"}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Live price (synthetic)</div>
              <div className="mt-3 text-[34px] font-semibold leading-[1.05] text-white/92">
                {snap.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="mt-3 text-[13px] leading-[1.8] text-white/80">
                Volume participation:{" "}
                <span className="text-white/92 font-semibold">{Math.round(snap.liquidityParticipation * 100)}%</span> •
                Volatility posture:{" "}
                <span className="text-white/92 font-semibold">{Math.round(snap.volatilityEnvironment * 100)}%</span>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Volume (synthetic)</div>
                <div className="mt-2 text-[18px] font-semibold text-white/92">
                  {snap.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-2 text-[12px] leading-[1.6] text-white/65">
                  Liquidity affects how quickly context translates into confidence behaviour.
                </div>
              </div>
            </div>

            <div className={isMobile ? "" : "lg:col-span-8"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Bid depth indicator</div>
                  <div className="mt-3 h-[10px] rounded-full bg-white/5 overflow-hidden">
                    <div style={pctBarStyle(snap.bidDepth, depthBidGlow)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-[12px] text-white/80">Bid</div>
                    <div className="text-[12px] text-white/92 font-semibold">{Math.round(snap.bidDepth * 100)}%</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Ask depth indicator</div>
                  <div className="mt-3 h-[10px] rounded-full bg-white/5 overflow-hidden">
                    <div style={pctBarStyle(snap.askDepth, depthAskGlow)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-[12px] text-white/80">Ask</div>
                    <div className="text-[12px] text-white/92 font-semibold">{Math.round(snap.askDepth * 100)}%</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Liquidity participation</div>
                  <div className="mt-3 text-[14px] leading-[1.8] text-white/85">
                    {snap.liquidityParticipation >= 0.62
                      ? "Depth is supportive for calmer interpretive pacing."
                      : snap.liquidityParticipation >= 0.48
                        ? "Liquidity is moderate—interpretation can remain steady but needs context."
                        : "Liquidity is thin—interpretation becomes more sensitive to timing texture."}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Volatility environment</div>
                  <div className="mt-3 text-[14px] leading-[1.8] text-white/85">
                    {snap.volatilityEnvironment >= 0.72
                      ? "Volatility posture is elevated—confidence margin tightens into educational caution."
                      : snap.volatilityEnvironment >= 0.55
                        ? "Volatility posture is mixed—pacing stays measurable and calm."
                        : "Volatility posture is restrained—interpretation stays continuity-first."}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/45">
                market depth • liquidity participation • volatility environment (educational)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
