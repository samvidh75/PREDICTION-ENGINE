export {};
/**
 * probe-public-fundamentals.ts
 *
 * Verifies the real public-source pipeline now used for stock detail fundamentals:
 * - Yahoo Finance bridge for normalized key metrics
 * - Screener.in annual Profit & Loss table for multi-year revenue/profit history
 * - Screener.in shareholding table for quarterly ownership breakdown
 * - Optional legacy nsepython results probes for comparison only
 *
 * Usage:
 *   npx tsx scripts/probe-public-fundamentals.ts
 *   npx tsx scripts/probe-public-fundamentals.ts --symbol=TCS
 */

import { execSync } from "node:child_process";

type ProbeStatus = "healthy" | "failed" | "partial" | "unavailable";

interface ProbeResult {
  source: string;
  status: ProbeStatus;
  detail: string;
  sample?: Record<string, unknown>;
}

function getSymbol(): string {
  const arg = process.argv.slice(2).find((entry) => entry.startsWith("--symbol="));
  return (arg?.split("=")[1] ?? "RELIANCE").trim().toUpperCase();
}

function runPythonJson(command: string, timeoutMs = 30_000): unknown {
  const output = execSync(command, {
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(output);
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8377;|₹/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseHtmlTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      row.push(decodeHtml(stripTags(cellMatch[1])));
    }
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

function findTableNearHeading(html: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`${escaped}[\\s\\S]{0,5000}?<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\\s\\S]*?)<\\/table>`, "i"));
  return match?.[1] ?? null;
}

function findRow(rows: string[][], aliases: string[]): string[] | null {
  for (const row of rows) {
    const label = (row[0] ?? "").toLowerCase();
    if (aliases.some((alias) => label.includes(alias.toLowerCase()))) return row;
  }
  return null;
}

async function fetchScreenerHtml(symbol: string): Promise<string> {
  const response = await fetch(`https://www.screener.in/company/${encodeURIComponent(symbol)}/consolidated/`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; StockStory/1.0; +https://stockstory-india.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

function probeYahooFinancials(symbol: string): ProbeResult {
  try {
    const payload = runPythonJson(`python3 scripts/yfinance_bridge.py fundamentals-batch ${symbol}.NS 0.25 0.75`) as Record<string, any>;
    const entry = payload[`${symbol}.NS`] as Record<string, any> | undefined;
    if (!entry || entry.error) {
      return {
        source: "yfinance-bridge",
        status: "failed",
        detail: String(entry?.error ?? "no fundamentals returned"),
      };
    }
    return {
      source: "yfinance-bridge",
      status: "healthy",
      detail: "Normalized key metrics returned",
      sample: {
        periodEnd: entry.periodEnd,
        sector: entry.sector,
        trailingPE: entry.trailingPE,
        returnOnEquity: entry.returnOnEquity,
        revenueGrowth: entry.revenueGrowth,
      },
    };
  } catch (error) {
    return {
      source: "yfinance-bridge",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error),
    };
  }
}

async function probeScreenerFinancials(symbol: string): Promise<ProbeResult> {
  try {
    const html = await fetchScreenerHtml(symbol);
    const table = findTableNearHeading(html, "Profit & Loss");
    if (!table) {
      return { source: "screener-financials", status: "failed", detail: "Profit & Loss table not found" };
    }
    const rows = parseHtmlTable(table);
    const header = rows[0] ?? [];
    const revenueRow = findRow(rows.slice(1), ["sales", "revenue"]);
    const profitRow = findRow(rows.slice(1), ["net profit", "profit after tax", "profit"]);
    const years = header.slice(1).filter((value) => /\b(?:Mar|Jun|Sep|Dec)\s+\d{4}\b/.test(value));

    if (!revenueRow || !profitRow || years.length < 4) {
      return {
        source: "screener-financials",
        status: "partial",
        detail: "Annual table found but expected revenue/profit rows or year columns were incomplete",
        sample: { columns: years.slice(0, 8), firstRows: rows.slice(0, 3) },
      };
    }

    return {
      source: "screener-financials",
      status: "healthy",
      detail: `${years.length} annual columns with revenue and profit rows`,
      sample: {
        years: years.slice(0, 8),
        revenue: revenueRow.slice(1, 5),
        profit: profitRow.slice(1, 5),
      },
    };
  } catch (error) {
    return {
      source: "screener-financials",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error),
    };
  }
}

async function probeScreenerShareholding(symbol: string): Promise<ProbeResult> {
  try {
    const html = await fetchScreenerHtml(symbol);
    const table = findTableNearHeading(html, "Shareholding Pattern");
    if (!table) {
      return { source: "screener-shareholding", status: "failed", detail: "Shareholding Pattern table not found" };
    }
    const rows = parseHtmlTable(table);
    const header = rows[0] ?? [];
    const promoterRow = findRow(rows.slice(1), ["promoters", "promoter"]);
    const fiiRow = findRow(rows.slice(1), ["fiis", "fii"]);
    const diiRow = findRow(rows.slice(1), ["diis", "dii"]);
    const publicRow = findRow(rows.slice(1), ["public"]);
    const periods = header.slice(1).filter((value) => /\b(?:Mar|Jun|Sep|Dec)\s+\d{4}\b/.test(value));

    if (!promoterRow || !fiiRow || !diiRow || !publicRow || periods.length < 2) {
      return {
        source: "screener-shareholding",
        status: "partial",
        detail: "Shareholding table found but expected holder rows or quarterly columns were incomplete",
        sample: { periods: periods.slice(0, 6), firstRows: rows.slice(0, 5) },
      };
    }

    return {
      source: "screener-shareholding",
      status: "healthy",
      detail: `${periods.length} quarterly columns with promoter/FII/DII/public rows`,
      sample: {
        periods: periods.slice(0, 6),
        promoter: promoterRow.slice(1, 4),
        fii: fiiRow.slice(1, 4),
        dii: diiRow.slice(1, 4),
        public: publicRow.slice(1, 4),
      },
    };
  } catch (error) {
    return {
      source: "screener-shareholding",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error),
    };
  }
}

function probeNsepythonLegacy(symbol: string): ProbeResult[] {
  const probes: ProbeResult[] = [];
  try {
    const result = runPythonJson(
      `python3 -c "import json,nsepython; ` +
        `r=nsepython.nse_results('${symbol}'); ` +
        `print(json.dumps({'type': type(r).__name__, 'truthy': bool(r), 'keys': list(r.keys())[:5] if isinstance(r, dict) else []}))"`
    ) as Record<string, any>;
    probes.push({
      source: "nsepython.nse_results",
      status: result.truthy ? "healthy" : "unavailable",
      detail: result.truthy ? "Legacy endpoint returned data" : "Legacy endpoint returned no usable data",
      sample: result,
    });
  } catch (error) {
    probes.push({
      source: "nsepython.nse_results",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
  }

  try {
    const result = runPythonJson(
      `python3 -c "import json,nsepython; ` +
        `r=nsepython.nse_past_results('${symbol}'); ` +
        `print(json.dumps({'type': type(r).__name__, 'truthy': bool(r), 'keys': list(r.keys())[:5] if isinstance(r, dict) else []}))"`
    ) as Record<string, any>;
    probes.push({
      source: "nsepython.nse_past_results",
      status: result.truthy ? "healthy" : "unavailable",
      detail: result.truthy ? "Legacy endpoint returned data" : "Legacy endpoint returned no usable data",
      sample: result,
    });
  } catch (error) {
    probes.push({
      source: "nsepython.nse_past_results",
      status: "failed",
      detail: error instanceof Error ? error.message.slice(0, 200) : String(error),
    });
  }

  return probes;
}

async function main(): Promise<void> {
  const symbol = getSymbol();
  const sources = [
    probeYahooFinancials(symbol),
    await probeScreenerFinancials(symbol),
    await probeScreenerShareholding(symbol),
    ...probeNsepythonLegacy(symbol),
  ];

  console.log(JSON.stringify({
    probe: "public-fundamentals-sources",
    symbol,
    generatedAt: new Date().toISOString(),
    verdict: {
      financialStatementsReal: sources.some((entry) => entry.source === "screener-financials" && entry.status === "healthy"),
      normalizedFundamentalsReal: sources.some((entry) => entry.source === "yfinance-bridge" && entry.status === "healthy"),
      shareholdingReal: sources.some((entry) => entry.source === "screener-shareholding" && entry.status === "healthy"),
    },
    sources,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
