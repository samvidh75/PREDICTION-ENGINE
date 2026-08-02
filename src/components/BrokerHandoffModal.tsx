/**
 * components/BrokerHandoffModal — Research review → broker handoff flow.
 *
 * Before redirecting to a broker the user sees:
 *  1. A research summary (direction, confidence, rationale)
 *  2. SEC disclaimer
 *  3. Risk acknowledgment checkbox
 *  4. "Continue with broker" CTA
 *
 * StockEX does NOT place trades, charge brokerage, or handle funds.
 */

import { useState } from "react";
import { AlertCircle, ArrowRight, Check, ExternalLink, Shield } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { colors, typography, shadows } from "../design/tokens";
import { prepareHandoff, getDisclaimer } from "../commercial/BrokerHandoffService";
import type { BrokerEntry } from "../commercial/BrokerRegistry";

interface BrokerHandoffModalProps {
  broker: BrokerEntry;
  stockSymbol: string;
  direction: "long" | "short";
  rationale: string;
  confidence: number;
  onClose: () => void;
}

export function BrokerHandoffModal({
  broker,
  stockSymbol,
  direction,
  rationale,
  confidence,
  onClose,
}: BrokerHandoffModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [handoffSent, setHandoffSent] = useState(false);

  const payload = prepareHandoff(broker.id, stockSymbol, direction, rationale, confidence);
  if (!payload) {
    return (
      <div onClick={onClose} style={overlayStyle}>
        <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
          <p style={{ color: colors.danger }}>Broker "{broker.name}" is not available.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    setHandoffSent(true);
    // Open broker URL in a new tab — actual trade execution is on the broker's platform.
    window.open(payload.handoffUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Shield size={20} color={colors.primary} />
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: colors.textPrimary }}>
            Continue with {broker.name}
          </h2>
        </div>

        {/* ── Research summary card ── */}
        <Card style={{ marginBottom: "16px" }}>
          <CardLabel>Research review</CardLabel>
          <div style={{ display: "grid", gap: "8px", fontSize: "14px", color: colors.textPrimary }}>
            <p style={{ margin: 0 }}>
              <strong>Symbol:</strong> {stockSymbol.toUpperCase()}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Direction:</strong>{" "}
              <span style={{ color: direction === "long" ? colors.success : colors.danger }}>
                {direction.toUpperCase()}
              </span>
            </p>
            <p style={{ margin: 0 }}>
              <strong>Confidence:</strong> {confidence}%
            </p>
            <p style={{ margin: 0 }}>
              <strong>Rationale:</strong> {rationale}
            </p>
          </div>
        </Card>

        {/* ── SEC disclaimer ── */}
        <div
          style={{
            padding: "12px",
            background: colors.marketOrangeSoft,
            border: `1px solid ${colors.warning}`,
            borderRadius: "10px",
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            fontSize: "12px",
            color: colors.textPrimary,
            lineHeight: "1.5",
          }}
        >
          <AlertCircle size={14} color={colors.warning} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>SEC disclaimer:</strong> {getDisclaimer()}
          </div>
        </div>

        {/* ── Risk acknowledgment ── */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            marginBottom: "20px",
            cursor: "pointer",
            fontSize: "13px",
            color: colors.textSecondary,
            lineHeight: "1.5",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: "3px", accentColor: colors.primary }}
          />
          <span>
            I understand that StockEX provides only research analysis and does not execute trades.
            All order placement and execution will happen on {broker.name}'s platform.
            I have reviewed the research and accept the risks involved.
          </span>
        </label>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!acknowledged}
            style={!acknowledged ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            {handoffSent ? (
              <>
                <Check size={16} /> Handoff sent
              </>
            ) : (
              <>
                Continue with {broker.name} <ExternalLink size={14} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline overlay / modal styles ─── */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: colors.backdropHeavy,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

const modalStyle: React.CSSProperties = {
  background: colors.page,
  borderRadius: "16px",
  padding: "24px",
  maxWidth: "520px",
  width: "100%",
  boxShadow: shadows.elevated,
  maxHeight: "90vh",
  overflowY: "auto",
};
