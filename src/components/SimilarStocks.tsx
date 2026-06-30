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

interface SimilarStock {
  symbol: string;
  name: string;
  sector: string;
  healthScore: number;
  similarityPercent: number; // 0-100 Euclidean distance converted to %
  keyDifference: string;     // What's different from the reference stock
  marketCap: string;          // e.g. "₹24,500 Cr"
  price: number;
  changePercent: number;
}

// Mock data — production uses PeerComparisonEngine
const MOCK_SIMILAR: SimilarStock[] = [
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    sector: "Automobile",
    healthScore: 78,
    similarityPercent: 87,
    keyDifference: "Higher leverage (D/E 1.8 vs 0.9)",
    marketCap: "₹2,80,000 Cr",
    price: 852.30,
    changePercent: 1.2,
  },
  {
    symbol: "M&M",
    name: "Mahindra & Mahindra",
    sector: "Automobile",
    healthScore: 82,
    similarityPercent: 83,
    keyDifference: "Higher ROE (18.2% vs 15.1%)",
    marketCap: "₹3,10,000 Cr",
    price: 2450.75,
    changePercent: 2.5,
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki",
    sector: "Automobile",
    healthScore: 85,
    similarityPercent: 79,
    keyDifference: "Lower growth (CAGR 8% vs 15%)",
    marketCap: "₹3,50,000 Cr",
    price: 11450.00,
    changePercent: -0.8,
  },
  {
    symbol: "ASHOKLEY",
    name: "Ashok Leyland",
    sector: "Automobile",
    healthScore: 62,
    similarityPercent: 74,
    keyDifference: "Cyclical exposure (CV cycle dependency)",
    marketCap: "₹52,000 Cr",
    price: 178.45,
    changePercent: 3.1,
  },
  {
    symbol: "BAJAJ-AUTO",
    name: "Bajaj Auto",
    sector: "Automobile",
    healthScore: 80,
    similarityPercent: 71,
    keyDifference: "Export-heavy revenue (55% vs 25%)",
    marketCap: "₹2,40,000 Cr",
    price: 8230.00,
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
                ₹{stock.price.toLocaleString("en-IN")}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: stock.changePercent >= 0 ? colors.marketGreen : colors.marketRed,
                }}
              >
                {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent}%
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
