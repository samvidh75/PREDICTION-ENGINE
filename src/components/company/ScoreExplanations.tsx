// src/components/company/ScoreExplanations.tsx
import React from "react";

interface FactorsData {
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  sectorStrengthFactor: number;
  factorScore: number;
}

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

export default function ScoreExplanations({
  ticker,
  factors,
  beginner
}: {
  ticker: string;
  factors: FactorsData | null | undefined;
  beginner: boolean;
}): JSX.Element {
  if (!factors) {
    return <div className="text-white/60 text-xs italic">Loading explanations...</div>;
  }

  const components = [
    {
      label: "Business Quality",
      score: clampScore(factors.qualityFactor),
      explanation: "Market position, profitability, and operating consistency.",
    },
    {
      label: "Financial Strength",
      score: clampScore(factors.riskFactor),
      explanation: "Balance sheet resilience, debt levels, and earnings stability.",
    },
    {
      label: "Growth",
      score: clampScore(factors.growthFactor),
      explanation: "Recent revenue and earnings progress relative to the company base.",
    },
    {
      label: "Valuation",
      score: clampScore(factors.valueFactor),
      explanation: "Current multiples compared with earnings quality and historical ranges.",
    },
    {
      label: "Ownership & Market Behaviour",
      score: clampScore((factors.momentumFactor + factors.sectorStrengthFactor) / 2),
      explanation: "Price momentum, sector participation, and institutional interest.",
    },
  ];

  const overallScore = clampScore(factors.factorScore);
  const watchText = beginner
    ? "Watch quarterly earnings, debt levels, and whether ownership trends continue."
    : "Monitor margins, cash generation, valuation multiples, and FII/DII ownership changes.";

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-5 shadow-inner">
      <div className="border-b border-white/10 pb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-mono">
          StockStory Intelligence Score
        </span>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-3xl font-bold text-white font-mono">{overallScore}</span>
          <span className="pb-1 text-xs text-white/50">/100, equally weighted across five areas.</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/65 font-vos-reading">
          {ticker} is scored to explain business quality, financial strength, growth, valuation,
          and ownership behaviour. The score is a research aid, not a Research Signal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {components.map((component) => (
          <div key={component.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-white/55 font-mono">
                {component.label}
              </span>
              <span className="text-sm font-bold text-cyan-300 font-mono">
                {component.score}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/70 font-vos-reading">
              {component.explanation}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="font-bold text-emerald-400 font-mono block">What helped?</span>
          <p className="mt-1 text-white/80 leading-relaxed font-vos-reading">
            Higher quality, growth, or ownership scores indicate areas where recent evidence has improved.
          </p>
        </div>
        <div>
          <span className="font-bold text-rose-400 font-mono block">What reduced it?</span>
          <p className="mt-1 text-white/80 leading-relaxed font-vos-reading">
            Lower valuation or financial strength scores may indicate richer pricing, debt pressure, or weaker stability.
          </p>
        </div>
        <div>
          <span className="font-bold text-slate-300 font-mono block">What should investors watch?</span>
          <p className="mt-1 text-white/80 leading-relaxed font-vos-reading">{watchText}</p>
        </div>
      </div>
    </div>
  );
}
