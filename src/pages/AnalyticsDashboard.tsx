/**
 * TRACK-91 Phase 3 — Analytics Dashboard
 * Shows visitor → signup → activation → retention funnel.
 * Auth-required. Uses EventAnalyticsEngine data.
 */
import React, { useEffect, useState } from "react";

interface FunnelMetrics {
  visitors: number;
  signups: number;
  activations: number;
  watchlistsCreated: number;
  alertsEnabled: number;
  shares: number;
  day1Retention: string;
  day7Retention: string;
  visitorToSignup: string;
  signupToWatchlist: string;
  watchlistToAlert: string;
  activationRate: string;
}

const DEFAULT_METRICS: FunnelMetrics = {
  visitors: 0, signups: 0, activations: 0, watchlistsCreated: 0,
  alertsEnabled: 0, shares: 0,
  day1Retention: "—", day7Retention: "—",
  visitorToSignup: "—", signupToWatchlist: "—",
  watchlistToAlert: "—", activationRate: "—",
};

export default function AnalyticsDashboard(): JSX.Element {
  const [metrics, setMetrics] = useState<FunnelMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/funnel")
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(json => setMetrics({ ...DEFAULT_METRICS, ...json }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rows = [
    { label: "Visitors", value: metrics.visitors },
    { label: "Signups", value: metrics.signups },
    { label: "Activations", value: metrics.activations },
    { label: "Watchlists Created", value: metrics.watchlistsCreated },
    { label: "Alerts Enabled", value: metrics.alertsEnabled },
    { label: "Shares", value: metrics.shares },
  ];

  const rates = [
    { label: "Visitor → Signup", value: metrics.visitorToSignup },
    { label: "Activation Rate", value: metrics.activationRate },
    { label: "Signup → Watchlist", value: metrics.signupToWatchlist },
    { label: "Watchlist → Alert", value: metrics.watchlistToAlert },
    { label: "Day-1 Retention", value: metrics.day1Retention },
    { label: "Day-7 Retention", value: metrics.day7Retention },
  ];

  const MetricCard = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
    <div className="rounded-lg border border-white/[0.06] bg-[#0D1117] p-4">
      <div className={`text-2xl font-semibold ${accent ? "text-[#22AB94]" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs text-[#484F58]">{label}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-white">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Analytics Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[#0D1117] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {rows.map(r => <MetricCard key={r.label} label={r.label} value={r.value} />)}
          </div>

          <h2 className="text-lg font-semibold mb-4">Conversion Rates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rates.map(r => <MetricCard key={r.label} label={r.label} value={r.value} accent />)}
          </div>
        </>
      )}

      <div className="mt-8 text-xs text-[#484F58]">
        Data refreshed on page load. Connected to /api/analytics/funnel.
      </div>
    </div>
  );
}
