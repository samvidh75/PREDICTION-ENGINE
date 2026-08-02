/**
 * AdvancedScanner — Technical Scanner (placeholder)
 *
 * This used to run Bollinger Bands / MACD / divergence detection against a
 * fabricated 30-day price series (a hash of the ticker symbol fed through a
 * pseudo-random walk, dressed up as real historical prices), then dispatched
 * real alerts claiming things like "institutional buying detected" based on
 * that noise. That's not a display issue — it's a real integrity problem:
 * it manufactured trading signals from data that was never real.
 *
 * No real historical price series is currently available for PSE stocks —
 * the only reachable live feed (phisix-api3.appspot.com) only exposes a
 * single current price/volume snapshot, and Yahoo/PSE Edge (which would
 * carry real history) are unreachable from this environment. Rather than
 * keep inventing price history to compute technical indicators, this page
 * is an honest placeholder until a real historical-data source is wired in.
 *
 * Lives at /technical-scanner
 */

import { Activity } from "lucide-react";
import { colors, typography } from "../design/tokens";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";

export default function AdvancedScanner() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 720, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <div
        style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
          background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
          display: "grid", placeItems: "center",
        }}
      >
        <Activity size={24} color={colors.textSecondary} />
      </div>
      <h1 style={{ color: colors.textPrimary, fontSize: typography.h2.desktop.size, fontWeight: 600, margin: "0 0 12px" }}>
        Technical scanning isn't available yet
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: 14.5, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 24px" }}>
        Bollinger Bands, MACD, and divergence detection need real historical price series to compute honestly.
        The live PSE data source this app uses only provides a current price snapshot, not price history —
        so rather than invent one, this page is switched off until a real historical-data feed is wired in.
      </p>
      <Button onClick={() => navigate("/scanner")}>Go to the live Scanner instead</Button>
    </div>
  );
}
