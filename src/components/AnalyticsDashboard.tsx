import { useEffect, useState } from 'react';
import { advancedAnalytics } from '../lib/client/advancedAnalytics';

interface Trend {
  week: string;
  event_name: string;
  event_count: number;
  unique_users: number;
}

interface FunnelStep {
  step_name: string;
  session_count: number;
}

interface CohortRow {
  cohort_week: string;
  week_offset: number;
  active_users: number;
}

export function AnalyticsDashboard() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        if (!apiUrl) {
          setError('VITE_API_URL not configured');
          return;
        }

        const [trendRes, funnelRes, cohortRes] = await Promise.all([
          fetch(`${apiUrl}/api/analytics/trends`),
          fetch(`${apiUrl}/api/analytics/funnel`),
          fetch(`${apiUrl}/api/analytics/cohorts`),
        ]);

        if (trendRes.ok) {
          const t = await trendRes.json();
          setTrends(t.trends || []);
        }
        if (funnelRes.ok) {
          const f = await funnelRes.json();
          setFunnel(f.funnel || []);
        }
        if (cohortRes.ok) {
          const c = await cohortRes.json();
          setCohorts(c.cohorts || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    }
    load();
  }, []);

  if (error) {
    return <div style={{ padding: 16, color: '#ef4444' }}>Analytics: {error}</div>;
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Analytics Dashboard</h2>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Funnel</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Step</th>
              <th style={thStyle}>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((s) => (
              <tr key={s.step_name}>
                <td style={tdStyle}>{s.step_name}</td>
                <td style={tdStyle}>{s.session_count.toLocaleString()}</td>
              </tr>
            ))}
            {funnel.length === 0 && (
              <tr><td colSpan={2} style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>No funnel data</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Weekly Trends</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Week</th>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Count</th>
              <th style={thStyle}>Users</th>
            </tr>
          </thead>
          <tbody>
            {trends.slice(0, 20).map((t, i) => (
              <tr key={i}>
                <td style={tdStyle}>{t.week?.slice(0, 10)}</td>
                <td style={tdStyle}>{t.event_name}</td>
                <td style={tdStyle}>{t.event_count.toLocaleString()}</td>
                <td style={tdStyle}>{t.unique_users.toLocaleString()}</td>
              </tr>
            ))}
            {trends.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>No trend data</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Cohort Retention</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Cohort Week</th>
              <th style={thStyle}>Week Offset</th>
              <th style={thStyle}>Active Users</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.slice(0, 30).map((c, i) => (
              <tr key={i}>
                <td style={tdStyle}>{c.cohort_week?.slice(0, 10)}</td>
                <td style={tdStyle}>Week {c.week_offset}</td>
                <td style={tdStyle}>{c.active_users.toLocaleString()}</td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr><td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>No cohort data</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: '2px solid #e5e7eb',
  fontWeight: 600,
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 14,
};
