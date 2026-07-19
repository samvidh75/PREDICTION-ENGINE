import type { VercelRequest, VercelResponse } from "@vercel/node";
import { NSE_BSE_STOCKS } from "./universe.js";
import { stockDataAggregator } from "../_lib/services/stockDataAggregator.js";

/**
 * Search and filter 5000+ stocks by various criteria
 * Supports searching by symbol, sector, name, market cap, fundamentals
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const {
    query,
    sector,
    limit = "50",
    offset = "0",
    sortBy = "marketCap",
    exchange = "NSE",
    minPe,
    maxPe,
    minRoe,
    maxRoe,
    minDividendYield,
    healthScoreMin,
  } = req.query;

  try {
    // Get all stocks
    const allStocks = getAllStocks();

    // Apply filters
    let filtered = allStocks;

    // Search by query (symbol, name)
    if (query) {
      const q = (query as string).toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      );
    }

    // Filter by sector
    if (sector) {
      filtered = filtered.filter((s) => s.sector.toLowerCase() === (sector as string).toLowerCase());
    }

    // Filter by exchange
    if (exchange) {
      filtered = filtered.filter((s) => s.exchange === exchange);
    }

    // Fetch detailed data for filtered stocks
    const stocks = await Promise.all(
      filtered
        .slice(
          parseInt(offset as string),
          parseInt(offset as string) + parseInt(limit as string)
        )
        .map((s) => stockDataAggregator.fetchCompleteStockData(s.symbol))
    );

    // Apply fundamental filters
    const finalStocks = stocks.filter((s) => {
      if (minPe && s.fundamentals?.pe && s.fundamentals.pe < parseFloat(minPe as string))
        return false;
      if (maxPe && s.fundamentals?.pe && s.fundamentals.pe > parseFloat(maxPe as string))
        return false;
      if (minRoe && s.fundamentals?.roe && s.fundamentals.roe < parseFloat(minRoe as string))
        return false;
      if (maxRoe && s.fundamentals?.roe && s.fundamentals.roe > parseFloat(maxRoe as string))
        return false;
      if (
        minDividendYield &&
        s.fundamentals?.dividendYield &&
        s.fundamentals.dividendYield < parseFloat(minDividendYield as string)
      )
        return false;
      if (healthScoreMin && s.healthScore?.overall < parseFloat(healthScoreMin as string))
        return false;
      return true;
    });

    // Sort results
    finalStocks.sort((a, b) => {
      switch (sortBy) {
        case "marketCap":
          return (b.price?.marketCap || 0) - (a.price?.marketCap || 0);
        case "pe":
          return (a.fundamentals?.pe || 0) - (b.fundamentals?.pe || 0);
        case "roe":
          return (b.fundamentals?.roe || 0) - (a.fundamentals?.roe || 0);
        case "healthScore":
          return (b.healthScore?.overall || 0) - (a.healthScore?.overall || 0);
        case "price":
          return (b.price?.current || 0) - (a.price?.current || 0);
        default:
          return 0;
      }
    });

    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).json({
      results: finalStocks,
      total: filtered.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Search error:", error);
    return res
      .status(500)
      .json({ error: "Failed to search stocks", details: String(error) });
  }
}

/**
 * Get all stocks from universe
 */
function getAllStocks() {
  const all = [];

  // Add NIFTY 50
  for (const symbol of NSE_BSE_STOCKS.nifty50) {
    all.push({
      symbol,
      name: symbol,
      sector: getSector(symbol),
      exchange: "NSE",
    });
  }

  // Add NIFTY NEXT 50
  for (const symbol of NSE_BSE_STOCKS.niftynext50) {
    all.push({
      symbol,
      name: symbol,
      sector: getSector(symbol),
      exchange: "NSE",
    });
  }

  // Add NIFTY MIDCAP
  for (const symbol of [
    ...NSE_BSE_STOCKS.niftymidcap50,
    ...NSE_BSE_STOCKS.niftymidcap100_additional,
  ]) {
    all.push({
      symbol,
      name: symbol,
      sector: getSector(symbol),
      exchange: "NSE",
    });
  }

  // Add NIFTY SMALLCAP
  for (const symbol of [
    ...NSE_BSE_STOCKS.niftysmalcap50,
    ...NSE_BSE_STOCKS.niftysmalcap100_additional,
  ]) {
    all.push({
      symbol,
      name: symbol,
      sector: getSector(symbol),
      exchange: "NSE",
    });
  }

  return all;
}

/**
 * Get sector for a stock
 */
function getSector(symbol: string): string {
  for (const [sector, stocks] of Object.entries(NSE_BSE_STOCKS.sectors)) {
    if (stocks.includes(symbol)) {
      return sector.charAt(0).toUpperCase() + sector.slice(1);
    }
  }
  return "Unknown";
}
