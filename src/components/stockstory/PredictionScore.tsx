import type { EngineOutput } from "../../prediction-engine/UnifiedPredictionEngine";

export function ScoreRing({ score, size = 106 }: { score: number | null; size?: number }) {
  const value = score ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90"><circle cx="50" cy="50" r={radius} fill="none" stroke="#e8ebe7" strokeWidth="8"/><circle cx="50" cy="50" r={radius} fill="none" stroke="#168345" strokeLinecap="round" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} /></svg>
      <div className="absolute inset-0 grid place-content-center text-center"><div className="tabular text-[27px] font-extrabold leading-none">{score ?? "—"}</div><div className="mt-1 text-[9px] text-[#777]">/100</div><div className="text-[9px] font-semibold text-[#168345]">{score === null ? "No data" : score >= 80 ? "Excellent" : score >= 65 ? "Healthy" : score >= 50 ? "Stable" : "Watch"}</div></div>
    </div>
  );
}

export function FactorBars({ prediction }: { prediction: EngineOutput | null }) {
  const factors = prediction?.factorScores;
  const rows = [
    ["Quality", factors?.quality.score], ["Growth", factors?.growth.score], ["Valuation", factors?.valuation.score], ["Risk", factors?.stability.score], ["Momentum", factors?.momentum.score],
  ] as const;
  return <div className="min-w-0 flex-1 space-y-2.5">{rows.map(([label, score]) => <div key={label} className="grid grid-cols-[72px_1fr_24px] items-center gap-2 text-[10px]"><span>{label}</span><span className="h-1 rounded-full bg-[#e8ebe7]"><span className="block h-1 rounded-full bg-[#168345]" style={{ width: `${score ?? 0}%` }}/></span><span className="tabular text-right font-semibold text-[#168345]">{score ?? "—"}</span></div>)}</div>;
}
