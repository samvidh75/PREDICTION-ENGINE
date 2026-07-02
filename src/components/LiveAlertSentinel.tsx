/**
 * LiveAlertSentinel — Real-time notification card stack.
 *
 * Connects to the event-alert WebSocket gateway, listens for corporate
 * event breakout markers, and renders sliding visual alerts styled to
 * the Raycast design system (monospace, #0D0D0D base, crimson borders).
 *
 * Phase 55 — Zero-cost push, layered over the existing Fastify WebSocket
 * infrastructure instead of expensive third-party web-push services.
 */

import { useEffect, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────

interface ActivePushAlert {
  alertId: string;
  ticker: string;
  message: string;
  timestamp: number;
}

// ── Component ───────────────────────────────────────────────────────

export default function LiveAlertSentinel() {
  const [activeAlert, setActiveAlert] = useState<ActivePushAlert | null>(null);

  useEffect(() => {
    // Build WebSocket URL relative to the current host (same pattern as
    // useWatchlistWebSocket), falling back to a local dev endpoint.
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/v1/event-alerts`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("📡 LiveAlertSentinel initialized. Subscribing to master core tracking targets...");
      socket.send(
        JSON.stringify({
          type: "subscribe",
          tickers: ["RELIANCE", "TCS", "SBIN", "INFY", "HDFCBANK"],
        }),
      );
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "event_alert_push") {
          setActiveAlert(payload);
          // Automatically dismiss after 7 seconds
          setTimeout(() => setActiveAlert(null), 7000);
        }
      } catch {
        // Suppress parsing variances quietly across network channels
      }
    };

    return () => {
      socket.close(); // Prevent socket connection leaks on component unmount
    };
  }, []);

  if (!activeAlert) return null;

  const cardStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#0D0D0D",
    border: "1px solid #EF4444",
    padding: "16px 20px",
    borderRadius: "8px",
    maxWidth: "360px",
    width: "100%",
    fontFamily: "monospace",
    color: "#f4f4f5",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.9)",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #1A1A1A",
          paddingBottom: "6px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "#EF4444",
            letterSpacing: "0.05em",
          }}
        >
          🚨 EVENT BREAKOUT ANOMALY
        </span>
        <button
          onClick={() => setActiveAlert(null)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: "11px", margin: 0, lineHeight: "1.5", color: "#e4e4e7" }}>
        {activeAlert.message}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "4px",
          fontSize: "9px",
          color: "#4b5563",
        }}
      >
        <span>ID: {activeAlert.alertId.substring(0, 8)}...</span>
        <span>{new Date(activeAlert.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
