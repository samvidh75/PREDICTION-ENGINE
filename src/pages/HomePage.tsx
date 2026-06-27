import { Compass, Shield, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, space, layout, media } from "../design/tokens";

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
  const sectionGap = useResponsiveValue(layout.sectionGapMobile, layout.sectionGapDesktop);

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
      {/* HERO */}
      <section
        style={{
          display: "grid",
          justifyItems: "center",
          textAlign: "center",
          paddingTop: layout.pagePaddingDesktop,
          paddingBottom: layout.pagePaddingDesktop,
        }}
      >
        <div style={{ maxWidth: "640px", display: "grid", gap: space[6] }}>
          <div style={{ display: "grid", gap: space[4] }}>
            <h1
              style={{
                color: colors.textPrimary,
                fontSize: typography.hero.desktop.size,
                fontWeight: typography.hero.desktop.weight,
                lineHeight: typography.hero.desktop.line,
                letterSpacing: typography.hero.desktop.track,
              }}
            >
              Research Indian stocks before you invest.
            </h1>
            <p
              style={{
                color: colors.textSecondary,
                fontSize: typography.body.desktop.size,
                fontWeight: 400,
                lineHeight: typography.body.desktop.line,
              }}
            >
              Build conviction with calmer research flows, cleaner comparisons, and the key numbers that changed.
            </p>
          </div>
          <div style={{ display: "flex", gap: space[3], flexWrap: "wrap", justifyContent: "center" }}>
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
                height: "44px",
                minWidth: "240px",
                flex: "1 1 280px",
                borderRadius: "10px",
                border: `1px solid ${colors.border}`,
                padding: "0 16px",
                fontSize: typography.body.desktop.size,
                color: colors.textPrimary,
                background: colors.card,
                outline: "none",
              }}
            />
            <Button onClick={() => navigate(`/stock/${searchResults[0]?.symbol ?? "HDFCBANK"}`)}>Research</Button>
          </div>
          {searchResults.length > 0 ? (
            <div style={{ display: "grid", gap: space[2], textAlign: "left" }}>
              {searchResults.map((result) => (
                <button
                  key={result.symbol}
                  onClick={() => navigate(`/stock/${result.symbol}`)}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: "10px",
                    background: colors.card,
                    padding: `${space[3]} ${space[4]}`,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: space[3],
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{result.symbol}</span>
                  <span style={{ color: colors.textSecondary }}>{result.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* DISCOVER */}
      <section style={{ display: "grid", gap: space[6] }}>
        <h2
          style={{
            color: colors.textPrimary,
            fontSize: typography.h1.desktop.size,
            fontWeight: typography.h1.desktop.weight,
            lineHeight: typography.h1.desktop.line,
            letterSpacing: typography.h1.desktop.track,
          }}
        >
          Discover opportunities
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: space[6],
          }}
        >
          {DISCOVER.map((item) => (
            <Card key={item.title}>
              <div style={{ display: "grid", gap: space[4] }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(0,122,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <item.icon color={colors.primary} size={18} strokeWidth={1.75} />
                </div>
                <h3
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.h3.desktop.size,
                    fontWeight: typography.h3.desktop.weight,
                    lineHeight: typography.h3.desktop.line,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.body.desktop.size,
                    fontWeight: 400,
                    lineHeight: typography.body.desktop.line,
                  }}
                >
                  {item.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* RECENT */}
      <section style={{ display: "grid", gap: space[6] }}>
        <h2
          style={{
            color: colors.textPrimary,
            fontSize: typography.h1.desktop.size,
            fontWeight: typography.h1.desktop.weight,
            lineHeight: typography.h1.desktop.line,
            letterSpacing: typography.h1.desktop.track,
          }}
        >
          Recently researched
        </h2>
        <div style={{ display: "flex", gap: space[3], overflowX: "auto", paddingBottom: space[2] }}>
          {RECENT.map((symbol) => (
            <Button key={symbol} variant="secondary" onClick={() => navigate(`/stock/${symbol}`)}>
              {symbol}
            </Button>
          ))}
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media ${media.mobile} {
          h1 { font-size:${typography.hero.mobile.size} !important; }
          h2 { font-size:${typography.h1.mobile.size} !important; }
        }
      `}</style>
    </div>
  );
}
