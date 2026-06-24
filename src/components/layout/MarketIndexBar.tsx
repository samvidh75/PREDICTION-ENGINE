import React, { useEffect, useState } from "react";
import { api } from "../../services/api/client";

interface IndexQuote {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
}

const INDICES: Array<{ symbol: string; label: string }> = [
  { symbol: "NIFTY50", label: "NIFTY 50" },
  { symbol: "SENSEX", label: "SENSEX" },
  { symbol: "BANKNIFTY", label: "BANK NIFTY" },
  { symbol: "NIFTYIT", label: "NIFTY IT" },
];

function isIndianMarketOpen(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const mins = h * 60 + m;
  return mins >= 555 && mins < 930; // 9:15 – 15:30 IST
}

function changeColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  return v >= 0 ? "#16A34A" : "#EF4444";
}

export function MarketIndexBar() {
  const [quotes, setQuotes] = useState<IndexQuote[]>(
    INDICES.map(i => ({ symbol: i.symbol, label: i.label, price: null, change: null }))
  );
  const [marketOpen] = useState<boolean>(isIndianMarketOpen());

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const settled = await Promise.allSettled(
        INDICES.map(idx => api.getQuote(idx.symbol))
      );
      if (cancelled) return;
      setQuotes(
        INDICES.map((idx, i) => {
          const s = settled[i];
          if (s.status === "fulfilled") {
            return {
              symbol: idx.symbol,
              label: idx.label,
              price: s.value.price ?? null,
              change: s.value.changePercent ?? null,
            };
          }
          return { symbol: idx.symbol, label: idx.label, price: null, change: null };
        })
      );
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-1.5 flex items-center gap-6 overflow-x-auto scrollbar-none">
      <span
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: marketOpen ? "#F0FDF4" : "#F1F5F9",
          color: marketOpen ? "#16A34A" : "#64748B",
        }}
      >
        {marketOpen ? "Market Open" : "Market Closed"}
      </span>
      {quotes.map(q => (
        <div key={q.symbol} className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">{q.label}</span>
          {q.price !== null ? (
            <>
              <span className="text-[11px] font-bold text-[#1E293B] tabular-nums">
                {q.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: changeColor(q.change) }}
              >
                {q.change !== null ? `${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}%` : ""}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-[#CBD5E1]">—</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default MarketIndexBar;
