import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardLabel } from "../../ui/Card";
import { colors, radius } from "../../design/tokens";
import { PSEI_30, PSE_COMMON_STOCKS, type PSEStockInfo } from "../../constants/pseTickers";
import { formatCompact } from "../../utils/currencyFormatter";

/**
 * PSEi Heatmap — A treemap-style visual of the PSEi-30 constituents
 * colored by daily % change. Shows market cap-weighted heat distribution
 * of the Philippine stock market's top 30 blue chips.
 */
export function PSEiHeatmap() {
  const { data: stocks, isLoading } = useQuery<PSEiConstituent[]>({
    queryKey: ["psei-heatmap"],
    queryFn: async () => {
      // Fetch live quotes for PSEi-30 constituents
      const symbols = PSEI_30.join(",");
      const res = await fetch(
        `https://phisix-api3.appspot.com/stocks/${symbols}.json`,
      );
      if (!res.ok) throw new Error("Failed to fetch PSEi constituents");
      const json = await res.json();
      return (json.stock ?? []).map((s: any) => ({
        symbol: s.symbol,
        name: PSE_COMMON_STOCKS[s.symbol]?.name ?? s.symbol,
        sector: PSE_COMMON_STOCKS[s.symbol]?.sector ?? "Unknown",
        price: s.price?.amount ?? 0,
        changePercent: s.percent_change ?? 0,
        volume: s.volume ?? 0,
      }));
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Card style={{ padding: 20 }}>
        <CardLabel>PSEi Market Heatmap</CardLabel>
        <div style={{ padding: "40px 0", textAlign: "center", color: colors.stone, fontSize: 13 }}>
          Loading market data...
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <CardLabel>PSEi Market Heatmap</CardLabel>
        <span style={{ fontSize: 11, color: colors.stone }}>
          {PSEI_30.length} constituents
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: 4,
        }}
      >
        {(stocks ?? []).map((stock, i) => (
          <HeatmapCell key={stock.symbol} stock={stock} index={i} />
        ))}
      </div>
    </Card>
  );
}

interface PSEiConstituent {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  volume: number;
}

function HeatmapCell({ stock, index }: { stock: PSEiConstituent; index: number }) {
  const isPositive = stock.changePercent >= 0;
  const intensity = Math.min(Math.abs(stock.changePercent) / 5, 1);

  const bgColor = isPositive
    ? `rgba(52, 199, 89, ${0.1 + intensity * 0.4})`
    : `rgba(255, 59, 48, ${0.1 + intensity * 0.4})`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      style={{
        padding: "8px 6px",
        borderRadius: radius.sm,
        background: bgColor,
        border: `1px solid ${isPositive ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)"}`,
        cursor: "pointer",
        textAlign: "center",
        transition: "border-color 150ms ease",
      }}
      onClick={() => window.location.href = `/stock/${stock.symbol}`}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textPrimary, marginBottom: 2 }}>
        {stock.symbol}
      </div>
      <div style={{ fontSize: 10, color: isPositive ? colors.marketGreen : colors.marketRed, fontWeight: 500 }}>
        {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
      </div>
      <div style={{ fontSize: 9, color: colors.stone, marginTop: 2 }}>
        {formatCompact(stock.volume)}
      </div>
    </motion.div>
  );
}