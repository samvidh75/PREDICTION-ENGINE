import { useEffect, useState } from "react";

const INDICES = [
  { name: "NIFTY 50", symbol: "NIFTY" },
  { name: "SENSEX", symbol: "SENSEX" },
  { name: "BANK NIFTY", symbol: "BANKNIFTY" },
  { name: "NIFTY IT", symbol: "NIFTYIT" },
];

type IndexQuote = {
  name: string;
  symbol: string;
  value: number | null;
  change: number | null;
};

function isMarketOpen(): boolean {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  const day = ist.getUTCDay();
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
}

async function fetchIndex(symbol: string): Promise<{ value: number | null; change: number | null }> {
  try {
    const response = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
    if (!response.ok) return { value: null, change: null };
    const data = await response.json();
    return {
      value: typeof data?.price?.current === "number" ? data.price.current : null,
      change: typeof data?.price?.change === "number" ? data.price.change : null,
    };
  } catch {
    return { value: null, change: null };
  }
}

export default function MarketTicker() {
  const [indices, setIndices] = useState<IndexQuote[]>(() =>
    INDICES.map((idx) => ({ ...idx, value: null, change: null })),
  );
  const open = isMarketOpen();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await Promise.all(
        INDICES.map(async (idx) => ({
          ...idx,
          ...(await fetchIndex(idx.symbol)),
        })),
      );
      if (mounted) setIndices(next);
    };
    void load();
    const id = window.setInterval(load, 60000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="no-scrollbar flex h-10 items-center overflow-x-auto border-b border-[#e8e8e8] bg-white [-webkit-overflow-scrolling:touch]">
      {indices.map((idx, index) => (
        <div
          key={idx.name}
          className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap px-4"
          style={{ borderRight: index < indices.length - 1 ? "1px solid #f0f0f0" : "none" }}
        >
          <span className="text-[10px] font-[600] tracking-[0.04em] text-[#999]">{idx.name}</span>
          <span className="tabular text-[13px] font-[700] tracking-[-0.2px] text-[#0a0a0a]">
            {idx.value !== null ? Number(idx.value).toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
          </span>
          {idx.change !== null ? (
            <span className={`text-[11px] font-[600] ${idx.change >= 0 ? "text-[#1a7f4b]" : "text-[#c0392b]"}`}>
              {idx.change >= 0 ? "+" : ""}
              {idx.change.toFixed(2)}%
            </span>
          ) : null}
        </div>
      ))}

      <div className="ml-auto flex flex-shrink-0 items-center gap-1.5 px-4">
        <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${open ? "bg-[#22c55e]" : "bg-[#ccc]"}`} />
        <span className={`whitespace-nowrap text-[11px] font-[600] ${open ? "text-[#1a7f4b]" : "text-[#888]"}`}>
          {open ? "Market Open" : "Market Closed"}
        </span>
      </div>
    </div>
  );
}
