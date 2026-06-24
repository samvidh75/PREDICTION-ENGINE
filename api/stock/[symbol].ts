import type { VercelRequest, VercelResponse } from "@vercel/node";

type ProviderPayload = Record<string, unknown> & { _error?: string };

const providerTimeout = (ms: number): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

async function safeProvider(
  label: string,
  operation: () => Promise<ProviderPayload>,
): Promise<ProviderPayload> {
  try {
    return await Promise.race([operation(), providerTimeout(7_000)]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { _error: `${label}: ${message}` };
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[,%₹\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol)
    ? req.query.symbol[0]
    : req.query.symbol;
  const symbol = String(rawSymbol || "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const indianApiKey = process.env.INDIANAPI_KEY || "";
  const [priceData, fundamentalData, historicalData] = await Promise.all([
    safeProvider("price", async () => {
      if (!indianApiKey) return { _error: "price: INDIANAPI_KEY not configured" };
      const response = await fetch(
        `https://indian-stock-market-api2.p.rapidapi.com/stock?name=${encodeURIComponent(symbol)}`,
        {
          headers: {
            "X-RapidAPI-Key": indianApiKey,
            "X-RapidAPI-Host": "indian-stock-market-api2.p.rapidapi.com",
          },
        },
      );
      if (!response.ok) return { _error: `price HTTP ${response.status}` };
      return (await response.json()) as ProviderPayload;
    }),
    safeProvider("screener", async () => {
      const response = await fetch(
        `https://www.screener.in/api/company/${encodeURIComponent(symbol)}/`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) return { _error: `screener HTTP ${response.status}` };
      return (await response.json()) as ProviderPayload;
    }),
    safeProvider("historical", async () => {
      const ticker = `${symbol}.NS`;
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      if (!response.ok) return { _error: `yahoo HTTP ${response.status}` };
      const payload = (await response.json()) as {
        chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
      };
      const result = payload.chart?.result?.[0];
      return {
        closes: (result?.indicators?.quote?.[0]?.close ?? []).filter(
          (close): close is number => typeof close === "number" && Number.isFinite(close),
        ),
        timestamps: result?.timestamp ?? [],
      };
    }),
  ]);

  const price = {
    current: asNumber(priceData.currentPrice ?? priceData.price),
    change: asNumber(priceData.percentChange ?? priceData.pChange),
    changeAbs: asNumber(priceData.change),
    open: asNumber(priceData.open),
    high: asNumber(priceData.dayHigh ?? priceData.high),
    low: asNumber(priceData.dayLow ?? priceData.low),
    volume: asNumber(priceData.volume),
    weekHigh52: asNumber(priceData["52WeekHigh"] ?? priceData.yearHigh),
    weekLow52: asNumber(priceData["52WeekLow"] ?? priceData.yearLow),
    marketCap: asNumber(priceData.marketCap),
    exchange: typeof priceData.exchange === "string" ? priceData.exchange : "NSE",
    companyName:
      typeof (priceData.companyName ?? priceData.name) === "string"
        ? String(priceData.companyName ?? priceData.name)
        : symbol,
    sector: typeof priceData.sector === "string" ? priceData.sector : null,
    source: priceData._error ? "unavailable" : "indianapi",
    priceError: priceData._error ?? null,
  };

  const ratios =
    fundamentalData.ratios && typeof fundamentalData.ratios === "object"
      ? (fundamentalData.ratios as Record<string, unknown>)
      : {};
  const salesGrowth = fundamentalData.compoundedSalesGrowth as Record<string, unknown> | undefined;
  const profitGrowth = fundamentalData.compoundedProfitGrowth as Record<string, unknown> | undefined;
  const fundamentals = {
    peRatio: asNumber(ratios["Stock P/E"]),
    pbRatio: asNumber(ratios["Price to Book"]),
    roe: asNumber(ratios["Return on equity"]),
    roce: asNumber(ratios.ROCE),
    debtToEquity: asNumber(ratios["Debt to equity"]),
    currentRatio: asNumber(ratios["Current ratio"]),
    dividendYield: asNumber(ratios["Dividend Yield"]),
    eps: asNumber(ratios["EPS in Rs"]),
    revenueGrowth: asNumber(salesGrowth?.["3 Years"]),
    profitGrowth: asNumber(profitGrowth?.["3 Years"]),
    netMargin: null as number | null,
    operatingMargin: null as number | null,
    marketCap: asNumber(ratios["Market Cap"]) ?? price.marketCap,
    fundamentalSource: fundamentalData._error ? "unavailable" : "screener",
    fundamentalError: fundamentalData._error ?? null,
  };

  const closes = Array.isArray(historicalData.closes)
    ? historicalData.closes.filter((value): value is number => typeof value === "number")
    : [];
  const timestamps = Array.isArray(historicalData.timestamps)
    ? historicalData.timestamps.filter((value): value is number => typeof value === "number")
    : [];
  const historical = {
    closes,
    timestamps,
    source: historicalData._error ? "unavailable" : "yahoo",
    error: historicalData._error ?? null,
  };

  const completenessFields = [
    price.current,
    price.change,
    fundamentals.peRatio,
    fundamentals.roe,
    fundamentals.debtToEquity,
    fundamentals.revenueGrowth,
    fundamentals.eps,
    historical.closes.length > 0 ? 1 : null,
  ];
  const dataCompleteness = Math.round(
    (completenessFields.filter((field) => field !== null).length /
      completenessFields.length) *
      100,
  );

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
  return res.status(200).json({
    symbol,
    price,
    fundamentals,
    historical,
    dataCompleteness,
    fetchedAt: new Date().toISOString(),
    errors: [price.priceError, fundamentals.fundamentalError, historical.error].filter(Boolean),
  });
}
