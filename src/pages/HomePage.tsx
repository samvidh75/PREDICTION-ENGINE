import { useEffect, useState } from "react"
import { Search, TrendingUp, Bookmark, Eye, BarChart3, Award, GitCompare } from "lucide-react"
import TopNav from "../components/layout/TopNav"
import MarketTicker from "../components/layout/MarketTicker"
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse"
import { navigate } from "../components/product/routeConfig"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const TOP_TRACKED = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "ITC"]

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
            paddingTop: 40,
            paddingBottom: 24,
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
            Search any Nifty 50 company for insights
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
              background: "#FFFFFF",
              padding: "0 4px 0 16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Search
              size={18}
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol — TCS, RELIANCE, HDFCBANK..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 15,
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
            { label: "Scanner", icon: BarChart3, page: "scanner" },
            { label: "Rankings", icon: Award, page: "rankings" },
            { label: "Compare", icon: GitCompare, page: "compare" },
            { label: "Watchlist", icon: Bookmark, page: "watchlist" },
          ].map((action) => (
            <button
              key={action.page}
              onClick={() => navigate(action.page)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 20px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "#FFFFFF",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                boxShadow: "var(--shadow-sm)",
              }}
              className="hover:shadow-md transition-shadow duration-150 active:scale-[0.97]"
            >
              <action.icon size={16} style={{ color: "var(--action)" }} />
              {action.label}
            </button>
          ))}
        </section>

        {/* Grid: featured stock + recently viewed */}
        <div
          className="grid md:grid-cols-2"
          style={{ gap: 16, paddingBottom: 32 }}
        >
          {/* Explore companies */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "var(--shadow-sm)",
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
              <TrendingUp size={16} style={{ color: "var(--text-muted)" }} />
              Explore companies
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOP_TRACKED.map((symbol) => (
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
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    View &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recently viewed */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "var(--shadow-sm)",
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    background: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 100,
                    boxShadow: "var(--shadow-sm)",
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
                    background: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 100,
                    boxShadow: "var(--shadow-sm)",
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
