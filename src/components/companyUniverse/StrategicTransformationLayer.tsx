import React, { useMemo } from "react";
import type { CompanyHealthState, FinancialTelemetryPoint } from "../../types/CompanyUniverse";
import { CompanyUniverseSectionHeader, CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function firstLast(points: FinancialTelemetryPoint[]): { first: FinancialTelemetryPoint; last: FinancialTelemetryPoint } {
  const first = points[0] ?? { id: "empty_0", label: "—", revenue: 0, ebitda: 0, profit: 0, freeCashFlow: 0, debtRatio: 0 };
  const last = points[points.length - 1] ?? first;
  return { first, last };
}

function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return (to - from) / Math.abs(from);
}

function marginRatio(revenue: number, profit: number): number {
  if (revenue <= 0) return 0;
  return profit / revenue;
}

type TransformationFacet = {
  title: string;
  body: string;
};

function healthTone(health: CompanyHealthState): string {
  switch (health) {
    case "STRUCTURALLY_HEALTHY":
      return "resilience-forward";
    case "STABLE_EXPANSION":
      return "controlled confidence";
    case "CONFIDENCE_IMPROVING":
      return "execution clarity tightening";
    case "MOMENTUM_WEAKENING":
      return "selectivity and longer confirmation cycles";
    case "VOLATILITY_SENSITIVE":
      return "volatility-conditioned sensitivity";
    case "STRUCTURALLY_FRAGILE":
    default:
      return "guarded resilience-first mapping";
  }
}

export default function StrategicTransformationLayer(props: {
  ticker: string;
  healthState: CompanyHealthState;
  strategicSummary: string;
  financialTelemetry: FinancialTelemetryPoint[];
}): JSX.Element {
  const { ticker, healthState, strategicSummary, financialTelemetry } = props;

  const facets = useMemo<TransformationFacet[]>(() => {
    const points = financialTelemetry.slice(0, 10);
    const { first, last } = firstLast(points);

    const revenueGrowth = pctChange(first.revenue, last.revenue);
    const profitGrowth = pctChange(first.profit, last.profit);
    const debtTrend = pctChange(first.debtRatio, last.debtRatio);

    const startMargin = marginRatio(first.revenue, first.profit);
    const endMargin = marginRatio(last.revenue, last.profit);
    const marginDelta = endMargin - startMargin;

    const fcfTrend = pctChange(first.freeCashFlow, last.freeCashFlow);

    const tone = healthTone(healthState);

    const digitalAI = (() => {
      const marginUp = marginDelta >= 0.015;
      const fcfUp = fcfTrend >= 0.06;
      if (marginUp && fcfUp) {
        return {
          title: "Operational digital/AI transformation (educational lens)",
          body: `When profitability quality improves alongside steadier free cash flow, transformation reads as capability-building: process discipline strengthens execution pacing, and interpretation stays grounded in operational texture (tone: ${tone}).`,
        };
      }
      if (marginUp) {
        return {
          title: "Transformation via efficiency improvements",
          body: `Profit margin expansion suggests execution efficiency has improved. In this lens, the business looks more process-tuned—less driven by attention spikes, more driven by durable operating rhythm (tone: ${tone}).`,
        };
      }
      return {
        title: "Transformation via resilience + governance cadence",
        body: `When margin change is modest but the narrative remains interpretable, transformation leans toward governance and resilience-first cadence: systems are being stabilised before broader momentum can broaden again (tone: ${tone}).`,
      };
    })();

    const expansion = (() => {
      const growthStrong = revenueGrowth >= 0.18;
      const growthMod = revenueGrowth >= 0.08;
      if (growthStrong) {
        return {
          title: "Expansion pathway (capacity + execution cadence)",
          body: `Revenue movement suggests an expansion pathway that is paced—not forced. The strategy is treated as execution discipline: growth is interpreted as capacity shaping under the current confidence atmosphere (tone: ${tone}).`,
        };
      }
      if (growthMod) {
        return {
          title: "Measured operational expansion",
          body: `Growth is present but controlled. In this framework, transformation reads as measured scaling: the business expands carefully while maintaining clarity in the execution narrative (tone: ${tone}).`,
        };
      }
      return {
        title: "Selective growth posture",
        body: `When revenue growth is softer, transformation reads as selective participation: capability focus narrows while confirmation cycles lengthen, keeping interpretation calm and bounded (tone: ${tone}).`,
      };
    })();

    const marginEvolution = (() => {
      const marginUp = marginDelta >= 0.01;
      const marginDown = marginDelta <= -0.01;
      if (marginUp) {
        return {
          title: "Margin evolution (quality lens, not outcome promise)",
          body: `Margin quality improves, which in this documentary engine signals stronger execution efficiency. We keep this educational: margin change alters interpretive texture without guaranteeing future outcomes.`,
        };
      }
      if (marginDown) {
        return {
          title: "Margin evolution (pressure lens, bounded)",
          body: `Margin quality is under mild pressure. In the transformation lens, that typically increases interpretive sensitivity to execution cadence and governance stability—without inflating certainty.`,
        };
      }
      return {
        title: "Margin evolution (stability lens)",
        body: `Margin quality remains relatively stable. The transformation lens interprets this as disciplined continuity: operational signals remain readable even as participation conditions evolve.`,
      };
    })();

    const businessModel = (() => {
      const debtImproving = debtTrend <= -0.03;
      const debtRising = debtTrend >= 0.03;

      const fcfStable = Math.abs(fcfTrend) <= 0.06;

      if (debtImproving && !debtRising) {
        return {
          title: "Business model shift (capital discipline + resilience-first strategy)",
          body: `Debt ratio drift suggests capital discipline. In this lens, transformation is framed as a more resilient business model: execution prioritises structured stability and cash-flow integrity (tone: ${tone}).`,
        };
      }

      if (debtRising) {
        return {
          title: "Business model shift (constraint-aware adaptation)",
          body: `Rising debt ratio changes the constraint environment. Transformation reads as adaptation under financing intensity: interpretation becomes more governance-aware and less certainty-driven (tone: ${tone}).`,
        };
      }

      if (fcfStable) {
        return {
          title: "Business model shift (continuity-first operating rhythm)",
          body: `Free cash flow remains relatively steady. That typically indicates continuity in operating rhythm—transformation is treated as refinement rather than reinvention, keeping the documentary lens calm.`,
        };
      }

      return {
        title: "Business model shift (bounded reconfiguration)",
        body: `When cash-flow and profitability movement vary, the transformation lens treats it as bounded reconfiguration: operational levers are being tuned without projecting outcomes.`,
      };
    })();

    return [digitalAI, expansion, marginEvolution, businessModel];
  }, [financialTelemetry, healthState]);

  return (
    <section className="relative z-[12] px-6 sm:px-[72px] pb-14">
      <div className="mx-auto max-w-[1680px]">
        <CompanyUniverseSectionHeader
          kicker="STRATEGIC TRANSFORMATION LAYER"
          title="How the company reinvents (calm, documentary intelligence)"
          subtitle="Educational transformation mapping: digital capability cues, margin evolution texture, capital discipline framing, and execution cadence—no hype, no guarantees."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {facets.map((f) => (
            <CompanyUniverseCard key={f.title} className="p-6">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">Transformation facet</div>
              <div className="mt-2 text-[20px] font-semibold text-white/92 leading-[1.2]">{f.title}</div>
              <div className="mt-3 text-[14px] leading-[1.9] text-white/80">{f.body}</div>
            </CompanyUniverseCard>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Strategic transformation summary</div>
          <div className="mt-3 text-[15px] leading-[1.9] text-white/85 max-w-[980px]">
            {strategicSummary} This layer is educational only—interpretive framing, not investment advice.
          </div>

          <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
            Company: {ticker} • educational corporate intelligence • no certainty claims
          </div>
        </div>
      </div>
    </section>
  );
}
