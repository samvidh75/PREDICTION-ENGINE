import type { VercelRequest, VercelResponse } from '@vercel/node'

const CACHE = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL = 60_000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol
  const symbol = String(rawSymbol ?? '').toUpperCase().trim()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  const cached = CACHE.get(symbol)
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT')
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    return res.status(200).json(cached.data)
  }

  const INDIAN_KEY = process.env.INDIANAPI_KEY ?? ''
  const timeout = (ms: number, label: string) =>
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms))

  const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    try { return await Promise.race([fn(), timeout(7000, label)]) }
    catch { return null }
  }

  const [price, screener, historical] = await Promise.all([

    safe('price', async () => {
      if (!INDIAN_KEY) return null
      const url = `https://indian-stock-market-api2.p.rapidapi.com/stock?name=${symbol}`
      const r = await fetch(url, { headers: {
        'X-RapidAPI-Key': INDIAN_KEY,
        'X-RapidAPI-Host': 'indian-stock-market-api2.p.rapidapi.com'
      }})
      return r.ok ? r.json() : null
    }),

    safe('screener', async () => {
      const r = await fetch(`https://www.screener.in/api/company/${symbol}/`, {
        headers: { Accept: 'application/json',
                   'User-Agent': 'Mozilla/5.0 StockStory/2.0' }
      })
      return r.ok ? r.json() : null
    }),

    safe('historical', async () => {
      const ticker = `${symbol}.NS`
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 StockStory/2.0' }
      })
      if (!r.ok) return null
      const d = await r.json()
      const result = d?.chart?.result?.[0]
      if (!result) return null
      return {
        closes:     result.indicators?.quote?.[0]?.close?.filter(Boolean) ?? [],
        highs:      result.indicators?.quote?.[0]?.high?.filter(Boolean)  ?? [],
        lows:       result.indicators?.quote?.[0]?.low?.filter(Boolean)   ?? [],
        timestamps: result.timestamp ?? [],
      }
    }),
  ])

  const priceData = {
    current:    price?.currentPrice ?? price?.price ?? null,
    change:     price?.percentChange ?? price?.pChange ?? null,
    changeAbs:  price?.change ?? null,
    open:       price?.open ?? null,
    high:       price?.dayHigh ?? null,
    low:        price?.dayLow ?? null,
    volume:     price?.volume ?? null,
    weekHigh52: price?.['52WeekHigh'] ?? price?.yearHigh ?? null,
    weekLow52:  price?.['52WeekLow']  ?? price?.yearLow  ?? null,
    marketCap:  price?.marketCap ?? null,
    exchange:   price?.exchange  ?? 'NSE',
    companyName:price?.companyName ?? price?.name ?? symbol,
    sector:     price?.sector ?? null,
    error:      price ? null : 'price_unavailable',
  }

  const ratios  = screener?.ratios  ?? {}
  const cgSales = screener?.compoundedSalesGrowth  ?? {}
  const cgProfit= screener?.compoundedProfitGrowth ?? {}

  const fundamentals = {
    peRatio:        toNum(ratios['Stock P/E']),
    pbRatio:        toNum(ratios['Price to Book']),
    roe:            toNum(ratios['Return on equity']),
    roce:           toNum(ratios['ROCE']),
    dividendYield:  toNum(ratios['Dividend Yield']),
    eps:            toNum(ratios['EPS in Rs']),
    debtToEquity:   toNum(ratios['Debt to equity']),
    currentRatio:   toNum(ratios['Current ratio']),
    revenueGrowth:  toNum(cgSales['3 Years']),
    profitGrowth:   toNum(cgProfit['3 Years']),
    marketCap:      toNum(ratios['Market Cap']),
    error:          screener ? null : 'fundamentals_unavailable',
  }

  const historicalData = {
    closes:     historical?.closes     ?? [],
    highs:      historical?.highs      ?? [],
    lows:       historical?.lows       ?? [],
    timestamps: historical?.timestamps ?? [],
    error:      historical ? null : 'historical_unavailable',
  }

  const completeness = computeCompleteness(priceData, fundamentals, historicalData)

  const result = {
    symbol,
    price:        priceData,
    fundamentals,
    historical:   historicalData,
    dataCompleteness: completeness,
    fetchedAt:    new Date().toISOString(),
    errors:       [priceData.error, fundamentals.error, historicalData.error]
                    .filter(Boolean),
  }

  CACHE.set(symbol, { data: result, expiresAt: Date.now() + CACHE_TTL })

  res.setHeader('X-Cache', 'MISS')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
  return res.status(200).json(result)
}

function toNum(v: any): number | null {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function computeCompleteness(p: any, f: any, h: any): number {
  const fields = [p.current, p.change, f.peRatio, f.roe, f.roce,
                  f.debtToEquity, f.revenueGrowth, f.eps,
                  h.closes.length > 0 ? 1 : null]
  return Math.round(fields.filter(x => x !== null).length / fields.length * 100)
}
