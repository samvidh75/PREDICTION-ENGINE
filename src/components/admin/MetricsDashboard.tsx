import { useState, useEffect } from 'react';
import { getAggregatedMetrics, exportMetricsAsJSON, clearMetrics } from '@/utils/analytics';

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState(getAggregatedMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getAggregatedMetrics());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics || metrics.totalQueries === 0) {
    return (
      <div style={{ padding: 24, fontFamily: 'var(--font)' }}>
        <h2>Metrics Dashboard</h2>
        <p>No queries recorded yet. Try searching in the ResearchBot to see analytics.</p>
      </div>
    );
  }

  const offlinePct = (metrics.methods.regex.percentage + metrics.methods.transformers.percentage).toFixed(0);

  return (
    <div style={{ padding: 32, fontFamily: 'var(--font)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Platform Metrics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { const json = exportMetricsAsJSON(); console.log(json); alert('Exported to console'); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--chip)', cursor: 'pointer', fontSize: 13 }}
          >
            Export JSON
          </button>
          <button
            onClick={() => { clearMetrics(); setMetrics(getAggregatedMetrics()); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--chip)', cursor: 'pointer', fontSize: 13 }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 4 }}>Total Queries</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-900)' }}>{metrics.totalQueries}</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 4 }}>Success Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: metrics.successRate > 90 ? 'var(--green-text)' : 'var(--red-text)' }}>
            {metrics.successRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {(['regex', 'transformers', 'groq'] as const).map((method) => {
          const m = metrics.methods[method];
          const labels = { regex: { emoji: '\u26A1', label: 'Regex Parser' }, transformers: { emoji: '\uD83D\uDE80', label: 'Browser AI' }, groq: { emoji: '\uD83D\uDCE1', label: 'API Fallback' } };
          const l = labels[method];
          return (
            <div key={method} style={{ background: 'var(--card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{l.emoji}</div>
              <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 4 }}>{l.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-900)' }}>{m.count}</div>
              <div style={{ fontSize: 13, color: 'var(--text-500)' }}>{m.percentage.toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-400)' }}>Avg: {m.avgDuration.toFixed(0)}ms</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Cost Insights</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-700)' }}>
          <p style={{ margin: 0 }}>
            {metrics.methods.regex.percentage.toFixed(0)}% queries are OFFLINE (Regex) - No API needed!
          </p>
          <p style={{ margin: 0 }}>
            {offlinePct}% queries are BROWSER-BASED - Zero server load!
          </p>
          <p style={{ margin: 0 }}>
            Only {metrics.methods.groq.percentage.toFixed(0)}% fall back to Groq API (free tier)
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--green-text)' }}>
            Total cost: Rs 0 (all free tiers)
          </p>
        </div>
      </div>
    </div>
  );
}
