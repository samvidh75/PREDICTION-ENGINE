import React, { useMemo } from "react";
import type { LeaderProfile } from "../../types/CompanyUniverse";
import { CompanyUniverseSectionHeader, CompanyUniverseCard, CompanyUniverseGrid } from "./CompanyUniverseSectionFrame";

function portraitGlow(stateIndex: number): { border: string; glow: string } {
  const palette = [
    { border: "rgba(0,255,210,0.20)", glow: "rgba(0,255,210,0.20)" },
    { border: "rgba(0,120,255,0.18)", glow: "rgba(0,120,255,0.16)" },
    { border: "rgba(255,185,90,0.14)", glow: "rgba(255,185,90,0.14)" },
    { border: "rgba(217,140,122,0.16)", glow: "rgba(217,140,122,0.14)" },
  ];
  return palette[stateIndex % palette.length];
}

function LeaderPortrait({
  profile,
  index,
}: {
  profile: LeaderProfile;
  index: number;
}): JSX.Element {
  const glow = portraitGlow(index);

  return (
    <CompanyUniverseCard className="p-6">
      <div className="flex items-start gap-4">
        <div
          className="relative h-[56px] w-[56px] rounded-full border border-white/10 bg-black/20 flex items-center justify-center"
          style={{
            boxShadow: `0 0 36px ${glow.glow}`,
            borderColor: glow.border,
          }}
          aria-hidden="true"
        >
          <div className="h-[18px] w-[18px] rounded-full bg-white/30" style={{ boxShadow: `0 0 18px ${glow.glow}` }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/55 truncate">{profile.role}</div>
          <div className="mt-2 text-[18px] font-semibold text-white/92 leading-[1.2]">{profile.name}</div>
        </div>
      </div>

      <div className="mt-4 text-[14px] leading-[1.8] text-white/80">
        <span className="text-white/90">{profile.narrativeProfile}</span>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Operational philosophy</div>
        <div className="mt-2 text-[13px] leading-[1.7] text-white/82">{profile.philosophy}</div>
      </div>

      <div className="mt-4 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">Institutional respectful capsule</div>
    </CompanyUniverseCard>
  );
}

export default function CompanyLeadershipLayer({
  founders,
  leadership,
}: {
  founders: LeaderProfile[];
  leadership: LeaderProfile[];
}): JSX.Element {
  const all = useMemo(() => [...founders, ...leadership], [founders, leadership]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="LEADERSHIP INTELLIGENCE"
          title="Institutional direction, narrative-led"
          subtitle="Minimal portrait capsules with strategic impact summaries—respectful and editorial, not celebrity-focused."
        />

        <CompanyUniverseGrid columns="grid-cols-1">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {all.map((p, idx) => (
              <LeaderPortrait key={p.id} profile={p} index={idx} />
            ))}
          </div>
        </CompanyUniverseGrid>
      </div>
    </section>
  );
}
