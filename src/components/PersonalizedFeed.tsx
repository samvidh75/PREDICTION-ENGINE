import { useMemo } from "react";
import { usePersonalizedFeed } from "../hooks/usePersonalizedFeed";
import { colors, space, radius, typography, layout } from "../design/tokens";

const COMPANY_NAMES: Record<string, string> = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  HDFCBANK: "HDFC Bank",
  INFY: "Infosys",
  ICICIBANK: "ICICI Bank",
  KOTAKBANK: "Kotak Mahindra Bank",
  SBIN: "State Bank of India",
  BHARTIARTL: "Bharti Airtel",
  ITC: "ITC Limited",
  WIPRO: "Wipro",
  HINDUNILVR: "Hindustan Unilever",
  MARUTI: "Maruti Suzuki India",
  TITAN: "Titan Company",
  ASIANPAINT: "Asian Paints",
  NTPC: "NTPC Limited",
  AXISBANK: "Axis Bank",
  BAJFINANCE: "Bajaj Finance",
  SUNPHARMA: "Sun Pharmaceutical Industries",
  HCLTECH: "HCL Technologies",
  POWERGRID: "Power Grid Corporation",
};

function TrendBadge({ trend }: { trend: string }) {
  const bg = trend === "rising" ? colors.marketGreen : trend === "decaying" ? colors.marketRed : colors.stone;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: radius.full,
        fontSize: typography.captionSm.size,
        background: bg,
        color: "#fff",
        fontWeight: 500,
      }}
    >
      {trend}
    </span>
  );
}

export default function PersonalizedFeed() {
  const { insights, topSymbols } = usePersonalizedFeed();

  const content = useMemo(() => {
    if (topSymbols.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: space[12],
            color: colors.mute,
            fontSize: typography.body.desktop.size,
          }}
        >
          Start exploring stocks to build your personalized feed
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        {insights.slice(0, 8).map((item) => (
          <div
            key={item.symbol}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${space[3]} ${space[4]}`,
              background: colors.surface,
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              borderRadius: radius.md,
              border: `1px solid ${colors.hairline}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: space[1] }}>
              <span style={{ fontWeight: 600, fontSize: typography.body.desktop.size, color: colors.ink }}>
                {item.symbol}
              </span>
              <span style={{ fontSize: typography.captionSm.size, color: colors.mute }}>
                {COMPANY_NAMES[item.symbol] || item.symbol}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <span style={{ fontSize: typography.captionSm.size, color: colors.mute }}>
                {item.interactionCount} interactions
              </span>
              <TrendBadge trend={item.trend} />
            </div>
          </div>
        ))}
      </div>
    );
  }, [insights, topSymbols]);

  return (
    <section style={{ marginTop: layout.sectionGapDesktop }}>
      <h2
        style={{
          fontSize: typography.h2.desktop.size,
          fontWeight: 600,
          color: colors.ink,
          margin: `0 0 ${space[6]} 0`,
        }}
      >
        Your Feed
      </h2>
      {content}
    </section>
  );
}
