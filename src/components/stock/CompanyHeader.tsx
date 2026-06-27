interface CompanyHeaderProps {
  symbol: string;
  companyName: string;
  price: number | null;
  change: number | null;
  changeAbs: number | null;
  exchange: string;
  sector: string | null;
  isMobile: boolean;
}

export default function CompanyHeader({
  symbol, companyName, price, change, changeAbs, exchange, sector, isMobile,
}: CompanyHeaderProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, marginBottom: 12,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--text-300)",
              background: "var(--chip)", borderRadius: 4, padding: "4px 8px",
              letterSpacing: "0.05em",
            }}>
              {exchange}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-300)" }}>{symbol}</span>
            {sector && (
              <>
                <span style={{ fontSize: 11, color: "var(--text-300)" }}>\u00B7</span>
                <span style={{
                  fontSize: "var(--sz-xs)", fontWeight: 700,
                  padding: "4px 8px", borderRadius: "var(--r-pill)",
                  background: "var(--chip)", color: "var(--text-500)",
                }}>
                  {sector}
                </span>
              </>
            )}
          </div>
          <h1 style={{
            fontSize: isMobile ? 28 : "var(--sz-2xl)",
            fontWeight: 800, color: "var(--text-900)",
            letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0,
          }}>
            {companyName}
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button style={{
            height: 40, padding: "0 16px", borderRadius: "var(--r-md)",
            background: "var(--surface)", color: "var(--text-500)",
            border: "1px solid var(--border)", fontSize: 14,
            fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            \u2661 Track
          </button>
          <a href={`/compare?stocks=${symbol}`} style={{
            height: 40, padding: "0 16px", borderRadius: "var(--r-md)",
            background: "var(--surface)", color: "var(--text-500)",
            border: "1px solid var(--border)", fontSize: 14,
            fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
            textDecoration: "none", lineHeight: 1,
          }}>
            \u2295 Compare
          </a>
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: "var(--sz-4xl)", fontWeight: 800,
            letterSpacing: "-0.03em", color: "var(--text-900)",
            lineHeight: 1, marginBottom: 8,
          }}>
            {price !== null
              ? `\u20B9${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : <span className="skeleton" style={{ width: 180, height: 48, display: "inline-block", borderRadius: "var(--r-sm)" }} />
            }
          </div>
          {change !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: "var(--sz-base)", fontWeight: 700,
                color: isPositive ? "var(--green)" : "var(--red)",
              }}>
                {isPositive ? "\u25B2" : "\u25BC"} {isPositive ? "+" : ""}\u20B9{Math.abs(change).toFixed(2)}
                {changeAbs !== null ? ` (${isPositive ? "+" : ""}${changeAbs.toFixed(2)}%)` : ""}
              </span>
            </div>
          )}
        </div>

        <button onClick={() => {}} style={{
          height: 44, padding: "0 24px", borderRadius: "var(--r-md)",
          background: "var(--brand)", color: "var(--text-inverse)",
          border: "none", fontSize: 14, fontWeight: 600,
          cursor: "pointer", fontFamily: "var(--font)",
          display: "flex", alignItems: "center", gap: 8,
          whiteSpace: "nowrap",
        }}>
          Invest via broker \u2192
        </button>
      </div>
    </div>
  );
}
