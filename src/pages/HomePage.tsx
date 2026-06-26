import { useState } from "react"
import { Search, Bookmark, Eye, BarChart3, GitCompare, Shield } from "lucide-react"
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse"
import { navigate } from "../components/product/routeConfig"

const DISCOVER = [
  { title: "Quality Compounders", desc: "High ROE · Low debt · Growth", icon: "📊" },
  { title: "Undervalued Gems", desc: "PE below fair value", icon: "💎" },
  { title: "Momentum Movers", desc: "RSI strength · MACD signal", icon: "⚡" },
  { title: "Low Risk Steady", desc: "Debt-free · Stable returns", icon: "🛡" },
]

const QUICK_ACTIONS = [
  { label: "Scanner", icon: BarChart3, page: "scanner" },
  { label: "Compare", icon: GitCompare, page: "compare" },
  { label: "Watchlist", icon: Bookmark, page: "watchlist" },
  { label: "Methodology", icon: Shield, page: "methodology" },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const [recent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("stockstory-recent") || "[]") } catch { return [] }
  })
  const [tracked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("stockstory-tracked") || "[]") } catch { return [] }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim().toUpperCase()
    if (q) navigate("stock", q)
  }

  return (
    <div style={{ minHeight: "100vh", maxWidth: 860 }}>

      {/* Hero */}
      <section style={{ paddingTop: 48, paddingBottom: 32, textAlign: "center" }}>
        <h1 style={{
          fontSize: 32, fontWeight: 800, color: "var(--text-900)",
          letterSpacing: "-0.6px", margin: 0, lineHeight: 1.2,
          fontFamily: "var(--font)",
        }}>
          Research Indian stocks
        </h1>
        <p style={{
          fontSize: 16, color: "var(--text-500)", marginTop: 10,
          maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5,
        }}>
          Institutional-grade analysis on Nifty 50 companies
        </p>

        <form onSubmit={handleSearch} style={{
          display: "flex", alignItems: "center", gap: 0, maxWidth: 520,
          margin: "24px auto 0",
          border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)",
          background: "#fff", overflow: "hidden",
          boxShadow: "var(--sh-raised)",
        }}>
          <Search size={16} style={{ color: "var(--text-300)", flexShrink: 0, marginLeft: 14 }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search — TCS, HDFC Bank, Reliance…"
            style={{
              flex: 1, border: "none", background: "transparent",
              color: "var(--text-900)", fontSize: 15, outline: "none",
              padding: "13px 12px", minWidth: 0, fontFamily: "var(--font)",
            }}
          />
          <button type="submit" style={{
            height: 48, padding: "0 20px", borderRadius: 0, border: "none",
            borderLeft: "1px solid var(--border)",
            background: "var(--brand)", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            whiteSpace: "nowrap", fontFamily: "var(--font)",
            flexShrink: 0,
          }}>
            Research
          </button>
        </form>
      </section>

      {/* Quick action pills */}
      <section className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 32 }}>
        {QUICK_ACTIONS.map((action) => (
          <button key={action.page} onClick={() => navigate(action.page)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, height: 36,
            padding: "0 16px", borderRadius: "var(--r-pill)",
            border: "1px solid var(--border-strong)",
            background: "#fff", color: "var(--text-700)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
            fontFamily: "var(--font)",
          }}>
            <action.icon size={14} style={{ color: "var(--brand)" }} />
            {action.label}
          </button>
        ))}
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 32 }} />

      {/* Discover opportunities */}
      <section style={{ paddingBottom: 40 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: "var(--text-900)",
          margin: "0 0 16px", letterSpacing: "-0.3px",
          fontFamily: "var(--font)",
        }}>
          Discover opportunities
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {DISCOVER.map((lens) => (
            <button key={lens.title} onClick={() => navigate("scanner")} style={{
              padding: "20px 16px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border)", background: "#fff",
              cursor: "pointer", textAlign: "left",
              transition: "background var(--t-fast)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <div style={{ fontSize: 22, marginBottom: 10, lineHeight: 1 }}>{lens.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-900)", marginBottom: 4, fontFamily: "var(--font)" }}>
                {lens.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-500)", lineHeight: 1.4 }}>{lens.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 32 }} />

      {/* Recently viewed */}
      <section style={{ paddingBottom: 32 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: "var(--text-900)",
          margin: "0 0 16px", letterSpacing: "-0.3px",
          fontFamily: "var(--font)",
        }}>
          {recent.length > 0 ? "Recently viewed" : "Popular stocks"}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(recent.length > 0 ? recent.slice(0, 8) : NIFTY50_SYMBOLS.slice(0, 8)).map((symbol) => (
            <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
              padding: "10px 16px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border)", background: "#fff",
              cursor: "pointer", fontFamily: "var(--font)",
              transition: "background var(--t-fast)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-900)" }}>{symbol}</div>
              <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>Research →</div>
            </button>
          ))}
        </div>
      </section>

      {/* Tracked companies (only if user has any) */}
      {tracked.length > 0 && (
        <section style={{ paddingBottom: 40 }}>
          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 32 }} />
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: "var(--text-900)",
            margin: "0 0 16px", letterSpacing: "-0.3px",
            fontFamily: "var(--font)",
          }}>
            Tracked
          </h2>
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {tracked.map((symbol) => (
              <button key={symbol} onClick={() => navigate("stock", symbol)} style={{
                flexShrink: 0, padding: "12px 16px", borderRadius: "var(--r-md)",
                border: "1px solid var(--border)", background: "#fff",
                cursor: "pointer", textAlign: "left", minWidth: 100,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-900)" }}>{symbol}</div>
                <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>Research →</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "24px 0", marginTop: 8 }}>
        <p style={{ fontSize: 11, color: "var(--text-300)", lineHeight: 1.6, margin: 0 }}>
          {'© 2025 StockStory India · Not SEBI-registered · Not investment advice · For educational purposes only'}
        </p>
      </div>
    </div>
  )
}
