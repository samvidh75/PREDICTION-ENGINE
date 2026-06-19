import React, { useEffect, useState } from "react";

interface Driver {
  factor: string;
  previous: number;
  current: number;
  delta: number;
  percentContribution: number;
  importanceRank: number;
}

interface HistoricalReliability {
  signalType: string;
  successRate: number;
  sampleSize: number;
  avgAlphaPct: number;
  predictivePower: string;
}

interface ExplanationData {
  symbol: string;
  classification: { from: string | null; to: string; changed: boolean };
  healthScore: { from: number | null; to: number; delta: number | null };
  summary: string;
  drivers: Driver[];
  positives: string[];
  negatives: string[];
  factorContributions: {
    factor: string;
    delta: number;
    percentContribution: number;
    importanceRank: number;
    direction: string;
  }[];
  historicalReliability: HistoricalReliability | null;
  generatedAt: string;
}

const DRIVER_COLORS: Record<number, string> = {
  1: "bg-cyan-500",
  2: "bg-violet-500",
  3: "bg-amber-500",
};

function driverColor(index: number): string {
  return DRIVER_COLORS[index] ?? "bg-slate-300";
}

function driverTextColor(index: number): string {
  return DRIVER_COLORS[index]?.replace("bg-", "text-") ?? "text-slate-400";
}

interface WhyItChangedTabProps {
  symbol: string;
}

export default function WhyItChangedTab({ symbol }: WhyItChangedTabProps): JSX.Element {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const horizon = new URLSearchParams(window.location.search).get('horizon') || '30';
    fetch(`/api/predictions/explain/${encodeURIComponent(symbol)}?horizon=${encodeURIComponent(horizon)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? 'Failed to load explanation');
        }
        return res.json();
      })
      .then((envelope: { status?: string; data?: ExplanationData; message?: string | null }) => {
        if (envelope?.status === 'unavailable') {
          throw new Error(envelope.message || 'Prediction explanation not available');
        }
        const explanation = envelope?.data ?? envelope as unknown as ExplanationData;
        if (!cancelled) setData(explanation);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="mb-2 h-3 w-2/5 rounded bg-[rgba(148,163,184,0.12)]" />
            <div className="h-2 w-3/5 rounded bg-[rgba(148,163,184,0.08)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] p-5 text-center">
        <p className="mb-1 text-sm font-bold text-[#E6EDF3]">Research signals pending</p>
        <p className="text-xs text-[#9AA7B5]">{error || "Research signals are being prepared for this company."}</p>
      </div>
    );
  }

  if (!data.classification.from) {
    return (
      <div className="rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.03)] p-5 text-center">
        <p className="mb-1 text-sm font-bold text-[#E6EDF3]">Research signals pending</p>
        <p className="text-xs leading-relaxed text-[#9AA7B5]">
          This is the first prediction for {data.symbol}. Change tracking begins with the next prediction cycle.
        </p>
      </div>
    );
  }

  const hs = data.healthScore;
  const classChange = data.classification;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Banner */}
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">What Changed</p>
        <p className="text-sm font-semibold leading-relaxed text-slate-800">{data.summary}</p>
      </div>

      {/* Health Score Delta */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Health Score</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="mb-1 text-[10px] uppercase text-slate-400">Yesterday</p>
            <p className={`text-4xl font-semibold tabular-nums ${hs.delta !== null && hs.delta > 0 ? "text-emerald-600" : "text-slate-600"}`}>
              {hs.from ?? "—"}
            </p>
          </div>
          <p className="text-2xl font-bold text-slate-300">→</p>
          <div className="text-center">
            <p className="mb-1 text-[10px] uppercase text-slate-400">Today</p>
            <p className="text-4xl font-semibold tabular-nums text-slate-900">{hs.to}</p>
          </div>
          {hs.delta !== null && (
            <div className={`rounded-lg border px-3 py-1 ${hs.delta > 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <span className={`text-lg font-bold ${hs.delta > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {hs.delta > 0 ? '+' : ''}{hs.delta}
              </span>
            </div>
          )}
        </div>

        {classChange.changed && (
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-500">Classification: </span>
            <span className={`font-bold ${hs.delta && hs.delta > 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {classChange.from} → {classChange.to}
            </span>
          </div>
        )}
      </div>

      {/* Biggest Drivers */}
      {data.drivers.filter(d => Math.abs(d.delta) >= 3).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Biggest Drivers</p>
          <div className="flex flex-col gap-2.5">
            {data.drivers.filter(d => Math.abs(d.delta) >= 3).slice(0, 6).map(d => {
              const barWidth = Math.min(Math.abs(d.delta * 2), 100);
              const barColor = d.delta > 0 ? "bg-emerald-500" : "bg-rose-500";
              const rankIdx = d.importanceRank;

              return (
                <div key={d.factor} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white ${driverColor(rankIdx)}`}>
                        {d.importanceRank}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{d.factor}</span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${d.delta > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {d.delta > 0 ? '+' : ''}{d.delta}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="min-w-[36px] text-right text-[10px] text-slate-400">
                      {d.percentContribution}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Factor Contribution Table */}
      {data.factorContributions.length > 1 && (
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Factor Contributions</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-1.5 text-left text-[10px] uppercase text-slate-400">Rank</th>
                <th className="p-1.5 text-left text-[10px] uppercase text-slate-400">Factor</th>
                <th className="p-1.5 text-right text-[10px] uppercase text-slate-400">Delta</th>
                <th className="p-1.5 text-right text-[10px] uppercase text-slate-400">Contribution</th>
                <th className="p-1.5 text-center text-[10px] uppercase text-slate-400">Direction</th>
              </tr>
            </thead>
            <tbody>
              {data.factorContributions.map(fc => (
                <tr key={fc.factor} className="border-b border-slate-100">
                  <td className="p-2 tabular-nums text-slate-500">#{fc.importanceRank}</td>
                  <td className="p-2 font-semibold text-slate-700">{fc.factor}</td>
                  <td className={`p-2 text-right font-bold tabular-nums ${fc.delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {fc.delta > 0 ? '+' : ''}{fc.delta}
                  </td>
                  <td className="p-2 text-right tabular-nums text-slate-500">{fc.percentContribution}%</td>
                  <td className="p-2 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${fc.direction === 'positive' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                      {fc.direction === 'positive' ? '↑ UP' : '↓ DOWN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Positives & Negatives */}
      <div className="grid grid-cols-2 gap-3">
        {data.positives.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase text-emerald-700">Positives</p>
            <ul className="m-0 flex flex-col gap-1 pl-4">
              {data.positives.map((p, i) => (
                <li key={i} className="text-xs leading-relaxed text-slate-700">{p}</li>
              ))}
            </ul>
          </div>
        )}
        {data.negatives.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase text-rose-600">Negatives</p>
            <ul className="m-0 flex flex-col gap-1 pl-4">
              {data.negatives.map((n, i) => (
                <li key={i} className="text-xs leading-relaxed text-slate-700">{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Historical Reliability */}
      {data.historicalReliability && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Historical Reliability</p>
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <p className="text-3xl font-semibold text-slate-800">{data.historicalReliability.successRate}%</p>
              <p className="text-[10px] text-slate-400">Success Rate</p>
            </div>
            <div className="h-10 w-px bg-violet-200" />
            <div>
              <p className="text-lg font-bold tabular-nums text-slate-700">{data.historicalReliability.sampleSize}</p>
              <p className="text-[10px] text-slate-400">Sample Size</p>
            </div>
            <div className="h-10 w-px bg-violet-200" />
            <div>
              <p className={`text-lg font-bold tabular-nums ${data.historicalReliability.avgAlphaPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {data.historicalReliability.avgAlphaPct > 0 ? '+' : ''}{data.historicalReliability.avgAlphaPct}%
              </p>
              <p className="text-[10px] text-slate-400">Avg Alpha</p>
            </div>
            <div className="h-10 w-px bg-violet-200" />
            <div>
              <span className="rounded-md border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-bold text-violet-700">
                {data.historicalReliability.predictivePower}
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
            Signals like this ({data.historicalReliability.signalType}) historically succeeded <strong className="font-semibold text-slate-700">{data.historicalReliability.successRate}%</strong> of the time
            with an average alpha of <strong className={`font-semibold ${data.historicalReliability.avgAlphaPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{data.historicalReliability.avgAlphaPct > 0 ? '+' : ''}{data.historicalReliability.avgAlphaPct}%</strong>.
            Based on <strong className="font-semibold text-slate-700">{data.historicalReliability.sampleSize}</strong> validated outcomes.
          </p>
        </div>
      )}

      {/* Generated at */}
      <p className="text-right text-[9px] text-slate-300">
        Explanation generated {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
