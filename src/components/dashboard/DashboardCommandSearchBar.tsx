import React, { useMemo, useState } from "react";

type Props = {
  statusPill: string;
  preferredPills: string[];
  onOpenSearch: (q: string) => void;
};

export default function DashboardCommandSearchBar({
  statusPill,
  preferredPills,
  onOpenSearch,
}: Props): JSX.Element {
  const [query, setQuery] = useState("");

  const chips = useMemo(() => {
    const safe = preferredPills
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);

    const out: string[] = [];
    const seen = new Set<string>();

    for (const c of safe) {
      const k = c.toLowerCase();

      if (seen.has(k)) continue;

      seen.add(k);
      out.push(c);

      if (out.length >= 6) break;
    }

    return out;
  }, [preferredPills]);

  const submit = () => {
    const q = query.trim();

    if (!q) return;

    onOpenSearch(q);
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-[#050607]/90 p-5 shadow-[0_0_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.26em] text-cyan-200/70">
              StockStory India
            </div>

            <div className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Search the Indian Market
            </div>

            <div className="mt-3 text-sm leading-7 text-white/58 sm:text-[15px]">
              Explore stocks across NSE, BSE, and SME exchanges with cleaner
              charts, market tracking, and simplified company health insights.
            </div>
          </div>

          <div className="inline-flex h-fit items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {statusPill}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-[58px] flex-1 items-center gap-3 rounded-[22px] border border-white/10 bg-black/30 px-5">
            <div className="text-white/35">⌕</div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Search Reliance, Tata Motors, HAL, BEL..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              aria-label="Search Indian stocks"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            className="h-[58px] rounded-[22px] border border-cyan-500/20 bg-cyan-500/10 px-7 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/30 hover:bg-cyan-500/15"
            aria-label="Search stocks"
          >
            Search
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onOpenSearch(c)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/65 transition hover:border-cyan-500/25 hover:text-cyan-200"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4 text-xs text-white/38">
          <div>Live market tracking</div>
          <div>•</div>
          <div>Beginner-friendly stock analysis</div>
          <div>•</div>
          <div>NSE · BSE · SME coverage</div>
        </div>
      </div>
    </div>
  );
}
