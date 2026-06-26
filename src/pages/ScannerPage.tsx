import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse"
import { useStockData } from "../hooks/useStockData"
import type { StockData } from "../hooks/useStockData"
import { UnifiedPredictionEngine } from "../prediction-engine/UnifiedPredictionEngine"
import type { EngineOutput } from "../prediction-engine/UnifiedPredictionEngine"
import { fChange } from "../lib/format"
import { navigate } from "../components/product/routeConfig"
import ProUpgradeModal from "../components/ProUpgradeModal"

type ScanRow = { data: StockData; prediction: EngineOutput }

const displayNames: Record<string, string> = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  HDFCBANK: "HDFC Bank",
  INFY: "Infosys",
  ICICIBANK: "ICICI Bank",
  SUNPHARMA: "Sun Pharma",
  HINDUNILVR: "Hindustan Unilever",
  SBIN: "State Bank of India",
  ITC: "ITC Limited",
  BHARTIARTL: "Bharti Airtel",
}

const inputFor = (data: StockData) => ({
  peRatio: data.fundamentals.peRatio,
  pbRatio: data.fundamentals.pbRatio,
  roe: data.fundamentals.roe,
  roce: data.fundamentals.roce,
  debtToEquity: data.fundamentals.debtToEquity,
  currentRatio: data.fundamentals.currentRatio,
  revenueGrowth: data.fundamentals.revenueGrowth,
  profitGrowth: data.fundamentals.profitGrowth,
  dividendYield: data.fundamentals.dividendYield,
  closes: data.historical.closes,
})

/** Score → conviction label + color (Stripe palette) */
function conviction(score: number | null): { label: string; color: string; bg: string } {
  if (score === null) return { label: "No data", color: "#999999", bg: "#F5F5F5" }
  if (score >= 75) return { label: "High conviction", color: "#0A8C2A", bg: "#E8F9ED" }
  if (score >= 50) return { label: "Neutral",         color: "#D48806", bg: "#FFFBE6" }
  return              { label: "Risk rising",         color: "#CF1322", bg: "#FFF1F0" }
}

const PRESETS = [
  "Quality compounders",
  "Undervalued quality",
  "Improving momentum",
  "Low debt leaders",
  "Earnings acceleration",
  "Dividend stability",
  "Turnaround watch",
  "Risk rising",
]

const CLASS_OPTIONS = [
  { value: "All",         label: "All" },
  { value: "EXCELLENT",  label: "High conviction" },
  { value: "HEALTHY",    label: "Conviction" },
  { value: "STABLE",     label: "Neutral" },
  { value: "WEAKENING",  label: "Watch" },
  { value: "AT_RISK",    label: "Risk rising" },
]

/* ── shared input style ─────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  height: 40,
  border: "1px solid #D9D9D9",
  borderRadius: 6,
  background: "#FFFFFF",
  color: "#111111",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 200ms ease",
}

export default function ScannerPage() {
  const [rows,        setRows]        = useState<ScanRow[]>([])
  const [loading,     setLoading]     = useState(false)
  const [loaded,      setLoaded]      = useState(0)
  const [query,       setQuery]       = useState("")
  const [page,        setPage]        = useState(1)
  const [classFilter, setClassFilter] = useState("All")
  const [activePreset,setActivePreset]= useState<string | null>(null)
  const [proOpen,     setProOpen]     = useState(false)

  const runScan = useCallback(async () => {
    setLoading(true); setRows([]); setLoaded(0)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const next: ScanRow[] = []
    for (let start = 0; start < NIFTY50_SYMBOLS.length; start += 5) {
      const batch = NIFTY50_SYMBOLS.slice(start, start + 5)
      const results = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const res = await fetch(`/api/stock/${symbol}`, { signal: controller.signal, cache: "no-cache" })
            await new Promise(r => setTimeout(r, 200))
            if (!res.ok) return null
            const text = await res.text()
            if (!text || text.length < 10) return null
            const data = JSON.parse(text) as StockData
            if (!data.symbol && !data.price?.companyName) return null
            return { data, prediction: UnifiedPredictionEngine.predict(inputFor(data)) }
          } catch { return null }
        })
      )
      next.push(...results.filter((r): r is ScanRow => r !== null))
      setRows([...next])
      setLoaded(Math.min(start + batch.length, NIFTY50_SYMBOLS.length))
    }
    clearTimeout(timeout)
    setLoading(false)
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [])

  useEffect(() => { void runScan() }, [runScan])

  const ranked = useMemo(() => {
    let f = rows
    if (query) {
      const q = query.toLowerCase()
      f = f.filter(r => r.data.symbol.toLowerCase().includes(q) || (r.data.price.companyName || "").toLowerCase().includes(q))
    }
    if (classFilter !== "All") f = f.filter(r => r.prediction.classification === classFilter)
    return [...f].sort((a, b) => (b.prediction.composite ?? -1) - (a.prediction.composite ?? -1))
  }, [rows, query, classFilter])

  const visible    = ranked.slice((page - 1) * 10, page * 10)
  const pageCount  = Math.max(1, Math.ceil(ranked.length / 10))
  const exportCSV  = () => {
    const csv = ["Rank,Symbol,Company,Rating,Conviction,Price,Change",
      ...ranked.map((r, i) => [
        i + 1, r.data.symbol,
        `"${r.data.price.companyName || displayNames[r.data.symbol] || r.data.symbol}"`,
        r.prediction.composite ?? "",
        conviction(r.prediction.composite).label,
        r.data.price.current ?? "",
        fChange(r.data.price.change),
      ].join(","))
    ].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "stockstory-scan.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <main style={{ padding: "0 4px" }}>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 32, paddingBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.5px", margin: 0, color: "#111111", lineHeight: 1.2 }}>
              Scanner
            </h1>
            <p style={{ fontSize: 14, color: "#666666", margin: "4px 0 0", lineHeight: 1.5 }}>
              Nifty 50 — scored across quality, valuation, growth, risk & momentum
            </p>
          </div>
          <button
            onClick={exportCSV}
            style={{
              height: 40, padding: "0 16px",
              borderRadius: 6, border: "1px solid #D9D9D9",
              background: "#FFFFFF", color: "#333333",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 200ms ease",
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* ── Preset filter chips ───────────────────────────────────────── */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 20 }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setActivePreset(activePreset === p ? null : p)}
              style={{
                height: 32, padding: "0 12px",
                borderRadius: 9999,
                border: activePreset === p ? "1px solid #0070F3" : "1px solid #E5E5E5",
                background: activePreset === p ? "#E6F0FE" : "#FFFFFF",
                color: activePreset === p ? "#0070F3" : "#666666",
                fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
                transition: "all 200ms ease",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, paddingBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999", pointerEvents: "none" }} />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search company or symbol…"
              style={{ ...inputStyle, width: "100%", paddingLeft: 36, paddingRight: 12, boxSizing: "border-box" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#0070F3")}
              onBlur={e  => (e.currentTarget.style.borderColor = "#D9D9D9")}
            />
          </div>
          <select
            value={classFilter}
            onChange={e => { setClassFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, padding: "0 12px", minWidth: 160 }}
          >
            {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ── Desktop table ─────────────────────────────────────────────── */}
        <div className="hidden md:block" style={{ borderRadius: 8, border: "1px solid #E5E5E5", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5F5F5", borderBottom: "1px solid #E5E5E5" }}>
                {["#", "Company", "Rating", "Conviction", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "10px 16px", fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "#999999", textAlign: i === 2 ? "right" : "left",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, idx) => {
                const score = row.prediction.composite
                const cv    = conviction(score)
                const name  = row.data.price.companyName || displayNames[row.data.symbol] || row.data.symbol
                const chg   = row.data.price.change ?? 0
                return (
                  <tr
                    key={row.data.symbol}
                    onClick={() => navigate("stock", row.data.symbol)}
                    style={{ cursor: "pointer", borderBottom: "1px solid #E5E5E5", transition: "background 150ms ease" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Rank */}
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 400, color: "#999999", width: 40 }}>
                      {(page - 1) * 10 + idx + 1}
                    </td>

                    {/* Company */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111111" }}>{row.data.symbol}</div>
                      <div style={{ fontSize: 12, color: "#666666", marginTop: 1 }}>{name}</div>
                    </td>

                    {/* Rating (score) */}
                    <td style={{ padding: "14px 16px", textAlign: "right", width: 100 }}>
                      <span style={{
                        fontSize: 20, fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: cv.color,
                      }}>
                        {score ?? "—"}
                      </span>
                      <span style={{ fontSize: 11, color: "#999", marginLeft: 2 }}>/100</span>
                      <div style={{
                        fontSize: 11, color: chg >= 0 ? "#0A8C2A" : "#CF1322",
                        fontWeight: 600, marginTop: 1, textAlign: "right",
                      }}>
                        {fChange(chg)}
                      </div>
                    </td>

                    {/* Conviction badge */}
                    <td style={{ padding: "14px 16px", width: 160 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "3px 10px", borderRadius: 9999,
                        background: cv.bg, color: cv.color,
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {cv.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "14px 16px", textAlign: "right", width: 90 }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate("stock", row.data.symbol) }}
                        style={{
                          height: 32, padding: "0 12px",
                          borderRadius: 6, border: "1px solid #E5E5E5",
                          background: "#FFFFFF", color: "#333333",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          transition: "background 150ms ease",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
                      >
                        Research
                      </button>
                    </td>
                  </tr>
                )
              })}

              {/* Loading row */}
              {loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#999999", fontSize: 14 }}>
                    {loaded === 0
                      ? "Loading Nifty 50 data…"
                      : `Loading ${loaded} / ${NIFTY50_SYMBOLS.length} stocks…`}
                  </td>
                </tr>
              )}

              {/* Empty row */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#999999", fontSize: 14 }}>
                    No data available. Try again later.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ──────────────────────────────────────────────── */}
        <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 24 }}>
          {loading && ranked.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#999999", fontSize: 14 }}>
              Scanning Nifty 50…
            </div>
          )}
          {visible.map((row, idx) => {
            const score = row.prediction.composite
            const cv    = conviction(score)
            const name  = row.data.price.companyName || displayNames[row.data.symbol] || row.data.symbol
            const chg   = row.data.price.change ?? 0
            return (
              <div
                key={row.data.symbol}
                onClick={() => navigate("stock", row.data.symbol)}
                style={{
                  background: "#FFFFFF", border: "1px solid #E5E5E5",
                  borderRadius: 8, padding: 16, cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  transition: "box-shadow 150ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Rank */}
                  <span style={{ fontSize: 12, color: "#999999", fontWeight: 400, minWidth: 20, paddingTop: 2 }}>
                    {(page - 1) * 10 + idx + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row: symbol + score */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "#111111" }}>{row.data.symbol}</span>
                        <span style={{ fontSize: 11, color: chg >= 0 ? "#0A8C2A" : "#CF1322", fontWeight: 600, marginLeft: 8 }}>
                          {fChange(chg)}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 20, fontWeight: 600, color: cv.color, fontVariantNumeric: "tabular-nums" }}>
                          {score ?? "—"}
                        </span>
                        <span style={{ fontSize: 10, color: "#999", marginLeft: 1 }}>/100</span>
                      </div>
                    </div>

                    {/* Company name */}
                    <div style={{ fontSize: 12, color: "#666666", marginTop: 2 }}>{name}</div>

                    {/* Conviction badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        padding: "3px 10px", borderRadius: 9999,
                        background: cv.bg, color: cv.color,
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {cv.label}
                      </span>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={e => { e.stopPropagation(); navigate("stock", row.data.symbol) }}
                          style={{
                            height: 30, padding: "0 12px",
                            borderRadius: 6, border: "1px solid #E5E5E5",
                            background: "#FFFFFF", color: "#333333",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Research
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); navigate("compare", row.data.symbol) }}
                          style={{
                            height: 30, padding: "0 12px",
                            borderRadius: 6, border: "1px solid #E5E5E5",
                            background: "#FFFFFF", color: "#333333",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {pageCount > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "16px 0", alignItems: "center" }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                height: 36, padding: "0 16px",
                borderRadius: 6, border: "1px solid #E5E5E5",
                background: "#FFFFFF", color: page === 1 ? "#999" : "#111",
                fontSize: 14, cursor: page === 1 ? "default" : "pointer",
                fontWeight: 600, opacity: page === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 13, color: "#666666", minWidth: 90, textAlign: "center" }}>
              {page} / {pageCount}
            </span>
            <button
              disabled={page === pageCount}
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              style={{
                height: 36, padding: "0 16px",
                borderRadius: 6, border: "1px solid #E5E5E5",
                background: "#FFFFFF", color: page === pageCount ? "#999" : "#111",
                fontSize: 14, cursor: page === pageCount ? "default" : "pointer",
                fontWeight: 600, opacity: page === pageCount ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* ── Pro CTA ───────────────────────────────────────────────────── */}
        {!loading && rows.length >= 5 && (
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <button
              onClick={() => setProOpen(true)}
              style={{ background: "none", border: "none", color: "#0070F3", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Unlock all results with Pro →
            </button>
          </div>
        )}

      </main>

      <ProUpgradeModal open={proOpen} onClose={() => setProOpen(false)} location="scanner" />
    </div>
  )
}
