// src/services/company/useCompanyFinancials.ts
// TRACK-96A: React hook to fetch real financial data from GET /api/company/{ticker}/financials.
// Replaces all deterministic finance with real DB-backed data.
// Returns loading/error/unavailable states — never synthetic values.

import { useCallback, useEffect, useState } from "react";

export type CompanyFinancials = {
  ticker: string;
  snapshot_date: string | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  beta: number | null;
  fcf_yield: number | null;
  ev_ebitda: number | null;
  market_cap: number | null;
  lineage: {
    source_table: string;
    columns_available: string[];
    columns_null: string[];
  };
};

export type UseCompanyFinancialsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; data: CompanyFinancials }
  | { kind: "error"; message: string }
  | { kind: "unavailable"; ticker: string };

export type UseCompanyFinancialsResult = UseCompanyFinancialsState & {
  refetch: () => void;
};

export function useCompanyFinancials(ticker: string): UseCompanyFinancialsResult {
  const [state, setState] = useState<UseCompanyFinancialsState>({ kind: "idle" });

  const fetchFinancials = useCallback(async () => {
    if (!ticker || ticker.trim().length === 0) {
      setState({ kind: "unavailable", ticker: ticker ?? "" });
      return;
    }

    setState({ kind: "loading" });

    try {
      const baseUrl = window.location.origin;

      const response = await fetch(
        `${baseUrl}/api/company/${encodeURIComponent(ticker.trim())}/financials`,
        {
          headers: { "Accept": "application/json" },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
          (errorBody as { message?: string }).message ??
          `HTTP ${response.status}`;

        setState({ kind: "error", message });
        return;
      }

      const data = (await response.json()) as CompanyFinancials;

      // If snapshot_date is null, no data is available in DB
      if (!data.snapshot_date) {
        setState({ kind: "unavailable", ticker: data.ticker ?? ticker });
        return;
      }

      setState({ kind: "loaded", data });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setState({ kind: "error", message });
    }
  }, [ticker]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return {
    ...state,
    refetch: fetchFinancials,
  };
}

// Formatting helpers (NOT generators — these are pure presentation functions)
export function formatPE(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatMarketCap(value: number | null | undefined): { exact: string; words: string } {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return { exact: "Unavailable", words: "Unavailable" };
  }
  return {
    exact: formatPHPWithCommas(value),
    words: formatCompactRupees(value),
  };
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  return value.toFixed(2);
}

function formatCompactRupees(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) {
    return `₱${(value / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `₱${(value / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return `₱${(value / 1e3).toFixed(2)}K`;
  }
  return `₱${Math.round(value).toLocaleString(undefined)}`;
}

function formatPHPWithCommas(value: number): string {
  const isNeg = value < 0;
  const abs = Math.abs(Math.round(value));
  const s = abs.toString();
  if (s.length <= 3) return `${isNeg ? "-" : ""}₱${s}`;

  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);

  const restReversed = rest.split("").reverse();
  const groups: string[] = [];
  let i = 0;

  while (i < restReversed.length) {
    const take = i === 0 ? 3 : 2;
    const part = restReversed.slice(i, i + take).reverse().join("");
    groups.unshift(part);
    i += take;
  }

  return `${isNeg ? "-" : ""}₱${groups.join(",")},${last3}`;
}
