import { useEffect, useState } from "react";
import { colors, space, radius, typography } from "../design/tokens";
import { FeatureGate } from "../commercial/FeatureGate";
import { UpgradePrompt } from "../commercial/UpgradePrompt";

interface UsageInfo {
  allowed: number;
  used: number;
  resetAt: number;
}

interface DashboardData {
  server: {
    uptime: number;
    startTime: string;
  };
  usage: {
    apiCallsPerHour: UsageInfo;
    searchesPerDay: UsageInfo;
    stockViewsPerDay: UsageInfo;
    exportActionsPerDay: UsageInfo;
  };
  llm: {
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    totalCost: number;
  };
  subscriptions: {
    totalActive: number;
    byTier: { free: number; plus: number; pro: number };
  };
  billing: {
    totalTransactions: number;
    totalRevenue: number;
  };
}

interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}

function MetricCard({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: colors.canvas,
        borderRadius: radius.md,
        padding: space[3],
        border: `1px solid ${colors.hairline}`,
        fontFamily: typography.fontFamily,
        fontSize: 11,
        display: "flex",
        flexDirection: "column",
        gap: space[1],
      }}
    >
      <span style={{ color: colors.textTertiary, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ color: accent ?? colors.textPrimary, fontSize: 15, fontWeight: 900 }}>
        {value}
      </span>
      {sub && (
        <span style={{ color: colors.textTertiary, fontSize: 9 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function UsageBar({ label, used, allowed }: { label: string; used: number; allowed: number }) {
  const pct = allowed > 0 ? Math.min((used / allowed) * 100, 100) : 0;
  const isLow = pct > 80;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space[1],
        fontFamily: typography.fontFamily,
        fontSize: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", color: colors.textTertiary }}>
        <span>{label}</span>
        <span>{used}/{allowed}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: 4,
          background: colors.hairline,
          borderRadius: radius.full,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: isLow ? colors.danger : colors.accentBlue,
            borderRadius: radius.full,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/v1/analytics/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json() as Promise<DashboardResponse>;
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Dashboard load failed");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: colors.textTertiary, fontFamily: typography.fontFamily, fontSize: 12, padding: space[12] }}>
        Loading real-time system analytics...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: "center", color: colors.danger, fontFamily: typography.fontFamily, fontSize: 12, padding: space[8] }}>
        {error}
      </p>
    );
  }

  if (!data) return null;

  const uptimeHours = Math.floor(data.server.uptime / 3600);
  const uptimeMins = Math.floor((data.server.uptime % 3600) / 60);
  const successPct = (data.llm.successRate * 100).toFixed(1);

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
        <h3
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: colors.accentBlue,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: typography.fontFamily,
            margin: 0,
          }}
        >
          Real-Time System Analytics
        </h3>
        <p style={{ fontSize: 10, color: colors.textTertiary, fontFamily: typography.fontFamily, margin: `${space[1]} 0 0 0` }}>
          Live metrics from the StockEX inference &amp; subscription layer
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
        <MetricCard
          label="Uptime"
          value={`${uptimeHours}h ${uptimeMins}m`}
          sub={`Since ${new Date(data.server.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
        />
        <MetricCard
          label="LLM Calls (24h)"
          value={String(data.llm.totalCalls)}
          sub={`${successPct}% success · ${data.llm.avgLatencyMs}ms avg`}
          accent={data.llm.successRate > 0.95 ? colors.accentGreen : colors.danger}
        />
        <MetricCard
          label="Active Subscribers"
          value={String(data.subscriptions.totalActive)}
          sub={`${data.subscriptions.byTier.pro} Pro · ${data.subscriptions.byTier.plus} Plus · ${data.subscriptions.byTier.free} Free`}
        />
        <MetricCard
          label="Revenue (all time)"
          value={`\u20b9${(data.billing.totalRevenue / 100).toLocaleString("en-IN")}`}
          sub={`${data.billing.totalTransactions} transactions`}
          accent={colors.accentYellow}
        />
      </div>

      <div
        style={{
          background: colors.canvas,
          borderRadius: radius.lg,
          padding: space[3],
          border: `1px solid ${colors.hairline}`,
        }}
      >
        <span style={{ color: colors.textTertiary, fontSize: 9, fontFamily: typography.fontFamily, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Your API Usage
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: space[2], marginTop: space[2] }}>
          <UsageBar label="API Calls / Hour" used={data.usage.apiCallsPerHour.used} allowed={data.usage.apiCallsPerHour.allowed} />
          <UsageBar label="Searches / Day" used={data.usage.searchesPerDay.used} allowed={data.usage.searchesPerDay.allowed} />
          <UsageBar label="Stock Views / Day" used={data.usage.stockViewsPerDay.used} allowed={data.usage.stockViewsPerDay.allowed} />
          <UsageBar label="Exports / Day" used={data.usage.exportActionsPerDay.used} allowed={data.usage.exportActionsPerDay.allowed} />
        </div>
      </div>
    </div>
  );
}

export function PremiumMetricsDashboard() {
  return (
    <FeatureGate
      feature="api_access"
      fallback={
        <UpgradePrompt
          feature="api_access"
          requiredTier="pro"
        />
      }
    >
      <DashboardContent />
    </FeatureGate>
  );
}
