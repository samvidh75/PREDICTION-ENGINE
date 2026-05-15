import React, { useMemo } from "react";
import type { CompanyHealthState, LeaderProfile } from "../../types/CompanyUniverse";
import { CompanyUniverseCard, CompanyUniverseGrid, CompanyUniverseSectionHeader } from "./CompanyUniverseSectionFrame";

function toneForHealth(health: CompanyHealthState): { glow: string; descriptor: string } {
  switch (health) {
    case "STRUCTURALLY_HEALTHY":
      return { glow: "rgba(0,255,210,0.20)", descriptor: "resilience-forward" };
    case "STABLE_EXPANSION":
      return { glow: "rgba(255,200,90,0.18)", descriptor: "controlled confidence" };
    case "CONFIDENCE_IMPROVING":
      return { glow: "rgba(0,255,210,0.16)", descriptor: "execution clarity tightening" };
    case "LIQUIDITY_FRAGILE":
      return { glow: "rgba(209,107,165,0.10)", descriptor: "selectivity and longer confirmation cycles" };
    case "VOLATILITY_SENSITIVE":
      return { glow: "rgba(217,140,122,0.18)", descriptor: "volatility-conditioned governance" };
    case "STRUCTURALLY_WEAKENING":
    default:
      return { glow: "rgba(217,140,122,0.20)", descriptor: "guarded resilience-first learning posture" };
  }
}

function safeProfile(p?: LeaderProfile): LeaderProfile | null {
  if (!p) return null;
  return p;
}

export default function FounderLeadershipStoryEngine(props: {
  companyName: string;
  healthState: CompanyHealthState;
  founders: LeaderProfile[];
  leadership: LeaderProfile[];
}): JSX.Element {
  const { companyName, healthState, founders, leadership } = props;

  const tone = useMemo(() => toneForHealth(healthState), [healthState]);

  const f0 = safeProfile(founders[0]);
  const f1 = safeProfile(founders[1]);

  const l0 = safeProfile(leadership[0]);
  const l1 = safeProfile(leadership[1]);
  const l2 = safeProfile(leadership[2]);

  const narrative = useMemo(() => {
    const founding =
      f0 && f1
        ? `The founding voice signals ${tone.descriptor}: ${f0.philosophy} Then ${f1.philosophy} becomes the operational craft that shapes how strategy is narrated.`
        : f0
          ? `The founding voice signals ${tone.descriptor}: ${f0.philosophy}.`
          : `Founding narrative is model-derived: leadership philosophy shapes the documentary tone.`;

    const leadershipArc = (() => {
      const parts: string[] = [];
      if (l0) parts.push(`Mandate: ${l0.philosophy}`);
      if (l1) parts.push(`Capital: ${l1.philosophy}`);
      if (l2) parts.push(`Execution: ${l2.philosophy}`);
      if (parts.length === 0) return `Leadership arc is derived: operational cadence is interpreted in a calm, educational lens.`;
      return parts.join(" • ");
    })();

    return `${companyName} reads like a living institution: founding intent becomes execution rhythm. ${founding} Leadership arc stays respectful and bounded—interpreting philosophy and operating identity, not promising outcomes.\n\nLeadership synthesis: ${leadershipArc}`;
  }, [companyName, f0, f1, l0, l1, l2, tone.descriptor]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="FOUNDER & LEADERSHIP STORY ENGINE"
          title="Leadership as a living documentary"
          subtitle="Emotional intelligence storytelling layer: mission voice → execution rhythm. SEBI-safe: bounded educational interpretation; no guarantees."
        />

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${tone.glow}` }}
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Documentary narrative (educational lens)</div>
          <div className="mt-3 text-[16px] leading-[1.9] text-white/85 whitespace-pre-wrap">{narrative}</div>

          <div className="mt-6">
            <CompanyUniverseGrid columns="grid-cols-1">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {[f0, f1].filter(Boolean).map((p, idx) => {
                  const profile = p as LeaderProfile;
                  return (
                    <CompanyUniverseCard key={`${profile.id}_f_${idx}`} className="p-6">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Founder signal</div>
                      <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.2]">{profile.name}</div>
                      <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{profile.philosophy}</div>
                      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        No outcomes • bounded interpretation
                      </div>
                    </CompanyUniverseCard>
                  );
                })}

                {[l0, l1, l2].filter(Boolean).map((p, idx) => {
                  const profile = p as LeaderProfile;
                  return (
                    <CompanyUniverseCard key={`${profile.id}_l_${idx}`} className="p-6">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Leadership capsule</div>
                      <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.2]">{profile.name}</div>
                      <div className="mt-3 text-[14px] leading-[1.8] text-white/80">{profile.philosophy}</div>
                      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        SEBI-safe: educational only
                      </div>
                    </CompanyUniverseCard>
                  );
                })}
              </div>
            </CompanyUniverseGrid>
          </div>

          <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45">
            Emotional intelligence storytelling • calm pacing • no promotional framing
          </div>
        </div>
      </div>
    </section>
  );
}
