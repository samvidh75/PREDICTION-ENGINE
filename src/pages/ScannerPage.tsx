import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import TopNav from "../components/layout/TopNav"
import MarketTicker from "../components/layout/MarketTicker"
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse"
import { useStockData } from "../hooks/useStockData"
import type { StockData } from "../hooks/useStockData"
import { UnifiedPredictionEngine } from "../prediction-engine/UnifiedPredictionEngine"
import type { EngineOutput } from "../prediction-engine/UnifiedPredictionEngine"
import { getScoreColor } from "../components/ui/ScoreRing"
import { fChange, fPrice } from "../lib/format"
import { navigate } from "../components/product/routeConfig"

type ScanRow = { data: StockData; prediction: EngineOutput }

const displayNames: Record<string, string> = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  HDFCBANK: "HDFC Bank Ltd.",
  INFY: "Infosys Limited",
  ICICIBANK: "ICICI Bank Ltd.",
  SUNPHARMA: "Sun Pharmaceutical Industries",
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

const signal: Record<string, [string, string]> = {
  EXCELLENT: ["High conviction", "var(--positive)"],
  HEALTHY: ["Conviction", "var(--positive)"],
  STABLE: ["Neutral", "var(--caution)"],
  WEAKENING: ["Watch", "var(--caution)"],
  AT_RISK: ["Risk rising", "var(--negative)"],
  INSUFFICIENT_DATA: ["—", "var(--text-muted)"],
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

const CLASS_FILTER_OPTIONS = [
  { value: "All", label: "All classifications" },
  { value: "Excellent", label: "High conviction" },
  { value: "Healthy", label: "Conviction" },
  { value: "Stable", label: "Neutral" },
  { value: "Weakening", label: "Watch" },
  { value: "At Risk", label: "Risk rising" },
]

function getKeyReason(prediction: EngineOutput): string {
  const factors = prediction.factorScores
  const entries = [
    factors.quality,
    factors.growth,
    factors.valuation,
    factors.stability,
    factors.momentum,
  ]
  const best = entries.reduce((a, b) =>
    (a.score ?? 0) >= (b.score ?? 0) ? a : b
  )
  const short = best.reason?.split("·")[0]?.trim() || "—"
  return short
}

function getRiskLabel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "—", color: "var(--text-muted)" }
  if (score >= 70) return { label: "Low", color: "var(--positive)" }
  if (score >= 50) return { label: "Moderate", color: "var(--caution)" }
  return { label: "Elevated", color: "var(--negative)" }
}

export default function ScannerPage() {
  const [rows, setRows] = useState<ScanRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(0)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [classFilter, setClassFilter] = useState("All")
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const runScan = useCallback(async () => {
    setLoading(true)
    setRows([])
    setLoaded(0)
    const controller = new AbortController()
    const next: ScanRow[] = []
    for (let start = 0; start < NIFTY50_SYMBOLS.length; start += 5) {
      const batch = NIFTY50_SYMBOLS.slice(start, start + 5)
      const results = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const response = await fetch(`/api/stock/${symbol}`, {
              signal: controller.signal,
            })
            if (!response.ok) return null
            const data = (await response.json()) as StockData
            return { data, prediction: UnifiedPredictionEngine.predict(inputFor(data)) }
          } catch {
            return null
          }
        })
      )
      next.push(...results.filter((row): row is ScanRow => row !== null))
      setRows([...next])
      setLoaded(Math.min(start + batch.length, NIFTY50_SYMBOLS.length))
    }
    setLoading(false)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    void runScan()
  }, [runScan])

  const ranked = useMemo(() => {
    let filtered = rows
    if (query) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (row) =>
          row.data.symbol.toLowerCase().includes(q) ||
          (row.data.price.companyName || "").toLowerCase().includes(q)
      )
    }
    if (classFilter !== "All") {
      const target = classFilter.toUpperCase().replace(/\s+/g, "_")
      filtered = filtered.filter(
        (row) => row.prediction.classification === target
      )
    }
    return [...filtered].sort(
      (a, b) => (b.prediction.composite ?? -1) - (a.prediction.composite ?? -1)
    )
  }, [rows, query, classFilter])

  const visible = ranked.slice((page - 1) * 10, page * 10)
  const pageCount = Math.max(1, Math.ceil(ranked.length / 10))

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        color: "var(--text-primary)",
      }}
    >
      <TopNav />
      <MarketTicker />
      <main style={{ maxWidth: "var(--content)", margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            paddingBottom: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              AI Stock Scanner
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "4px 0 0",
              }}
            >
              Nifty 50 &middot; Ranked by conviction score
            </p>
          </div>
          <div className="hidden md:flex" style={{ gap: 8 }}>
            <button
              onClick={() => {
                const csv = [
                  "Rank,Symbol,Company,Conviction,Price,Change",
                  ...ranked.map((row, i) =>
                    [
                      i + 1,
                      row.data.symbol,
                      row.data.price.companyName ||
                        displayNames[row.data.symbol] ||
                        row.data.symbol,
                      row.prediction.composite,
                      row.data.price.current,
                      fChange(row.data.price.change),
                    ].join(",")
                  ),
                ].join("\n")
                const link = document.createElement("a")
                link.href = URL.createObjectURL(
                  new Blob([csv], { type: "text/csv" })
                )
                link.download = "stockstory-scan.csv"
                link.click()
                URL.revokeObjectURL(link.href)
              }}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Preset chips */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 16,
          }}
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() =>
                setActivePreset(activePreset === preset ? null : preset)
              }
              style={{
                height: 32,
                padding: "0 14px",
                borderRadius: 20,
                border:
                  activePreset === preset
                    ? "none"
                    : "1px solid var(--border)",
                background:
                  activePreset === preset ? "var(--action)" : "var(--surface)",
                color:
                  activePreset === preset
                    ? "#FFFFFF"
                    : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div
          className="flex flex-col md:flex-row"
          style={{ gap: 12, paddingBottom: 16 }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search for a company..."
              style={{
                width: "100%",
                height: 40,
                paddingLeft: 36,
                paddingRight: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value)
              setPage(1)
            }}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
              minWidth: 180,
            }}
          >
            {CLASS_FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop results table */}
        <div
          className="hidden md:block"
          style={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {[
                  "Rank",
                  "Company",
                  "Sector",
                  "Conviction",
                  "Key Reason",
                  "Risk",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--text-muted)",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => {
                const score = row.prediction.composite
                const [signalText, signalColor] =
                  signal[row.prediction.classification]
                const risk = getRiskLabel(
                  row.prediction.factorScores.stability.score
                )
                const reason = getKeyReason(row.prediction)
                const company =
                  row.data.price.companyName ||
                  displayNames[row.data.symbol] ||
                  row.data.symbol
                return (
                  <tr
                    key={row.data.symbol}
                    onClick={() => navigate("stock", row.data.symbol)}
                    className="hover:bg-[rgba(148,163,184,0.04)]"
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                      }}
                    >
                      {(page - 1) * 10 + index + 1}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.data.symbol}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginTop: 2,
                        }}
                      >
                        {company}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {row.data.price.sector || "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            color: getScoreColor(score),
                          }}
                        >
                          {score ?? "—"}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: signalColor,
                          }}
                        >
                          {signalText}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        maxWidth: 220,
                      }}
                    >
                      <span
                        className="truncate block"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {reason}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: risk.color,
                        }}
                      >
                        {risk.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("stock", row.data.symbol)
                        }}
                        style={{
                          height: 28,
                          padding: "0 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Research
                      </button>
                    </td>
                  </tr>
                )
              })}
              {loading && visible.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    Scanning Nifty 50 stocks...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div
            className="hidden md:flex"
            style={{
              justifyContent: "center",
              gap: 8,
              padding: "16px 0",
              alignItems: "center",
            }}
          >
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color:
                  page === 1 ? "var(--text-muted)" : "var(--text-primary)",
                fontSize: 12,
                cursor: page === 1 ? "default" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Page {page} of {pageCount}
            </span>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color:
                  page === pageCount
                    ? "var(--text-muted)"
                    : "var(--text-primary)",
                fontSize: 12,
                cursor: page === pageCount ? "default" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}

        {/* Mobile result cards */}
        <div
          className="md:hidden"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingBottom: 24,
          }}
        >
          {loading && ranked.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              Scanning Nifty 50 stocks...
            </div>
          )}
          {visible.map((row, index) => {
            const score = row.prediction.composite
            const [signalText, signalColor] =
              signal[row.prediction.classification]
            const risk = getRiskLabel(
              row.prediction.factorScores.stability.score
            )
            const company =
              row.data.price.companyName ||
              displayNames[row.data.symbol] ||
              row.data.symbol
            return (
              <div
                key={row.data.symbol}
                onClick={() => navigate("stock", row.data.symbol)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      minWidth: 20,
                    }}
                  >
                    {(page - 1) * 10 + index + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: "var(--text-primary)",
                          }}
                        >
                          {row.data.symbol}
                        </span>
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            color: getScoreColor(score),
                            marginLeft: 12,
                          }}
                        >
                          {score ?? "—"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: signalColor,
                        }}
                      >
                        {signalText}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {company}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        marginTop: 8,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{row.data.price.sector || "—"}</span>
                      <span style={{ fontWeight: 600, color: risk.color }}>
                        Risk: {risk.label}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            (row.data.price.change ?? 0) >= 0
                              ? "var(--positive)"
                              : "var(--negative)",
                        }}
                      >
                        {fChange(row.data.price.change)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 6,
                      }}
                    >
                      {getKeyReason(row.prediction)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("stock", row.data.symbol)
                        }}
                        style={{
                          height: 30,
                          padding: "0 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Research
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("compare", row.data.symbol)
                        }}
                        style={{
                          height: 30,
                          padding: "0 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Compare
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("watchlist", row.data.symbol)
                        }}
                        style={{
                          height: 30,
                          padding: "0 12px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Track
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            padding: "24px 0 32px",
            fontSize: 10,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Research scores are for educational purposes only. Not investment
          advice.
          <br />
          StockStory India is not SEBI-registered. Consult a SEBI-registered
          adviser.
        </div>
      </main>
    </div>
  )
}
