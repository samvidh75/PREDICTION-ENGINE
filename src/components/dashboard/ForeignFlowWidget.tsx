import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Card, CardLabel } from "../../ui/Card";
import { colors, radius } from "../../design/tokens";
import { formatCompactPHP } from "../../utils/currencyFormatter";

interface ForeignFlowEntry {
  symbol: string;
  name: string;
  netValue: number;
  direction: "buying" | "selling";
}

interface ForeignFlowResponse {
  ok: boolean;
  generatedAt: string;
  source: string;
  count: number;
  data: Array<{
    symbol: string;
    name: string;
    netForeign: number;
    date: string;
  }>;
}

/**
 * Net Foreign Flow Widget — tracks aggregate foreign buying/selling activity
 * on the Philippine Stock Exchange using real data from the PSE Daily
 * Quotation Report (documents.pse.com.ph).
 *
 * Data source: PSE Daily Quotation Report PDF (free, no API key required).
 * Refreshed when the Python fetch script runs (cron or manual).
 */
export function ForeignFlowWidget() {
  const [flowData, setFlowData] = useState<ForeignFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalNet, setTotalNet] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchFlow = async () => {
      try {
        const res = await fetch("/api/foreign-flow");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ForeignFlowResponse = await res.json();
        if (!json.ok || !json.data?.length) {
          if (!cancelled) setLoading(false);
          return;
        }
        const mapped: ForeignFlowEntry[] = json.data.map((e) => ({
          symbol: e.symbol,
          name: e.name,
          netValue: e.netForeign,
          direction: e.netForeign >= 0 ? "buying" : "selling",
        }));
        if (!cancelled) {
          setFlowData(mapped);
          setTotalNet(mapped.reduce((sum, e) => sum + e.netValue, 0));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFlow();
    const interval = setInterval(fetchFlow, 300_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <Card style={{ padding: 20 }}>
        <CardLabel>Net Foreign Flow</CardLabel>
        <div style={{ padding: "30px 0", textAlign: "center", color: colors.stone, fontSize: 13 }}>
          Loading foreign flow data...
        </div>
      </Card>
    );
  }

  if (flowData.length === 0) {
    return (
      <Card style={{ padding: 20 }}>
        <CardLabel>Net Foreign Flow</CardLabel>
        <div style={{ padding: "30px 0", textAlign: "center", color: colors.stone, fontSize: 13 }}>
          No foreign flow data available yet. Run{' '}
          <code style={{ background: colors.surface, padding: "2px 6px", borderRadius: radius.sm }}>
            python3 scripts/fetch_pse_data.py
          </code>{' '}
          to generate it.
        </div>
      </Card>
    );
  }

  const isNetPositive = totalNet >= 0;

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={16} color={colors.textSecondary} />
          <CardLabel>Net Foreign Flow</CardLabel>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: radius.full,
            background: isNetPositive ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.1)",
          }}
        >
          {isNetPositive ? <TrendingUp size={14} color={colors.marketGreen} /> : <TrendingDown size={14} color={colors.marketRed} />}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isNetPositive ? colors.marketGreen : colors.marketRed,
            }}
          >
            {isNetPositive ? "+" : ""}{formatCompactPHP(totalNet)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <AnimatePresence>
          {flowData.slice(0, 10).map((entry, i) => (
            <ForeignFlowRow key={entry.symbol} entry={entry} index={i} />
          ))}
        </AnimatePresence>
      </div>

      <p style={{ fontSize: 10, color: colors.stone, marginTop: 12, lineHeight: 1.4 }}>
        Source: PSE Daily Quotation Report (documents.pse.com.ph) — real net foreign
        buying/selling data. Refreshes every 5 minutes.
      </p>
    </Card>
  );
}

function ForeignFlowRow({ entry, index }: { entry: ForeignFlowEntry; index: number }) {
  const isBuying = entry.direction === "buying";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderRadius: radius.sm,
        background: isBuying ? "rgba(52,199,89,0.04)" : "rgba(255,59,48,0.04)",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary, fontFamily: "monospace" }}>
          {entry.symbol}
        </span>
        <span style={{ fontSize: 10, color: colors.stone, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.name}
        </span>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isBuying ? colors.marketGreen : colors.marketRed,
            fontFamily: "monospace",
          }}
        >
          {isBuying ? "+" : ""}{formatCompactPHP(entry.netValue)}
        </span>
      </div>
    </motion.div>
  );
}
