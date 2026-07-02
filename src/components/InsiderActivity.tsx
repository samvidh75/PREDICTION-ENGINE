/**
 * InsiderActivity — displays insider trading disclosures from BSE/NSE.
 * 
 * Shows: transaction type (buy/sell), value, persona (promoter/director/KMP),
 * conviction impact assessment, and SEBI filing date.
 * 
 * Spec ref: Section "Insider Activity Tracker"
 */

import { useState } from "react";
import { TrendingUp, TrendingDown, FileText, Info } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";

interface InsiderTransaction {
  id: string;
  date: string;          // SEBI filing date
  persona: string;       // "Promoter", "Director", "KMP", "Promoter Group"
  name: string;
  type: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  totalValue: number;    // in crores
  convictionSignal: "strong-bullish" | "bullish" | "neutral" | "bearish" | "strong-bearish";
  reason?: string;       // SEBI-filed reason
}

// Mock data — production fetches from BSE/NSE bulk deal APIs
const MOCK_INSIDER_DATA: InsiderTransaction[] = [
  {
    id: "ins-1",
    date: "2025-06-15",
    persona: "Promoter",
    name: "Ramesh Agarwal",
    type: "buy",
    shares: 500000,
    pricePerShare: 342.50,
    totalValue: 17.13,
    convictionSignal: "strong-bullish",
    reason: "Confidence in company's growth trajectory",
  },
  {
    id: "ins-2",
    date: "2025-06-10",
    persona: "Director",
    name: "Priya Sharma",
    type: "buy",
    shares: 25000,
    pricePerShare: 338.75,
    totalValue: 0.85,
    convictionSignal: "bullish",
    reason: "Personal investment",
  },
  {
    id: "ins-3",
    date: "2025-05-28",
    persona: "KMP",
    name: "Vikram Patel",
    type: "sell",
    shares: 15000,
    pricePerShare: 345.00,
    totalValue: 0.52,
    convictionSignal: "neutral",
    reason: "Personal financial planning",
  },
  {
    id: "ins-4",
    date: "2025-05-15",
    persona: "Promoter Group",
    name: "Agarwal Family Trust",
    type: "sell",
    shares: 200000,
    pricePerShare: 330.00,
    totalValue: 6.60,
    convictionSignal: "bearish",
    reason: "Portfolio rebalancing",
  },
];

const SIGNAL_CONFIG: Record<InsiderTransaction["convictionSignal"], { label: string; color: string; bg: string }> = {
  "strong-bullish": { label: "Strong Bullish", color: colors.marketGreen, bg: colors.marketGreenSoft },
  bullish: { label: "Bullish", color: colors.marketGreen, bg: colors.marketGreenSoft },
  neutral: { label: "Neutral", color: colors.marketOrange, bg: colors.marketOrangeSoft },
  bearish: { label: "Bearish", color: colors.marketRed, bg: colors.marketRedSoft },
  "strong-bearish": { label: "Strong Bearish", color: colors.marketRed, bg: colors.marketRedSoft },
};

function formatCrores(value: number): string {
  if (value >= 1) return `₹${value.toFixed(1)} Cr`;
  return `₹${(value * 100).toFixed(0)} L`;
}

function formatShares(shares: number): string {
  if (shares >= 100000) return `${(shares / 100000).toFixed(1)}L`;
  if (shares >= 1000) return `${(shares / 1000).toFixed(0)}K`;
  return shares.toString();
}

export function InsiderActivity() {
  const [showAll, setShowAll] = useState(false);
  const transactions = showAll ? MOCK_INSIDER_DATA : MOCK_INSIDER_DATA.slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={16} color={colors.textSecondary} />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: colors.textPrimary }}>
            Insider Filings
          </h3>
        </div>
        {MOCK_INSIDER_DATA.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              background: "none",
              border: "none",
              color: colors.accentRed,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {showAll ? "Show less" : `View all (${MOCK_INSIDER_DATA.length})`}
          </button>
        )}
      </div>

      {/* Transaction list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {transactions.map((txn) => {
          const signal = SIGNAL_CONFIG[txn.convictionSignal];
          return (
            <div
              key={txn.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: colors.surface,
                borderRadius: radius.md,
                border: `1px solid ${colors.hairline}`,
                transition: `all ${animation.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.surfaceElevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.surface;
              }}
            >
              {/* Type indicator */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.sm,
                  background: txn.type === "buy" ? colors.marketGreenSoft : colors.marketRedSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {txn.type === "buy" ? (
                  <TrendingUp size={16} color={colors.marketGreen} />
                ) : (
                  <TrendingDown size={16} color={colors.marketRed} />
                )}
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: colors.textPrimary }}>
                    {txn.name}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: colors.textSecondary,
                      background: colors.surfaceCard,
                      padding: "1px 6px",
                      borderRadius: radius.full,
                    }}
                  >
                    {txn.persona}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                  {txn.type === "buy" ? "Bought" : "Sold"}{" "}
                  {formatShares(txn.shares)} shares @ ₹{txn.pricePerShare} ·{" "}
                  {formatCrores(txn.totalValue)}
                </div>
                {txn.reason && (
                  <div style={{ fontSize: "11px", color: colors.textTertiary, marginTop: "2px", fontStyle: "italic" }}>
                    "{txn.reason}"
                  </div>
                )}
              </div>

              {/* Signal badge */}
              <div
                style={{
                  padding: "3px 10px",
                  borderRadius: radius.full,
                  background: signal.bg,
                  color: signal.color,
                  fontSize: "11px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {signal.label}
              </div>

              {/* Date */}
              <div style={{ fontSize: "11px", color: colors.textTertiary, whiteSpace: "nowrap" }}>
                {new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div
        style={{
          marginTop: "12px",
          padding: "8px 12px",
          background: colors.surface,
          borderRadius: radius.sm,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "11px",
          color: colors.textTertiary,
        }}
      >
        <Info size={12} />
        Insider filings are shown as part of the research view.
      </div>
    </div>
  );
}
