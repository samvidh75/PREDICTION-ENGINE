import React, { useMemo } from "react";
import type { TimelineMilestone } from "../../types/CompanyUniverse";
import { CompanyUniverseSectionHeader, CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

export default function CompanyFoundingTimeline({
  milestones,
}: {
  milestones: TimelineMilestone[];
}): JSX.Element {
  const safe = useMemo(() => milestones.slice(0, 8), [milestones]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="FOUNDER STORY TIMELINE"
          title="Interactive company biography"
          subtitle="Vertical documentary rails with linked milestones—editorial structure, not data clutter."
        />

        <div className="relative">
          {/* Rail */}
          <div
            className="absolute left-[24px] top-0 bottom-0 w-[2px]"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div className="space-y-6">
            {safe.map((m, idx) => (
              <div key={m.id} className="relative pl-12">
                <div
                  className="absolute left-[18px] top-[6px] h-[12px] w-[12px] rounded-full"
                  style={{
                    background: idx % 2 === 0 ? "rgba(0,255,210,0.20)" : "rgba(0,120,255,0.18)",
                    boxShadow: idx % 2 === 0 ? "0 0 18px rgba(0,255,210,0.18)" : "0 0 18px rgba(0,120,255,0.16)",
                  }}
                />

                <CompanyUniverseCard className="p-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">{m.yearLabel}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Chapter {idx + 1}
                    </div>
                  </div>

                  <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.3]">
                    {m.title}
                  </div>

                  <div className="mt-3 text-[14px] leading-[1.8] text-white/80">
                    {m.body}
                  </div>

                  {/* laser link line */}
                  <div
                    className="mt-4 h-[1px]"
                    style={{
                      background: idx % 2 === 0 ? "rgba(0,255,210,0.14)" : "rgba(0,120,255,0.12)",
                      opacity: 0.9,
                    }}
                  />
                </CompanyUniverseCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
