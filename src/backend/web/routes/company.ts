// src/backend/web/routes/company.ts
// TRACK-96A: Real financial data endpoint from financial_snapshots.
// Eliminates deterministic finance generation — every metric traces to DB or returns null.

import type { FastifyPluginAsync } from "fastify";
import { query } from "../../../db/index";

type FinancialsRow = {
  symbol: string;
  snapshot_date: string;
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
  profit_growth: number | null;
};

type FinancialsResponse = {
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

function normaliseTicker(raw: string): string {
  return raw.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

function parseFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/company/:ticker/financials", async (request, reply) => {
    const startedAt = Date.now();
    const { ticker } = request.params as { ticker: string };
    const symbol = normaliseTicker(ticker);

    if (!symbol || symbol.length === 0) {
      return reply.status(400).send({
        code: "INVALID_TICKER",
        message: "Ticker parameter is required and must contain alphanumeric characters.",
      });
    }

    try {
      const result = await query(
        `SELECT
           symbol,
           snapshot_date,
           pe_ratio,
           pb_ratio,
           roe,
           roa,
           roce AS roic,
           operating_margin,
           NULL AS net_margin,
           revenue_growth,
           eps_growth AS earnings_growth,
           debt_to_equity,
           current_ratio,
           beta,
           fcf_yield,
           ev_ebitda,
           market_cap,
           profit_growth
         FROM financial_snapshots
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         ORDER BY snapshot_date DESC
         LIMIT 1`,
        [symbol],
      );

      const rows = result.rows as FinancialsRow[] | undefined;

      if (!rows || rows.length === 0) {
        return reply.send({
          ticker: symbol,
          snapshot_date: null,
          pe_ratio: null,
          pb_ratio: null,
          roe: null,
          roa: null,
          roic: null,
          operating_margin: null,
          net_margin: null,
          revenue_growth: null,
          earnings_growth: null,
          debt_to_equity: null,
          current_ratio: null,
          beta: null,
          fcf_yield: null,
          ev_ebitda: null,
          market_cap: null,
          lineage: {
            source_table: "financial_snapshots",
            columns_available: [],
            columns_null: [
              "pe_ratio", "pb_ratio", "roe", "roa", "roic",
              "operating_margin", "net_margin", "revenue_growth",
              "earnings_growth", "debt_to_equity", "current_ratio",
              "beta", "fcf_yield", "ev_ebitda", "market_cap",
            ],
          },
        } satisfies FinancialsResponse);
      }

      const row = rows[0];
      const peRatio = parseFinite(row.pe_ratio);
      const pbRatio = parseFinite(row.pb_ratio);
      const roe = parseFinite(row.roe);
      const roic = parseFinite(row.roic);
      const operatingMargin = parseFinite(row.operating_margin);
      const netMargin = parseFinite(row.net_margin);
      const revenueGrowth = parseFinite(row.revenue_growth);
      const earningsGrowth = parseFinite(row.earnings_growth);
      const debtToEquity = parseFinite(row.debt_to_equity);
      const currentRatio = parseFinite(row.current_ratio);
      const beta = parseFinite(row.beta);
      const fcfYield = parseFinite(row.fcf_yield);
      const evEbitda = parseFinite(row.ev_ebitda);
      const marketCap = parseFinite(row.market_cap);

      const allFields: [string, number | null][] = [
        ["pe_ratio", peRatio],
        ["pb_ratio", pbRatio],
        ["roe", roe],
        ["roa", null],
        ["roic", roic],
        ["operating_margin", operatingMargin],
        ["net_margin", netMargin],
        ["revenue_growth", revenueGrowth],
        ["earnings_growth", earningsGrowth],
        ["debt_to_equity", debtToEquity],
        ["current_ratio", currentRatio],
        ["beta", beta],
        ["fcf_yield", fcfYield],
        ["ev_ebitda", evEbitda],
        ["market_cap", marketCap],
      ];

      const columnsAvailable = allFields.filter(([, v]) => v !== null).map(([k]) => k);
      const columnsNull = allFields.filter(([, v]) => v === null).map(([k]) => k);

      return reply.send({
        ticker: symbol,
        snapshot_date: row.snapshot_date ?? null,
        pe_ratio: peRatio,
        pb_ratio: pbRatio,
        roe,
        roa: null,
        roic,
        operating_margin: operatingMargin,
        net_margin: netMargin,
        revenue_growth: revenueGrowth,
        earnings_growth: earningsGrowth,
        debt_to_equity: debtToEquity,
        current_ratio: currentRatio,
        beta,
        fcf_yield: fcfYield,
        ev_ebitda: evEbitda,
        market_cap: marketCap,
        lineage: {
          source_table: "financial_snapshots",
          columns_available: columnsAvailable,
          columns_null: columnsNull,
        },
      } satisfies FinancialsResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : "UNKNOWN_FINANCIALS_ERROR";
      return reply.status(500).send({
        code: "FINANCIALS_ENDPOINT_ERROR",
        ticker: symbol,
        message,
      });
    }
  });
};

export default companyRoutes;
