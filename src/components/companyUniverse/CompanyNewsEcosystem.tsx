import React, { useMemo } from "react";
import type { CompanyNewsItem, CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import { CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

function labelForKind(kind: CompanyNewsItem["kind"]): string {
  switch (kind) {
    case "EARNINGS":
      return "Earnings";
    case "ACQUISITION":
      return "Acquisitions";
    case "LEADERSHIP":
      return "Leadership";
    case "PARTNERSHIP":
      return "Partnerships";
    case "REGULATORY":
      return "Regulatory";
    case "PRODUCT":
      return "Product";
    case "INSTITUTIONAL":
      return "Institutional";
    default:
      return "News";
  }
}

function glowForConfidence(conf: ConfidenceState, theme: ConfidenceTheme): string {
  if (conf === "ELEVATED_RISK") return theme.warningGlow;
  if (conf === "MOMENTUM_WEAKENING") return theme.magentaGlow;
  if (conf === "CONFIDENCE_RISING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

function glowForHealth(health: CompanyHealthState, theme: ConfidenceTheme): string {
  if (health === "LIQUIDITY_FRAGILE" || health === "STRUCTURALLY_WEAKENING") return theme.warningGlow;
  if (health === "VOLATILITY_SENSITIVE") return theme.magentaGlow;
  if (health === "STABLE_EXPANSION" || health === "CONFIDENCE_IMPROVING") return theme.cyanGlow;
  return theme.deepBlueGlow;
}

export default function CompanyNewsEcosystem({
  news,
  companyHealthState,
  confidenceState,
  theme,
  beginner = false,
}: {
  news: CompanyNewsItem[];
  companyHealthState: CompanyHealthState;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
}): JSX.Element {
  const glow = useMemo(() => glowForConfidence(confidenceState, theme), [confidenceState, theme]);
  const healthGlow = useMemo(() => glowForHealth(companyHealthState, theme), [companyHealthState, theme]);

  const shown = useMemo(() => news.slice(0, beginner ? 3 : 5), [news, beginner]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Company News Intelligence</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Editorial developments (company-specific)</div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80 max-w-[86ch]">
              This feed isolates company-level updates. Broader market intelligence belongs to the dashboard ecosystem.
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            calm • educational • SEBI-safe • no execution framing
          </div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: `0 0 90px ${glow}, 0 0 120px ${healthGlow}` }}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {shown.map((n, idx) => (
              <CompanyUniverseCard key={n.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {labelForKind(n.kind)} • {n.recencyLabel}
                    </div>
                    <div className="mt-3 text-[16px] font-semibold leading-[1.4] text-white/92">{n.title}</div>
                  </div>

                  <div
                    className="h-[10px] w-[10px] rounded-full shrink-0 mt-2"
                    style={{
                      background: glow,
                      boxShadow: `0 0 22px ${glow}`,
                      opacity: 0.95,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{n.body}</div>

                <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Educational context only • no certainty • no recommendations
                </div>

                {idx < shown.length - 1 && (
                  <div className="mt-5 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
                )}
              </CompanyUniverseCard>
            ))}
          </div>

          {beginner && (
            <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
              Beginner mode reduces density • more company context appears at higher learning levels
            </div>
          )}
        </div>

        <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
          SEBI-safe: educational probabilistic framing only • no trade execution
        </div>
      </div>
    </section>
  );
}
