/**
 * Ingest fundamentals from Screener.in
 * Usage: npx tsx scripts/ingest-screener.ts [symbol1 symbol2 ...]
 *        npx tsx scripts/ingest-screener.ts --all
 *        npx tsx scripts/ingest-screener.ts --output ./data/fundamentals.json RELIANCE TCS INFY
 */

interface ScreenerFundamentals {
  symbol: string;
  marketCap?: number;
  currentPrice?: number;
  high52?: number;
  low52?: number;
  pe?: number;
  industryPe?: number;
  bookValue?: number;
  dividendYield?: number;
  roce?: number;
  roe?: number;
  debtToEquity?: number;
  eps?: number;
  profitGrowth5y?: number;
  revenueGrowth5y?: number;
  grossMargin?: number;
  netMargin?: number;
  promoterHolding?: number;
  fetchedAt: string;
}

function parseCrore(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "");
  const num = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  if (cleaned.includes("Cr") || cleaned.includes("cr")) return num * 10000000;
  if (cleaned.includes("Lac") || cleaned.includes("lac") || cleaned.includes("Lakh") || cleaned.includes("lakh")) return num * 100000;
  if (cleaned.includes("K") || cleaned.includes("k")) return num * 1000;
  return num;
}

function parsePercent(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "");
  const num = parseFloat(cleaned.replace(/[^0-9.\-]/g, ""));
  return isNaN(num) ? 0 : num;
}

async function fetchScreenerPage(symbol: string): Promise<string> {
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 301 || res.status === 302) {
    const loc = res.headers.get("location") || "";
    if (loc.includes("standalone")) {
      const r2 = await fetch(`https://www.screener.in/company/${symbol}/`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      return r2.ok ? r2.text() : "";
    }
  }

  return res.ok ? res.text() : "";
}

function parseFundamentals(html: string, symbol: string): ScreenerFundamentals {
  const result: ScreenerFundamentals = { symbol, fetchedAt: new Date().toISOString() };

  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                   .replace(/<[^>]+>/g, "\n")
                   .replace(/\n+/g, "\n");

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("Market Cap")) {
      result.marketCap = parseCrore(lines[i + 1] || "");
    }
    if (line.includes("Current Price") && !line.includes("Avg")) {
      result.currentPrice = parseFloat(lines[i + 1]?.replace(/[^0-9.]/g, "") || "0");
    }
    if (line.includes("High / Low")) {
      const parts = (lines[i + 1] || "").split("/");
      result.high52 = parseFloat(parts[0]?.replace(/[^0-9.]/g, "") || "0");
      result.low52 = parseFloat(parts[1]?.replace(/[^0-9.]/g, "") || "0");
    }
    if (line.startsWith("Stock P/E")) {
      result.pe = parseFloat(lines[i + 1]?.replace(/[^0-9.]/g, "") || "0");
    }
    if (line.includes("Book Value")) {
      result.bookValue = parseFloat(lines[i + 1]?.replace(/[^0-9.]/g, "") || "0");
    }
    if (line.includes("Dividend Yield")) {
      result.dividendYield = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("ROCE")) {
      result.roce = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("ROE")) {
      result.roe = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("Debt / Equity")) {
      const val = parseFloat(lines[i + 1]?.replace(/[^0-9.]/g, "") || "0");
      result.debtToEquity = isNaN(val) ? 0 : val;
    }
    if (line.includes("EPS")) {
      result.eps = parseFloat(lines[i + 1]?.replace(/[^0-9.]/g, "") || "0");
    }
    if (line.includes("Profit Growth") && line.includes("5 Years")) {
      result.profitGrowth5y = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("Revenue Growth") && line.includes("5 Years")) {
      result.revenueGrowth5y = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("Gross Margin")) {
      result.grossMargin = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("Net Margin")) {
      result.netMargin = parsePercent(lines[i + 1] || "");
    }
    if (line.includes("Promoter Holding")) {
      result.promoterHolding = parsePercent(lines[i + 1] || "");
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const outputFlag = args.indexOf("--output");
  let outputPath = "";
  if (outputFlag !== -1) {
    outputPath = args[outputFlag + 1] || "";
    args.splice(outputFlag, 2);
  }

  const allFlag = args.includes("--all");
  const symbols = allFlag
    ? ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "HINDUNILVR", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "WIPRO", "AXISBANK", "BAJFINANCE", "MARUTI", "TITAN", "ASIANPAINT", "SUNPHARMA", "NTPC", "ONGC", "POWERGRID", "M&M", "ULTRACEMCO", "TRENT", "HCLTECH", "BAJAJFINSV", "ADANIPORTS", "ADANIENT", "JSWSTEEL", "TATACONSUM", "HDFCLIFE", "SBILIFE", "TATAMOTORS", "NESTLEIND", "DMART", "PNB", "BRITANNIA", "COALINDIA", "IOC", "BPCL", "HINDALCO", "EICHERMOT", "DLF", "CIPLA", "BAJAJHLDNG", "DIVISLAB", "HEROMOTOCO", "GRASIM", "TECHM", "VEDL", "TORNTPHARM", "SIEMENS", "DRREDDY", "INDUSINDBK", "PIDILITIND", "AMBUJACEM", "JIOFIN", "BANKBARODA", "HAL", "BEL"]
    : args.filter(a => !a.startsWith("--"));

  if (symbols.length === 0) {
    console.error("Usage: npx tsx scripts/ingest-screener.ts [symbol1 symbol2 ...] --all --output ./path.json");
    process.exit(1);
  }

  const results: ScreenerFundamentals[] = [];

  for (const symbol of symbols) {
    process.stdout.write(`Fetching ${symbol}... `);
    try {
      const html = await fetchScreenerPage(symbol);
      if (!html) {
        console.log("SKIP (no page)");
        continue;
      }
      const data = parseFundamentals(html, symbol);
      results.push(data);
      console.log(`OK (MCap: ${data.marketCap ? "₹" + (data.marketCap / 10000000).toFixed(1) + "Cr" : "N/A"}, PE: ${data.pe || "N/A"})`);
    } catch (err: any) {
      console.log(`FAIL (${err.message?.slice(0, 50) || "error"})`);
    }

    if (symbols.length > 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const output = JSON.stringify(results, null, 2);

  if (outputPath) {
    const fs = await import("fs");
    const dir = outputPath.substring(0, outputPath.lastIndexOf("/"));
    if (dir) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, output, "utf-8");
    console.log(`\nWrote ${results.length} records to ${outputPath}`);
  } else {
    console.log(`\n${output}`);
  }

  console.log(`\nDone. ${results.length}/${symbols.length} symbols ingested.`);
}

main().catch(console.error);
