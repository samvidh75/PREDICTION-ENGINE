import React, { useEffect, useState } from "react";
import TrustIndicatorsWidget from "../components/trust/TrustIndicatorsWidget";

interface LeaderboardEntry {
  symbol: string;
  ranking_score?: number;
  classification?: string;
  confidence_score?: number;
  prediction_horizon?: number;
  prediction_date?: string;
}

const UNKNOWN: LeaderboardEntry = { symbol: "-" };

export default function LeaderboardPage(): JSX.Element {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(Array(10).fill(UNKNOWN));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/intelligence/leaderboard?limit=10");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            setEntries(json);
            setLoading(false);
            return;
          }
        }
      } catch {}
      // Fallback: query prediction_registry directly via API
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const handleStockClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-white">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Top Performing Predictions</h1>
        <p className="text-sm text-[#8B949E] mt-1">Validated outcomes ranked by prediction confidence.</p>
        <div className="mt-4">
          <TrustIndicatorsWidget />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[#0D1117] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 || entries[0].symbol === "-" ? (
        <div className="rounded-lg border border-white/[0.06] bg-[#0D1117] p-12 text-center">
          <p className="text-sm text-[#8B949E]">Leaderboard data is currently unavailable.</p>
          <p className="text-xs text-[#484F58] mt-2">Predictions are validated daily. Check back after the next pipeline run.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            const score = entry.ranking_score ?? null;
            const cls = entry.classification ?? "—";
            const conf = entry.confidence_score ?? null;
            const horizon = entry.prediction_horizon ?? null;

            return (
              <button
                key={entry.symbol}
                onClick={() => handleStockClick(entry.symbol)}
                className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#0D1117] px-5 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-[#11161C]"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isTop3 ? "bg-[#2962FF]/15 text-[#2962FF]" : "bg-white/5 text-[#8B949E]"
                }`}>
                  #{rank}
                </div>
                <div className="min-w-[80px] font-mono font-semibold text-sm">{entry.symbol}</div>
                <div className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                  cls.includes("Excellent") || cls.includes("Strong") ? "bg-[#22AB94]/10 text-[#22AB94]" :
                  cls.includes("Good") || cls.includes("Buy") ? "bg-[#2962FF]/10 text-[#2962FF]" :
                  "bg-white/5 text-[#8B949E]"
                }`}>
                  {cls}
                </div>
                {conf !== null && <div className="text-xs text-[#8B949E]">{conf}% confidence</div>}
                {horizon !== null && <div className="text-xs text-[#484F58]">{horizon}d horizon</div>}
                {score !== null && (
                  <div className={`font-mono text-sm font-bold ${isTop3 ? "text-[#22AB94]" : "text-white"}`}>
                    {score}/100
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-center">
        <a
          href="/?page=predictions"
          className="inline-flex rounded-lg bg-[#2962FF] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1E53E5] transition-colors no-underline"
        >
          View All Predictions →
        </a>
      </div>
    </div>
  );
}
