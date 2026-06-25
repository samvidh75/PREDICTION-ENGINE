import { useEffect, useMemo, useState } from "react"
import { Search, TrendingUp, Bookmark, Eye } from "lucide-react"
import TopNav from "../components/layout/TopNav"
import MarketTicker from "../components/layout/MarketTicker"
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse"
import { useStockData } from "../hooks/useStockData"
import { UnifiedPredictionEngine } from "../prediction-engine/UnifiedPredictionEngine"
import ScoreRing from "../components/ui/ScoreRing"
import { fChange, fPrice } from "../lib/format"
import { navigate } from "../components/product/routeConfig"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const { data, loading } = useStockData("HDFCBANK")
  const prediction = useMemo(
    () =>
      data
        ? UnifiedPredictionEngine.predict({
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
        : null,
    [data]
  )

  const [recent] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("stockstory-recent") || "[]"
      return JSON.parse(stored)
    } catch {
      return []
    }
  })

  const [tracked] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("stockstory-tracked") || "[]"
      return JSON.parse(stored)
    } catch {
      return []
    }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim().toUpperCase()
    if (q) navigate("stock", q)
  }

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
        {/* Hero */}
        <section
          style={{
            paddingTop: 48,
            paddingBottom: 32,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              margin: 0,
              lineHeight: 1.2,
            }}
            className="md:text-[32px]"
          >
            What do you want to research?
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              marginTop: 8,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Search any Nifty 50 company for research insights
          </p>
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              marginTop: 20,
              height: 48,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              padding: "0 4px 0 16px",
            }}
          >
            <Search
              size={18}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search — TCS, RELIANCE, HDFCBANK..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--action)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Research
            </button>
          </form>
        </section>

        {/* Quick actions */}
        <section
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 24,
          }}
        >
          {[
            { label: "Scanner", page: "scanner" },
            { label: "Rankings", page: "rankings" },
            { label: "Compare", page: "compare" },
            { label: "Watchlist", page: "watchlist" },
          ].map((action) => (
            <button
              key={action.page}
              onClick={() => navigate(action.page)}
              style={{
                height: 40,
                padding: "0 20px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {action.label}
            </button>
          ))}
        </section>

        {/* Grid: featured stock + recently viewed */}
        <div
          className="grid md:grid-cols-2"
          style={{ gap: 16, paddingBottom: 32 }}
        >
          {/* Featured stock */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--text-primary)",
                  }}
                >
                  HDFCBANK
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  HDFC Bank Ltd.
                </div>
              </div>
              <Bookmark
                size={18}
                style={{
                  marginLeft: "auto",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              />
            </div>
            {loading ? (
              <div
                style={{
                  height: 120,
                  borderRadius: 8,
                  background: "var(--elevated)",
                  animation: "shimmer 2s linear infinite",
                  backgroundImage:
                    "linear-gradient(90deg, var(--surface) 0%, var(--elevated) 50%, var(--surface) 100%)",
                  backgroundSize: "200% 100%",
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ScoreRing
                  score={prediction?.composite ?? null}
                  size={88}
                  showLabel
                />
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {(
                    [
                      ["Quality", prediction?.factorScores.quality.score],
                      ["Growth", prediction?.factorScores.growth.score],
                      ["Valuation", prediction?.factorScores.valuation.score],
                      ["Risk", prediction?.factorScores.stability.score],
                      ["Momentum", prediction?.factorScores.momentum.score],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 64,
                          flexShrink: 0,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: "var(--elevated)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            width: `${value ?? 0}%`,
                            background: "var(--positive)",
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: 28,
                          textAlign: "right",
                          fontSize: 12,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--text-primary)",
                        }}
                      >
                        {value ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => navigate("stock", "HDFCBANK")}
              style={{
                width: "100%",
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--action)",
                cursor: "pointer",
                background: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: "none",
              }}
            >
              View Full Research &rarr;
            </button>
          </div>

          {/* Recently viewed */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                margin: 0,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Eye size={16} style={{ color: "var(--text-muted)" }} />
              Recently viewed
            </h2>
            {recent.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {["TCS", "RELIANCE", "INFY"].map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => navigate("stock", symbol)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span>{symbol}</span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                      }}
                    >
                      View &rarr;
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recent.slice(0, 5).map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => navigate("stock", symbol)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span>{symbol}</span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                      }}
                    >
                      View &rarr;
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tracked companies */}
        <section style={{ paddingBottom: 32 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              margin: 0,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bookmark size={16} style={{ color: "var(--text-muted)" }} />
            Tracked companies
          </h2>
          {tracked.length > 0 ? (
            <div
              className="no-scrollbar"
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
              }}
            >
              {tracked.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => navigate("stock", symbol)}
                  style={{
                    flexShrink: 0,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 100,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {symbol}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Research &rarr;
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="no-scrollbar"
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
              }}
            >
              {NIFTY50_SYMBOLS.slice(0, 8).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => navigate("stock", symbol)}
                  style={{
                    flexShrink: 0,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 100,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {symbol}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Research &rarr;
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
