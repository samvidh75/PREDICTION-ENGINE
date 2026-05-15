import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useMasterInfographics } from "./MasterInfographicEngine";
import { CompanyUniverseCard } from "../companyUniverse/CompanyUniverseSectionFrame";
import { formatMarketCap } from "../companyUniverse/formatCompanyFinance";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function MarketCapPositioningRail(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { tempo, finance, toneGlow, toneEdgeGlow } = useMasterInfographics();

  const rail = useMemo(() => {
    // Deterministic bounds around the current market cap for “52-week” feel.
    // Keep ranges realistic and restrained.
    const m = Math.max(1, finance.marketCap);
    const seed01 = clamp(((finance.marketCap * 0.0000001) % 1) + 0.33, 0.08, 0.92);

    const low = m * (0.74 + seed01 * 0.06); // ~0.74..0.80
    const high = m * (1.18 + (1 - seed01) * 0.10); // ~1.18..1.28
    const current = m;

    const pos = clamp((current - low) / Math.max(1e-9, high - low), 0, 1);

    // Support zones (subtle, guides focus—not “overlap anxiety”).
    const zoneA = clamp(pos - (0.18 + seed01 * 0.05), 0.06, 0.45);
    const zoneB = clamp(pos + (0.03 + seed01 * 0.08), 0.45, 0.86);
    const zoneC = clamp(0.64 + (seed01 - 0.5) * 0.18, 0.35, 0.90);

    return {
      low,
      current,
      high,
      pos,
      zones: [zoneA, zoneB, zoneC],
    };
  }, [finance.marketCap]);

  const lowFmt = useMemo(() => formatMarketCap(rail.low), [rail.low]);
  const curFmt = useMemo(() => formatMarketCap(rail.current), [rail.current]);
  const highFmt = useMemo(() => formatMarketCap(rail.high), [rail.high]);

  const railPulseMs = prefersReducedMotion ? 0.001 : tempo.stepSec * 0.48;

  return (
    <CompanyUniverseCard className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">52-week positioning rail</div>
          <div className="mt-3 text-[22px] font-medium text-white/92">market cap pressure • accumulation regions</div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">contextual valuation rail</div>
      </div>

      <div className="mt-6">
        <div
          className="relative rounded-[20px] border border-white/10 bg-black/20 overflow-hidden"
          style={{
            boxShadow: `0 0 90px rgba(0,0,0,0.18), 0 0 60px ${toneGlow}`,
          }}
        >
          {/* Support zones */}
          <div className="absolute inset-0 pointer-events-none">
            {rail.zones.map((z, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${z * 100}%`,
                  width: 2,
                  background: idx === 1 ? toneEdgeGlow : "rgba(255,255,255,0.06)",
                  boxShadow: idx === 1 ? `0 0 60px ${toneEdgeGlow}` : "none",
                  opacity: idx === 1 ? 0.95 : 0.65,
                }}
              />
            ))}
          </div>

          {/* Rail line */}
          <div className="relative px-6 py-7">
            <div
              className="h-[2px] rounded-full"
              style={{
                background: `linear-gradient(90deg, rgba(0,255,210,0.10), rgba(255,255,255,0.08), rgba(217,140,122,0.10))`,
                opacity: 0.95,
              }}
            />

            {/* Nodes */}
            <div className="relative mt-0 h-[38px]">
              {/* Low */}
              <div
                className="absolute top-0 -translate-y-1/2 rounded-full"
                style={{
                  left: `0%`,
                  width: 10,
                  height: 10,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 0 30px rgba(255,255,255,0.06)",
                }}
              />
              {/* Current */}
              <motion.div
                className="absolute top-0 -translate-y-1/2 rounded-full"
                style={{
                  left: `${rail.pos * 100}%`,
                  width: 12,
                  height: 12,
                  background: toneGlow,
                  border: `1px solid rgba(255,255,255,0.12)`,
                  transform: "translateX(-50%)",
                  boxShadow: `0 0 55px ${toneEdgeGlow}`,
                }}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        opacity: [0.72, 1, 0.80],
                        scale: [0.98, 1.18, 1.02],
                      }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: railPulseMs, repeat: Infinity, ease: "easeInOut" }
                }
              />
              {/* High */}
              <div
                className="absolute top-0 -translate-y-1/2 rounded-full"
                style={{
                  left: `100%`,
                  width: 10,
                  height: 10,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 0 30px rgba(255,255,255,0.06)",
                }}
              />
            </div>

            {/* Labels */}
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">52-week low</div>
                <div className="mt-2 text-[12px] text-white/80 truncate" title={lowFmt.exact}>
                  {lowFmt.words}
                </div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">current</div>
                <div className="mt-2 text-[12px] text-white/92 truncate" title={curFmt.exact}>
                  {curFmt.words}
                </div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">52-week high</div>
                <div className="mt-2 text-[12px] text-white/80 truncate" title={highFmt.exact}>
                  {highFmt.words}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market cap exact + PE readout */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market cap (exact)</div>
            <div className="mt-2 text-[16px] font-semibold text-white/92">{curFmt.exact}</div>
            <div className="mt-2 text-[12px] leading-[1.6] text-white/70">
              Educational valuation rail • no certainty framing
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">PE (contextual)</div>
            <div className="mt-2 text-[16px] font-semibold text-white/92">{finance.peFormatted}</div>
            <div className="mt-2 text-[12px] leading-[1.6] text-white/70">
              Comparative valuation only • interpretive pacing
            </div>
          </div>
        </div>
      </div>
    </CompanyUniverseCard>
  );
}
