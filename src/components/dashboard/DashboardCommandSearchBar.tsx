import React, { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");

  const chips = useMemo(() => {
    const safe = preferredPills
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);

    // Keep UI calm: show up to 4.
    const out: string[] = [];
    const seen = new Set<string>();
    for (const c of safe) {
      const k = c.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
      if (out.length >= 4) break;
    }
    return out;
  }, [preferredPills]);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    onOpenSearch(q);
    // Keep local state; navigation is hard and overlay will open.
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.35)] p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Universal command search</div>
            <div className="mt-2 text-[22px] font-semibold text-white/92 leading-[1.1]">Find what matters now</div>
          </div>

          <div
            className="shrink-0 flex items-center justify-center rounded-full border border-white/10 bg-black/25 px-[14px] py-[8px]"
            style={{
              boxShadow: prefersReducedMotion ? undefined : `0 0 40px rgba(0,255,210,0.08)`,
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/65">{statusPill}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Search market intelligence…"
            className="flex-1 h-[52px] rounded-[18px] outline-none bg-black/25 border border-white/10 px-[16px] text-white/90 placeholder:text-white/35 text-[14px]"
            aria-label="Search market intelligence"
          />

          <button
            type="button"
            onClick={submit}
            className="h-[52px] px-[18px] rounded-[18px] border border-white/10 bg-black/35 text-white/90 hover:text-white/95 transition"
            aria-label="Open search overlay"
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
                className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            Calm guidance • educational context • no trade execution
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenSearch("sector rotation")}
              className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
            >
              Sector view
            </button>
            <button
              type="button"
              onClick={() => onOpenSearch("institutional selectivity")}
              className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
            >
              Institutional view
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
