import React, { useMemo } from "react";
import type { CompanyHealthState, HealthTheme } from "../../types/CompanyUniverse";
import { CompanyUniverseSectionHeader, CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

export default function FutureProbabilityNarrativeSystem(props: {
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;
  capsules: { id: string; body: string }[];
  companyName: string;
}): JSX.Element {
  const { healthState, healthTheme, capsules, companyName } = props;

  const tone = useMemo(() => {
    switch (healthState) {
      case "STRUCTURALLY_HEALTHY":
        return "continuity-first future probability";
      case "STABLE_EXPANSION":
        return "responsible expansion pathway";
      case "CONFIDENCE_IMPROVING":
        return "execution clarity improvement lens";
      case "LIQUIDITY_FRAGILE":
        return "selectivity with longer confirmation cycles";
      case "VOLATILITY_SENSITIVE":
        return "volatility-conditioned interpretive margins";
      case "STRUCTURALLY_WEAKENING":
      default:
        return "guarded resilience-first learning posture";
    }
  }, [healthState]);

  const glow = useMemo(() => {
    switch (healthState) {
      case "STRUCTURALLY_HEALTHY":
      case "CONFIDENCE_IMPROVING":
        return healthTheme.glowCyan;
      case "STABLE_EXPANSION":
        return healthTheme.glowslate;
      case "LIQUIDITY_FRAGILE":
        return healthTheme.glowDeep;
      case "VOLATILITY_SENSITIVE":
        return healthTheme.glowWarning;
      case "STRUCTURALLY_WEAKENING":
      default:
        return healthTheme.glowWarning;
    }
  }, [healthState, healthTheme]);

  const shown = useMemo(() => capsules.slice(0, 3), [capsules]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="FUTURE PROBABILITY NARRATIVE SYSTEM"
          title="Future business environments (scenario tone)"
          subtitle="Documentary-style scenario capsules: they refine interpretation tone and sensitivity."
        />

        <div
          className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
          style={{
            boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${glow}`,
          }}
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">
            Company: {companyName} • Mode: {tone}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {shown.map((c, idx) => (
              <CompanyUniverseCard key={c.id} className="p-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  Probability capsule {idx + 1}
                </div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{c.body}</div>

                <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Scenario learning notes
                </div>
              </CompanyUniverseCard>
            ))}
          </div>

          <div className="mt-6 text-[14px] leading-[1.9] text-white/85">
            This layer keeps interpretation disciplined and calm. It shapes how future environments can feel in your narrative tone.
          </div>
        </div>
      </div>
    </section>
  );
}
