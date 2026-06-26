import { useState } from 'react';

type MetricTab = 'llm' | 'vector' | 'system';

interface MetricCard {
  label: string;
  value: string | number;
  status: 'ok' | 'warn' | 'error';
}

const initialMetrics: Record<MetricTab, MetricCard[]> = {
  llm: [
    { label: 'Total Queries', value: '--', status: 'ok' },
    { label: 'Avg Latency', value: '-- ms', status: 'ok' },
    { label: 'Cache Hit Rate', value: '--%', status: 'ok' },
    { label: 'Error Rate', value: '--%', status: 'ok' },
  ],
  vector: [
    { label: 'Qdrant Status', value: '--', status: 'ok' },
    { label: 'Collection Size', value: '--', status: 'ok' },
    { label: 'Avg Search Time', value: '-- ms', status: 'ok' },
    { label: 'Total Vectors', value: '--', status: 'ok' },
  ],
  system: [
    { label: 'Memory Usage', value: '--%', status: 'ok' },
    { label: 'CPU Load', value: '--%', status: 'ok' },
    { label: 'Uptime', value: '--', status: 'ok' },
    { label: 'Active Requests', value: '--', status: 'ok' },
  ],
};

export function MetricsDashboard() {
  const [activeTab, setActiveTab] = useState<MetricTab>('llm');

  const metrics = initialMetrics[activeTab];

  return (
    <div style={{ padding: 'var(--sp-6)', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-900)', marginBottom: 'var(--sp-6)' }}>
        System Metrics
      </h1>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)' }}>
        <TabButton label="LLM" tab="llm" active={activeTab} onClick={setActiveTab} />
        <TabButton label="Vector DB" tab="vector" active={activeTab} onClick={setActiveTab} />
        <TabButton label="System" tab="system" active={activeTab} onClick={setActiveTab} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-4)' }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            backgroundColor: 'var(--page)',
            padding: 'var(--sp-4)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--sh-card)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 'var(--sz-sm)', color: 'var(--text-500)', marginBottom: 'var(--sp-2)' }}>
              {m.label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-900)' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 'var(--sp-6)', color: 'var(--text-500)', fontSize: 'var(--sz-sm)' }}>
        Metrics are displayed once the LLM pipeline processes queries.
      </p>
    </div>
  );
}

function TabButton({ label, tab, active, onClick }: { label: string; tab: MetricTab; active: MetricTab; onClick: (t: MetricTab) => void }) {
  return (
    <button
      onClick={() => onClick(tab)}
      style={{
        padding: 'var(--sp-2) var(--sp-4)',
        border: 'none',
        borderRadius: 'var(--r-md)',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: active === tab ? 'var(--brand)' : 'var(--surface)',
        color: active === tab ? 'var(--text-inverse)' : 'var(--text-700)',
        transition: 'all var(--t-fast)',
      }}
    >
      {label}
    </button>
  );
}
