import { useCallback, useEffect, useState } from "react";
import { useMarketStatus } from "../hooks/useMarketStatus";

interface TickerItem {
  label: string;
  changePercent: number;
}

/** Index-tape card: bordered box of index/sector columns + a market-status
    panel, matching the StockStory design import. Only renders fields backed
    by real data (label + change%) — no fabricated level/low/high figures. */

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

  const columns = items.slice(0, 4);

  return (
    <div
      aria-label={
        marketStatus.isOpen
          ? "Live PSE market indices"
          : "PSE market indices — last session"
      }
      className="stockex-index-tape"
    >
      {columns.map((item) => {
        const up = item.changePercent >= 0;
        const tint = up ? "var(--market-green)" : "var(--market-red)";
        return (
          <div key={item.label} className="stockex-index-col">
            <div className="stockex-index-label">{item.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: tint,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {up ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
      <div className="stockex-index-status">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: marketStatus.isOpen ? "var(--market-green)" : "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: marketStatus.isOpen ? "var(--market-green)" : "var(--text-muted)",
            }}
          />
          {marketStatus.label}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {marketStatus.detail}
        </div>
      </div>
      <style>{`
        .stockex-index-tape {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          overflow: hidden;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
        }
        .stockex-index-col {
          padding: 13px 17px;
          min-width: 0;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .stockex-index-col:nth-child(2n) { border-right: none; }
        .stockex-index-label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .stockex-index-status {
          grid-column: 1 / -1;
          padding: 13px 17px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          min-width: 0;
        }
        @media (min-width: 640px) {
          .stockex-index-tape { grid-template-columns: repeat(4, minmax(0, 1fr)) auto; }
          .stockex-index-col { border-bottom: none; border-right: 1px solid var(--border); }
          .stockex-index-col:nth-child(2n) { border-right: 1px solid var(--border); }
          .stockex-index-col:nth-last-child(2) { border-right: 1px solid var(--border); }
          .stockex-index-status { grid-column: auto; }
        }
      `}</style>
    </div>
  );
}
