import { useEffect, useState } from "react";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import type { WatchlistThesisView } from "../research/contracts/productContracts";
import type { ThesisSnapshot } from "../services/personalization/ThesisHistoryStore";
import {
  getThesisHistory,
  captureThesisSnapshot,
} from "../services/personalization/ThesisHistoryStore";
import { Card } from "../ui/Card";
import { colors, typography, space } from "../design/tokens";

interface ThesisHistoryProps {
  symbol: string;
  currentThesis?: WatchlistThesisView | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Strengthening: { bg: colors.accentGreenSoft, color: colors.accentGreen },
  Stable: { bg: colors.accentBlueSoft, color: colors.accentBlue },
  "Needs review": { bg: colors.accentYellowSoft, color: colors.warning },
  Weakening: { bg: colors.accentRedSoft, color: colors.danger },
  "Research signals pending": { bg: colors.backdropMuted, color: colors.textTertiary },
  "Tracking begins now": { bg: colors.backdropMuted, color: colors.textTertiary },
};

export function ThesisHistory({ symbol, currentThesis }: ThesisHistoryProps) {
  const [history, setHistory] = useState<ThesisSnapshot[]>([]);

  useEffect(() => {
    setHistory(getThesisHistory(symbol));
  }, [symbol]);

  // Auto-capture when current thesis changes
  useEffect(() => {
    if (currentThesis) {
      captureThesisSnapshot(currentThesis);
      setHistory(getThesisHistory(symbol));
    }
  }, [symbol, currentThesis?.currentStatus, currentThesis?.score]);

  if (history.length === 0) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <Clock size={18} strokeWidth={1.5} color={colors.textSecondary} />
          <span style={{ fontSize: "13px", color: colors.textSecondary }}>
            No thesis history yet. History is captured when you visit this page with fresh intelligence.
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "grid", gap: space[4] }}>
        <h3 style={{
          margin: 0,
          color: colors.textPrimary,
          fontSize: typography.h3.desktop.size,
          fontWeight: 600,
        }}>
          Thesis History
        </h3>
        <div style={{ display: "grid", gap: space[3] }}>
          {history.slice().reverse().map((entry, i) => {
            const t = entry.thesis;
            const style = STATUS_STYLES[t.currentStatus] ?? STATUS_STYLES["Tracking begins now"];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: `${space[2]} ${space[3]}`,
                  borderRadius: "8px",
                  background: i === 0 ? colors.card : "transparent",
                  border: i === 0 ? `1px solid ${colors.border}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: style.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: style.bg,
                    color: style.color,
                  }}>
                    {t.currentStatus}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: space[3], fontSize: "13px" }}>
                  {t.score !== null && (
                    <span style={{ fontWeight: 600, color: colors.textPrimary }}>
                      {t.score}
                    </span>
                  )}
                  <span style={{ color: colors.textSecondary, fontSize: "12px" }}>
                    {entry.capturedAt ? new Date(entry.capturedAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
