import { useCallback, useEffect, useState } from "react";
import type { IndexQuote } from "./AppChrome";

/* ============================================================================
   Shared chrome helpers for the StockStory design (SiteHeader / MarketTape /
   Shell / BottomNav). Used by both PublicLayout (public routes) and AppShell
   (authenticated workspace routes) so every page renders the same chrome.
   ============================================================================ */

const SECTOR_LABELS: Record<string, string> = {
  financials: "Financials",
  industrial: "Industrial",
  holdingFirms: "Holding Firms",
  property: "Property",
  services: "Services",
  miningAndOil: "Mining & Oil",
};

/**
 * Live index-tape quotes for the MarketTape strip, sourced from the real
 * /api/market-pulse payload (PSE index + top sector movers). Refreshes on a
 * timer and on tab re-focus. Returns [] when no real quote data is available —
 * the tape is simply hidden, never filled with a placeholder.
 */
export function useIndexTape(): IndexQuote[] {
  const [items, setItems] = useState<IndexQuote[]>([]);

  const load = useCallback(() => {
    fetch("/api/market-pulse")
      .then((r) => r.json())
      .then((payload) => {
        if (!payload.ok) return;
        const idx: IndexQuote[] = [];
        if (typeof payload.indexChangePercent === "number") {
          const p = payload.indexChangePercent;
          idx.push({
            name: "PSE Index",
            value: `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`,
            change: `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`,
            direction: p >= 0 ? "up" : "down",
          });
        }
        const sectorItems = Array.isArray(payload.sectors)
          ? payload.sectors.slice(0, 3).map((s: any) => {
              const p = s.avgChangePercent;
              return {
                name: SECTOR_LABELS[s.sector] ?? s.sector,
                value: `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`,
                change: `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`,
                direction: p >= 0 ? "up" : "down",
              } as IndexQuote;
            })
          : [];
        setItems([...idx, ...sectorItems].slice(0, 4));
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

  return items;
}

/** Which BottomNav tab (if any) is active for the given path. */
export function bottomActive(pathname: string): string | undefined {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/scanner")) return "scanner";
  if (pathname.startsWith("/watchlist")) return "watchlist";
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/alerts")) return "alerts";
  return undefined;
}
