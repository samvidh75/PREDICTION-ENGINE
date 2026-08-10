import { useCallback, useEffect, useState } from "react";
import { useMarketStatus } from "../hooks/useMarketStatus";

interface TickerItem {
  label: string;
  changePercent: number;
}

/** Same sector labels as SectorHeatmap.tsx, kept in sync manually since
    that map isn't exported. */
const SECTOR_LABELS: Record<string, string> = {
  financials: "Financials",
  industrial: "Industrial",
  holdingFirms: "Holding Firms",
  property: "Property",
  services: "Services",
  miningAndOil: "Mining & Oil",
};

/** Scrolling ribbon of real PSEi + sector moves for the public landing page.
    No USD/PHP rate — the only source found in this codebase for that
    (InternationalizationFramework.ts) is a hardcoded static number, not a
    live feed, so it's left out rather than presented as live data. */
export function TickerBar() {
  const [items, setItems] = useState<TickerItem[] | null>(null);
  const marketStatus = useMarketStatus(60000);

  const load = useCallback(() => {
    fetch("/api/market-pulse")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.ok) return;
        const sectorItems: TickerItem[] = Array.isArray(payload.sectors)
          ? payload.sectors.map((s: any) => ({ label: SECTOR_LABELS[s.sector] ?? s.sector, changePercent: s.avgChangePercent }))
          : [];
        setItems([{ label: "PSEi-30", changePercent: payload.indexChangePercent }, ...sectorItems]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (!items || items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      aria-label={
        marketStatus.isOpen
          ? "Live PSE market ticker"
          : "PSE market ticker — last session"
      }
      style={{
        width: "100%",
        overflow: "hidden",
        borderTop: "1px solid var(--glass-border)",
        borderBottom: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
        padding: "10px 0",
      }}
    >
      <div className="stockex-ticker-track" style={{ display: "flex", width: "max-content", gap: 36 }}>
        {doubled.map((item, i) => {
          const up = item.changePercent >= 0;
          const tint = up ? "var(--market-green)" : "var(--market-red)";
          return (
            <span
              key={`${item.label}-${i}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: "var(--font-mono)", fontSize: 12.5, whiteSpace: "nowrap",
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: tint, fontWeight: 700 }}>
                {up ? "+" : ""}{item.changePercent.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <style>{`
        .stockex-ticker-track {
          animation: stockex-ticker-scroll 32s linear infinite;
        }
        @keyframes stockex-ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stockex-ticker-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
