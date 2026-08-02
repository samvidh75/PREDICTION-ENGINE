/**
 * SimilarStocks — factor-based peer discovery via Euclidean distance.
 * 
 * Uses PeerComparisonEngine for similarity computation.
 * Shows: top 5 similar stocks with factor overlap %, key differentiator,
 * and quick compare CTA.
 * 
 * Spec ref: Section "Similar Stocks" — factor-based similarity.
 */

import { useState } from "react";
import { GitBranch, ArrowRight, ChevronRight } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";
import { ConvictionBadge, scoreToConviction } from "../ui/ConvictionBadge";
import { formatNumber } from "../services/ui/dataFormatting";
import { formatPercent } from "../services/ui/phNumberFormat";

interface SimilarStock {
  symbol: string;
  name: string;
  sector: string;
  healthScore: number;
  similarityPercent: number; // 0-100 Euclidean distance converted to %
  keyDifference: string;     // What's different from the reference stock
  marketCap: string;          // e.g. "₱24.5B"
  price: number;
  changePercent: number;
}

// Mock data — production uses PeerComparisonEngine
const MOCK_SIMILAR: SimilarStock[] = [
  {
    symbol: "BPI",
    name: "Bank of the Philippine Islands",
    sector: "Banking",
    healthScore: 78,
    similarityPercent: 87,
    keyDifference: "Higher leverage (D/E 1.8 vs 0.9)",
    marketCap: "₱485B",
    price: 132.30,
    changePercent: 1.2,
  },
  {
    symbol: "MBT",
    name: "Metropolitan Bank & Trust",
    sector: "Banking",
    healthScore: 82,
    similarityPercent: 83,
    keyDifference: "Higher ROE (18.2% vs 15.1%)",
    marketCap: "₱310B",
    price: 68.75,
    changePercent: 2.5,
  },
  {
    symbol: "SECB",
    name: "Security Bank Corporation",
    sector: "Banking",
    healthScore: 85,
    similarityPercent: 79,
    keyDifference: "Lower growth (CAGR 8% vs 15%)",
    marketCap: "₱95B",
    price: 82.00,
    changePercent: -0.8,
  },
  {
    symbol: "PNB",
    name: "Philippine National Bank",
    sector: "Banking",
    healthScore: 62,
    similarityPercent: 74,
    keyDifference: "Cyclical exposure (higher NPL sensitivity)",
    marketCap: "₱52B",
    price: 27.45,
    changePercent: 3.1,
  },
  {
    symbol: "UBP",
    name: "Union Bank of the Philippines",
    sector: "Banking",
    healthScore: 80,
    similarityPercent: 71,
    keyDifference: "Digital-heavy revenue mix (55% vs 25%)",
    marketCap: "₱82B",
    price: 43.00,
    changePercent: 0.5,
  },
];

export function SimilarStocks() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <GitBranch size={16} color={colors.textSecondary} />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: colors.textPrimary }}>
          Similar Stocks
        </h3>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: colors.textTertiary,
            background: colors.surfaceCard,
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            padding: "2px 6px",
            borderRadius: radius.full,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Factor-based
        </span>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {MOCK_SIMILAR.map((stock) => (
          <div
            key={stock.symbol}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: colors.surface,
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              borderRadius: radius.md,
              border: `1px solid ${colors.hairline}`,
              transition: `all ${animation.fast}`,
              cursor: "pointer",
            }}
            onClick={() => {
              // Navigate to stock detail — in production: router.push(`/stock/${stock.symbol}`)
              window.location.href = `/stock/${stock.symbol}`;
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.surfaceElevated;
              e.currentTarget.style.borderColor = colors.hairlineStrong;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.surface;
              e.currentTarget.style.borderColor = colors.hairline;
            }}
          >
            {/* Similarity gauge */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `conic-gradient(${colors.accentRed} ${stock.similarityPercent * 3.6}deg, ${colors.surfaceCard} ${stock.similarityPercent * 3.6}deg)`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: colors.surface,
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textPrimary }}>
                  {stock.similarityPercent}%
                </span>
              </div>
            </div>

            {/* Stock info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
                  {stock.symbol}
                </span>
                <span style={{ fontSize: "13px", color: colors.textSecondary }}>
                  {stock.name}
                </span>
                <ConvictionBadge value={stock.healthScore} size="sm" />
              </div>
              <div style={{ fontSize: "12px", color: colors.textTertiary, marginBottom: "2px" }}>
                {stock.sector} · {stock.marketCap}
              </div>
              <div style={{ fontSize: "11px", color: colors.textSecondary, fontStyle: "italic" }}>
                {stock.keyDifference}
              </div>
            </div>

            {/* Price & change */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
                ₱{formatNumber(stock.price)}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: stock.changePercent >= 0 ? colors.marketGreen : colors.marketRed,
                }}
              >
                {formatPercent(stock.changePercent)}
              </div>
            </div>

            <ChevronRight size={16} color={colors.textTertiary} />
          </div>
        ))}
      </div>

      {/* Methodology note */}
      <div
        style={{
          marginTop: "12px",
          padding: "8px 12px",
          background: colors.surface,
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderRadius: radius.sm,
          fontSize: "11px",
          color: colors.textTertiary,
          lineHeight: "1.5",
        }}
      >
        Similarity computed using Euclidean distance across 8 financial factors (quality, valuation, growth, momentum, stability, technical, sentiment, catalyst). Not a recommendation.
      </div>
    </div>
  );
}
