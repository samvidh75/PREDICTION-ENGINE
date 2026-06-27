import { Compass, Shield, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";

const DISCOVER = [
  { icon: TrendingUp, title: "Quality Compounders", body: "High return businesses with durable operating discipline." },
  { icon: Compass, title: "Undervalued", body: "Research companies trading below their sector context." },
  { icon: Sparkles, title: "Momentum", body: "Follow strength supported by improving participation." },
  { icon: Shield, title: "Low Risk", body: "Surface steadier balance sheets and calmer price behavior." },
] as const;

const RECENT = ["HDFCBANK", "TCS", "INFY", "RELIANCE", "ICICIBANK", "LT"] as const;

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const sectionGap = useResponsiveValue("48px", "80px");
  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&limit=5`);
      const payload = await response.json();
      if (!cancelled) {
        setSearchResults((payload.results ?? []).map((item: { symbol: string; name: string }) => ({
          symbol: item.symbol,
          name: item.name,
        })));
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{ display: "grid", gap: sectionGap }}>
      <section
        style={{
          paddingTop: sectionGap,
          paddingBottom: sectionGap,
          display: "grid",
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", display: "grid", gap: "24px" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            <h1
              style={{
                color: "var(--text-primary)",
                fontSize: "var(--sz-3xl)",
                fontWeight: 600,
                lineHeight: "1.1",
                letterSpacing: "-0.02em",
              }}
            >
              Research Indian stocks before you invest.
            </h1>
            <p
              style={{
                color: "var(--text-500)",
                fontSize: "var(--sz-base)",
                fontWeight: 400,
                lineHeight: "1.6",
              }}
            >
              Build conviction with calmer research flows, cleaner comparisons, and the key numbers that changed.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <input
              aria-label="Search stocks"
              placeholder="Search HDFCBANK, TCS, Infosys"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) {
                  navigate(`/stock/${searchResults[0].symbol}`);
                }
              }}
              style={{
                height: "52px",
                minWidth: "240px",
                flex: "1 1 280px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                padding: "0 16px",
                color: "var(--text-700)",
                background: "var(--page)",
              }}
            />
            <Button onClick={() => navigate(`/stock/${searchResults[0]?.symbol ?? "HDFCBANK"}`)}>Research</Button>
          </div>
          {searchResults.length > 0 ? (
            <div style={{ display: "grid", gap: "8px", textAlign: "left" }}>
              {searchResults.map((result) => (
                <button
                  key={result.symbol}
                  onClick={() => navigate(`/stock/${result.symbol}`)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--chip)",
                    padding: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <span>{result.symbol}</span>
                  <span style={{ color: "var(--text-500)" }}>{result.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section style={{ display: "grid", gap: "24px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "var(--sz-2xl)", fontWeight: 600, lineHeight: "1.25" }}>
          Discover opportunities
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
          }}
        >
          {DISCOVER.map((item) => (
            <Card key={item.title}>
              <div style={{ display: "grid", gap: "12px" }}>
                <item.icon color="var(--brand)" size={20} strokeWidth={1.75} />
                <h3 style={{ color: "var(--text-primary)", fontSize: "var(--sz-lg)", fontWeight: 600, lineHeight: "1.3" }}>
                  {item.title}
                </h3>
                <p style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", fontWeight: 400, lineHeight: "1.6" }}>
                  {item.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: "24px" }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "var(--sz-2xl)", fontWeight: 600, lineHeight: "1.25" }}>
          Recently researched
        </h2>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
          {RECENT.map((symbol) => (
            <Button key={symbol} variant="secondary" onClick={() => navigate(`/stock/${symbol}`)}>
              {symbol}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
