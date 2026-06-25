import { useState } from "react"
import { Search, TrendingUp, Bookmark, Eye, BarChart3, GitCompare, Shield } from "lucide-react"
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
    } catch { return [] }
  })

  const [tracked] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("stockstory-tracked") || "[]"
      return JSON.parse(stored)
    } catch { return [] }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim().toUpperCase()
    if (q) navigate("stock", q)
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <MarketTicker />

      {/* Hero search */}
      <section style={{ paddingTop: 32, paddingBottom: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2 }}>
          What do you want to research?
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 8, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          Search any Nifty 50 company for insights
        </p>
        <form onSubmit={handleSearch} style={{
          display: "flex", alignItems: "center", gap: 8, maxWidth: 480,
          margin: "20px auto 0", height: 52, borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)", background: "var(--bg-card)",
          boxShadow: "var(--shadow-raised)", padding: "0 4px 0 16px",
        }}>
          <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search stocks — TCS, HDFC Bank, Reliance…"
            style={{ flex: 1, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 15, outline: "none", minWidth: 0 }}
          />
          <button type="submit" style={{
            height: 36, padding: "0 16px", borderRadius: "var(--radius-md)", border: "none",
            background: "var(--brand)", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Research
          </button>
        </form>
      </section>

      {/* Quick action pills */}
      <section className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 24 }}>
        {[
          { label: "Scanner", icon: BarChart3, page: "scanner" },
          { label: "Compare", icon: GitCompare, page: "compare" },
          { label: "Watchlist", icon: Bookmark, page: "watchlist" },
          { label: "Methodology", icon: Shield, page: "methodology" },
        ].map((action) => (
          <button key={action.page} onClick={() => navigate(action.page)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, height: 40,
            padding: "0 20px", borderRadius: 100, border: "1px solid var(--border)",
            background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 13,
            fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            boxShadow: "var(--shadow-card)",
          }}>
            <action.icon size={16} style={{ color: "var(--brand)" }} />
            {action.label}
          </button>
        ))}
      </section>

      {/* AI Research Lenses */}
      <section style={{ paddingBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
          Discover opportunities
        </h2>
        <div className="no-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto" }}>
          {[
            { title: "Quality Compounders", desc: "Strong fundamentals, consistent growth", icon: "★" },
            { title: "Undervalued Gems", desc: "Trading below intrinsic value", icon: "▼" },
            { title: "Momentum Movers", desc: "Strong price momentum", icon: "▲" },
            { title: "Low Risk Steady", desc: "Stable returns, low volatility", icon: "●" },
          ].map((lens) => (
            <button key={lens.title} onClick={() => navigate("scanner")} style={{
              flexShrink: 0, minWidth: 180, padding: "16px 20px", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer",
              textAlign: "left", boxShadow: "var(--shadow-card)",
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{lens.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{lens.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{lens.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Recently researched + Explore grid */}
      <div className="grid md:grid-cols-2" style={{ gap: 16, paddingBottom: 32 }}>
        {/* Explore companies */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", boxShadow: "var(--shadow-card)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <TrendingUp size={16} style={{ color: "var(--text-muted)" }} />
            Explore companies
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TOP_TRACKED.map((symbol) => (
              <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>
                <span>{symbol}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>View →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recently viewed */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", boxShadow: "var(--shadow-card)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Eye size={16} style={{ color: "var(--text-muted)" }} />
            Recently viewed
          </h2>
          {recent.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
              Your recent research will appear here
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.slice(0, 5).map((symbol) => (
                <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)", background: "transparent",
                  color: "var(--text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>
                  <span>{symbol}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>View →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tracked companies */}
      <section style={{ paddingBottom: 32 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
          <Bookmark size={16} style={{ color: "var(--text-muted)" }} />
          Tracked companies
        </h2>
        {tracked.length > 0 ? (
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {tracked.map((symbol) => (
              <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
                flexShrink: 0, padding: "12px 16px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)", background: "var(--bg-card)",
                cursor: "pointer", textAlign: "left", minWidth: 100, boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{symbol}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Research →</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {NIFTY50_SYMBOLS.slice(0, 8).map((symbol) => (
              <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
                flexShrink: 0, padding: "12px 16px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)", background: "var(--bg-card)",
                cursor: "pointer", textAlign: "left", minWidth: 100, boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{symbol}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Research →</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "24px 0", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          © 2025 StockStory India · Research-first investor tool · Not SEBI-registered · Not investment advice · For educational purposes only
        </p>
      </div>
    </div>
  )
}
