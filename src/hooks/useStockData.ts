import { useState, useEffect, useCallback, useRef } from 'react'

interface StockData {
  symbol: string
  price: {
    current: number | null; change: number | null; changeAbs: number | null
    open: number | null; high: number | null; low: number | null
    volume: number | null; weekHigh52: number | null; weekLow52: number | null
    marketCap: number | null; exchange: string; companyName: string
    sector: string | null; industry: string | null; description: string | null
    website: string | null; error: string | null
  }
  fundamentals: {
    peRatio: number | null; pbRatio: number | null
    roe: number | null; roce: number | null
    dividendYield: number | null; eps: number | null
    debtToEquity: number | null; currentRatio: number | null
    revenueGrowth: number | null; profitGrowth: number | null
    marketCap: number | null; error: string | null
  }
  health: {
    score: number | null; classification: string | null
    confidence: { level: string; score: number } | null
    sector: string | null
  } | null
  historical: {
    closes: number[]; highs: number[]
    lows: number[]; timestamps: number[]
    error: string | null
  }
  dataCompleteness: number
  fetchedAt: string
  errors: string[]
}

const memCache = new Map<string, { data: StockData; ts: number }>()
const CACHE_MS = 60_000

export function useStockData(symbol: string | null) {
  const [data, setData]       = useState<StockData | null>(() => {
    if (!symbol) return null
    const c = memCache.get(symbol)
    return (c && Date.now() - c.ts < CACHE_MS) ? c.data : null
  })
  const [loading, setLoading] = useState(!data)
  const [error, setError]     = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (sym: string) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    try {
      const r = await fetch(`/api/stock/${sym}`, {
        signal: abortRef.current.signal,
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d: StockData = await r.json()
      memCache.set(sym, { data: d, ts: Date.now() })
      setData(d)
      setError(null)
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!symbol) return
    const cached = memCache.get(symbol)
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setData(cached.data)
      setLoading(false)
      return
    }
    fetch_(symbol)
    return () => { abortRef.current?.abort() }
  }, [symbol, fetch_])

  return { data, loading, error, refetch: () => symbol && fetch_(symbol) }
}

export type { StockData }
export default useStockData
