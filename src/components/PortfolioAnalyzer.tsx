import { useEffect, useState } from "react";
import { colors, space, radius, typography } from "../design/tokens";
import { FeatureGate } from "../commercial/FeatureGate";
import { useEntitlements } from "../commercial/useEntitlements";
import { UpgradePrompt } from "../commercial/UpgradePrompt";

interface HoldingItem {
  ticker: string;
  currentShares: number;
  totalInvestedValue: number;
  avgBuyPrice: number;
}

interface AnalyzeResponse {
  userId: string;
  holdingsCount: number;
  summaryMatrix: HoldingItem[];
}

interface PortfolioAnalyzerProps {
  userId: string;
}

function PortfolioContent({ userId }: { userId: string }) {
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/portfolio/analyze/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load portfolio");
        return res.json() as Promise<AnalyzeResponse>;
      })
      .then((data) => {
        setHoldings(data.summaryMatrix ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Portfolio load failed");
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <p
        style={{
          textAlign: "center",
          color: colors.textTertiary,
          fontFamily: typography.fontFamily,
          fontSize: 12,
          padding: space[12],
        }}
      >
        Calculating portfolio asset metrics on device...
      </p>
    );
  }

  if (error) {
    return (
      <p
        style={{
          textAlign: "center",
          color: colors.danger,
          fontFamily: typography.fontFamily,
          fontSize: 12,
          padding: space[8],
        }}
      >
        {error}
      </p>
    );
  }

  const grandTotalInvestment = holdings.reduce(
    (sum, item) => sum + item.totalInvestedValue,
    0,
  );

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.xl,
        padding: space[5],
        display: "flex",
        flexDirection: "column",
        gap: space[5],
      }}
    >
      <div>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: colors.accentBlue,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: typography.fontFamily,
            margin: 0,
          }}
        >
          Active Asset Concentration Profile
        </h3>
        <p
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
            margin: `${space[1]} 0 0 0`,
          }}
        >
          Calculated over verified ledger transactions &middot; Total Capital:{" "}
          \u20b9{grandTotalInvestment.toLocaleString("en-IN")}
        </p>
      </div>

      {holdings.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            color: colors.textTertiary,
            fontFamily: typography.fontFamily,
            fontSize: 12,
            padding: space[6],
          }}
        >
          Your transaction ledger is empty. Log your first asset buy execution
          order.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
          {holdings.map((item) => {
            const allocationPct =
              grandTotalInvestment > 0
                ? ((item.totalInvestedValue / grandTotalInvestment) * 100).toFixed(1)
                : "0.0";

            return (
              <div
                key={item.ticker}
                style={{
                  background: colors.canvas,
                  borderRadius: radius.lg,
                  padding: space[3],
                  border: `1px solid ${colors.hairline}`,
                  fontFamily: typography.fontFamily,
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: space[2],
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 900,
                      color: colors.textSecondary,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.ticker}
                  </span>
                  <span style={{ color: colors.accentBlue, fontWeight: 700 }}>
                    {allocationPct}% Weight
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: colors.hairline,
                    borderRadius: radius.full,
                    overflow: "hidden",
                    border: `1px solid ${colors.hairline}`,
                  }}
                >
                  <div
                    style={{
                      width: `${allocationPct}%`,
                      height: "100%",
                      background: colors.accentBlue,
                      borderRadius: radius.full,
                      transition: "width 0.3s",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    fontSize: 10,
                    color: colors.textTertiary,
                    paddingTop: space[1],
                  }}
                >
                  <span>
                    Shares:{" "}
                    <strong style={{ color: colors.textSecondary }}>
                      {item.currentShares}
                    </strong>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    Avg Cost:{" "}
                    <strong style={{ color: colors.textSecondary }}>
                      \u20b9{item.avgBuyPrice}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PortfolioAnalyzer({ userId }: PortfolioAnalyzerProps) {
  return (
    <FeatureGate
      feature="portfolio_tracking"
      fallback={
        <UpgradePrompt
          feature="portfolio_tracking"
          requiredTier="pro"
        />
      }
    >
      <PortfolioContent userId={userId} />
    </FeatureGate>
  );
}
