import React, { useMemo } from "react";
import type { CompanyHealthState, LeaderProfile } from "../../types/CompanyUniverse";
import { CompanyUniverseCard, CompanyUniverseSectionHeader, CompanyUniverseGrid } from "./CompanyUniverseSectionFrame";

function healthTone(health: CompanyHealthState): {
  missionTone: string;
  emphasis: string;
  caution: string;
} {
  switch (health) {
    case "STRUCTURALLY_HEALTHY":
      return {
        missionTone: "resilience-forward mission continuity",
        emphasis: "operational identity remains coherent across cycles",
        caution: "interpretation stays bounded (educational only)",
      };
    case "STABLE_EXPANSION":
      return {
        missionTone: "controlled confidence mission expansion",
        emphasis: "growth is read as paced execution, not attention spikes",
        caution: "avoid certainty language; keep probabilistic framing",
      };
    case "CONFIDENCE_IMPROVING":
      return {
        missionTone: "execution clarity mission tightening",
        emphasis: "capability discipline strengthens the narrative cadence",
        caution: "no outcomes promised; context-first mapping only",
      };
    case "MOMENTUM_WEAKENING":
      return {
        missionTone: "selectivity mission adaptation",
        emphasis: "confirmation cycles lengthen; operational soul remains intact",
        caution: "interpretation becomes more guarded without fear framing",
      };
    case "VOLATILITY_SENSITIVE":
      return {
        missionTone: "volatility-conditioned mission governance",
        emphasis: "risk margins tighten; governance becomes the stabilizer",
        caution: "avoid panic language; keep learning tone",
      };
    case "STRUCTURALLY_FRAGILE":
    default:
      return {
        missionTone: "resilience-first mission guardrails",
        emphasis: "interpretation prioritises governance and repeatability signals",
        caution: "stay educational and avoid certainty claims",
      };
  }
}

function compactLeadText(profile: LeaderProfile): string {
  const r = `${profile.name} — ${profile.role}`;
  const p = profile.philosophy.trim();
  const n = profile.narrativeProfile.trim();
  return `${r}\n${p}\n${n}`;
}

function pickCoreMission(args: {
  health: CompanyHealthState;
  narrativeBody: string;
  strategicSummary: string;
  founders: LeaderProfile[];
  leadership: LeaderProfile[];
}): string {
  const { health, narrativeBody, strategicSummary, founders, leadership } = args;
  const tone = healthTone(health);

  const f0 = founders[0];
  const l0 = leadership[0];

  return [
    `Core mission (documentary framing): ${tone.missionTone}.`,
    `Interpretation intent: ${tone.emphasis}.`,
    `Synthesis from leadership voice:\n- Founder signal: ${f0 ? f0.philosophy : "systems-first architecture"}\n- Leadership signal: ${l0 ? l0.philosophy : "capital + execution discipline"}`,
    `Narrative anchors:\n- Editorial narrative: ${narrativeBody.slice(0, 130)}…\n- Strategic summary: ${strategicSummary}`,
    `SEBI-safe note: ${tone.caution}.`,
  ].join("\n");
}

export default function CompanyDNAAndMissionEngine(props: {
  companyName: string;
  healthState: CompanyHealthState;
  narrativeBody: string;
  strategicSummary: string;
  founders: LeaderProfile[];
  leadership: LeaderProfile[];
}): JSX.Element {
  const { companyName, healthState, narrativeBody, strategicSummary, founders, leadership } = props;

  const tone = useMemo(() => healthTone(healthState), [healthState]);

  const coreMission = useMemo(
    () =>
      pickCoreMission({
        health: healthState,
        narrativeBody,
        strategicSummary,
        founders,
        leadership,
      }),
    [healthState, narrativeBody, strategicSummary, founders, leadership],
  );

  const dnaCards = useMemo(() => {
    const f0 = founders[0];
    const l1 = leadership[1] ?? leadership[0];
    const f1 = founders[1] ?? founders[0];

    const operationalIdentity = `Operational identity: leadership voice suggests ${tone.missionTone}, with an emphasis on ${tone.emphasis}.`;

    const innovationDirection = `Innovation direction: ${f1 ? f1.philosophy : "execution cadence adaptation"} — interpreted as capability building under the current confidence atmosphere.`;

    const longTermVision = `Long-term vision: ${l1 ? l1.philosophy : "resilience-first execution"} — educational framing prioritises repeatability signals over certainty outcomes.`;

    const culturalPositioning = `Cultural positioning: the narrative tends to become more ${healthState === "VOLATILITY_SENSITIVE" || healthState === "STRUCTURALLY_FRAGILE" ? "governance-aware and guarded" : "continuity-first"} when risk margins tighten.`;

    return [
      { title: "Company DNA (mission)", body: coreMission },
      { title: "Operational identity", body: operationalIdentity },
      { title: "Innovation direction", body: innovationDirection },
      { title: "Long-term vision", body: longTermVision },
      { title: "Cultural positioning", body: culturalPositioning },
    ];
  }, [coreMission, founders, leadership, healthState, tone.missionTone, tone.emphasis]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="COMPANY DNA & MISSION ENGINE"
          title="What the company fundamentally represents"
          subtitle="Human and strategic, documentary-style. Leadership philosophy becomes a calm mission frame—no promotional tone, no certainty claims."
        />

        <CompanyUniverseGrid columns="grid-cols-1">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {dnaCards.map((c) => (
              <CompanyUniverseCard key={c.title} className="p-6">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">{c.title}</div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/80 whitespace-pre-wrap">{c.body}</div>
                <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Educational corporate intelligence only • no trade advice
                </div>
              </CompanyUniverseCard>
            ))}
          </div>
        </CompanyUniverseGrid>
      </div>
    </section>
  );
}
