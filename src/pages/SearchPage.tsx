import { useEffect, useMemo, useState } from "react"
import { NIFTY50_SYMBOLS, SYMBOL_DISPLAY_MAP } from "../services/universe/StockUniverse"
import { useStockData } from "../hooks/useStockData"
import { navigate } from "../components/product/routeConfig"
import TopNav from "../components/layout/TopNav"
import MarketTicker from "../components/layout/MarketTicker"

export default function SearchPage() {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || ""
    setQuery(q)
  }, [])

  const matched = useMemo(() => {
    if (!query.trim()) return []
    const ql = query.toLowerCase()
    return NIFTY50_SYMBOLS.filter((sym: string) => {
      const name = (SYMBOL_DISPLAY_MAP[sym] || sym).toLowerCase()
      return sym.toLowerCase().includes(ql) || name.includes(ql)
    }).slice(0, 20)
  }, [query])

  return (
    <div style={{ background: "#F3F4F6", minHeight: "100vh" }}>
      <TopNav />
      <MarketTicker />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ padding: "24px 0 16px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", margin: 0, color: "#0F172A" }}>
            Search Companies
          </h1>
          <div style={{ marginTop: 16, position: "relative" }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && query.trim()) {
                  window.history.replaceState({}, "", `/search?q=${encodeURIComponent(query.trim())}`)
                }
              }}
              placeholder="Search by company name or symbol..."
              style={{
                width: "100%", height: 48, padding: "0 16px", borderRadius: 10,
                border: "1px solid #E5E7EB", fontSize: 15, outline: "none",
                background: "#FFFFFF", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {query.trim() && matched.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
            No matching companies found.
            <div style={{ marginTop: 8, fontSize: 13 }}>Try another company or open the scanner.</div>
          </div>
        )}

        {!query.trim() && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
            Enter a company name or symbol to search.
          </div>
        )}

        {matched.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 24 }}>
            {matched.map((sym: string) => (
              <SearchResultRow key={sym} symbol={sym} displayName={SYMBOL_DISPLAY_MAP[sym] || sym} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function SearchResultRow({ symbol, displayName }: { symbol: string; displayName: string }) {
  const { data } = useStockData(symbol)
  const price = data?.price?.current ?? null
  const health = data?.health?.score ?? null
  const healthClass = data?.health?.classification ?? null
  const industry = data?.price?.industry ?? null
  const pe = data?.fundamentals?.peRatio ?? null

  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 12, padding: 16,
      border: "1px solid #E5E7EB", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#64748B",
            background: "rgba(148,163,184,0.08)", border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 4, padding: "1px 6px",
          }}>
            {symbol}
          </span>
          {industry && <span style={{ fontSize: 11, color: "#64748B" }}>{industry}</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A" }}>{displayName}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#64748B" }}>
          {price !== null && <span>₹{price.toFixed(2)}</span>}
          {pe !== null && <span>P/E {pe.toFixed(1)}x</span>}
          {health !== null && healthClass && <span>{healthClass} ({health})</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => navigate("stock", symbol)}
          style={{ height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#FFFFFF", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer" }}>
          Research
        </button>
        <button onClick={() => navigate("compare", symbol)}
          style={{ height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#FFFFFF", fontSize: 12, fontWeight: 600, color: "#0F172A", cursor: "pointer" }}>
          Compare
        </button>
      </div>
    </div>
  )
}
