import { useCallback, useEffect, useState } from "react";
import { colors, space, radius } from "../design/tokens";
import { FeatureGate } from "../commercial/FeatureGate";
import { UpgradePrompt } from "../commercial/UpgradePrompt";

interface BrokerConnection {
  id: string;
  broker: string;
  label: string;
  status: string;
  broker_user_id: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ConnectionsResponse {
  success: boolean;
  connections: BrokerConnection[];
}

interface BrokerMeta {
  id: string;
  name: string;
  description: string;
}

const KNOWN_BROKERS: BrokerMeta[] = [
  { id: "upstox", name: "Upstox", description: "Connect your Upstox account for portfolio sync and order placement" },
];

function ConnectionsList({ refreshKey }: { refreshKey: number }) {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/broker/connections")
      .then((r) => r.json() as Promise<ConnectionsResponse>)
      .then((d) => { setConnections(d.connections ?? []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [refreshKey]);

  const handleDisconnect = useCallback(async (id: string) => {
    setDisconnecting(id);
    try {
      const res = await fetch(`/api/v1/broker/connections/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // silent
    }
    setDisconnecting(null);
  }, []);

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: colors.textTertiary, fontFamily: "monospace", fontSize: 12, padding: space[8] }}>
        Loading broker connections...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", color: colors.danger, fontFamily: "monospace", fontSize: 12, padding: space[8] }}>
        {error}
      </p>
    );
  }

  if (connections.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
      <span style={{ color: colors.textTertiary, fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Connected Accounts
      </span>
      {connections.map((conn) => {
        const brokerMeta = KNOWN_BROKERS.find((b) => b.id === conn.broker);
        return (
          <div
            key={conn.id}
            style={{
              background: colors.canvas,
              borderRadius: radius.md,
              padding: space[3],
              border: `1px solid ${colors.hairline}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ color: colors.textPrimary, fontWeight: 700 }}>{brokerMeta?.name ?? conn.broker}</div>
              <div style={{ color: colors.textTertiary, fontSize: 10, marginTop: 2 }}>
                {conn.status} &middot; Connected {new Date(conn.created_at).toLocaleDateString("en-IN")}
              </div>
            </div>
            <button
              onClick={() => handleDisconnect(conn.id)}
              disabled={disconnecting === conn.id}
              style={{
                background: "transparent",
                border: `1px solid ${colors.marketRed}`,
                color: colors.marketRed,
                borderRadius: radius.sm,
                padding: `${space[1]} ${space[3]}`,
                fontFamily: "monospace",
                fontSize: 10,
                cursor: "pointer",
                opacity: disconnecting === conn.id ? 0.5 : 1,
              }}
            >
              {disconnecting === conn.id ? "..." : "Disconnect"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function BrokerConnectContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = useCallback(async (brokerId: string) => {
    setConnecting(brokerId);
    try {
      const res = await fetch("/api/v1/broker/auth-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker: brokerId,
          redirectUri: `${window.location.origin}/broker/callback`,
        }),
      });
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.open(data.authUrl, "_blank", "width=600,height=700");
      }
    } catch {
      // silent
    }
    setConnecting(null);
  }, []);

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.xl,
        padding: space[5],
        display: "flex",
        flexDirection: "column",
        gap: space[5],
      }}
    >
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: colors.accentBlue, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "monospace", margin: 0 }}>
          Broker Connections
        </h3>
        <p style={{ fontSize: 10, color: colors.textTertiary, fontFamily: "monospace", margin: `${space[1]} 0 0 0` }}>
          Connect your broker account to enable portfolio sync and trade execution
        </p>
      </div>

      <ConnectionsList refreshKey={refreshKey} />

      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <span style={{ color: colors.textTertiary, fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Available Brokers
        </span>
        {KNOWN_BROKERS.map((broker) => (
          <div
            key={broker.id}
            style={{
              background: colors.canvas,
              borderRadius: radius.md,
              padding: space[3],
              border: `1px solid ${colors.hairline}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ color: colors.textPrimary, fontWeight: 700 }}>{broker.name}</div>
              <div style={{ color: colors.textTertiary, fontSize: 10, marginTop: 2 }}>{broker.description}</div>
            </div>
            <button
              onClick={() => handleConnect(broker.id)}
              disabled={connecting === broker.id}
              style={{
                background: colors.accentBlue,
                border: "none",
                color: "#000000",
                borderRadius: radius.sm,
                padding: `${space[1]} ${space[3]}`,
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                opacity: connecting === broker.id ? 0.5 : 1,
              }}
            >
              {connecting === broker.id ? "..." : "Connect"}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

export function BrokerConnect() {
  return (
    <FeatureGate
      feature="api_access"
      fallback={
        <UpgradePrompt feature="api_access" requiredTier="pro" />
      }
    >
      <BrokerConnectContent />
    </FeatureGate>
  );
}
