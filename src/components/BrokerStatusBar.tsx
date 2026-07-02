// src/components/BrokerStatusBar.tsx
// Shows real-time status of all connected broker accounts.

import { useCallback, useEffect, useState } from "react";
import { colors, radius, space } from "../design/tokens";
import { loadAuthSession } from "../services/auth/sessionStore";

interface BrokerConnection {
  id: string;
  broker: string;
  label: string;
  status: string;
  broker_user_id?: string;
  created_at?: string;
}

export default function BrokerStatusBar() {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    const session = loadAuthSession();
    if (session.status !== "authenticated") {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/v1/broker/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 30000);
    return () => clearInterval(interval);
  }, [fetchConnections]);

  if (loading) return null;

  const connected = connections.filter((c) => c.status === "active");

  if (connections.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space[2],
        flexWrap: "wrap",
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      <span style={{ color: colors.textTertiary, fontSize: 10 }}>
        {connected.length}/{connections.length} brokers connected
      </span>
      {connections.map((c) => {
        const isActive = c.status === "active";
        return (
          <div
            key={c.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: space[1],
              padding: `${space[1]} ${space[2]}`,
              borderRadius: radius.sm,
              background: isActive ? "rgba(52, 211, 153, 0.08)" : "rgba(248, 113, 113, 0.08)",
              border: `1px solid ${isActive ? "rgba(52, 211, 153, 0.2)" : "rgba(248, 113, 113, 0.2)"}`,
              color: isActive ? colors.marketGreen : colors.danger,
            }}
          >
            <span>{isActive ? "\u2713" : "\u25CB"}</span>
            <span style={{ textTransform: "capitalize" }}>
              {c.broker.replace(/_/g, " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
