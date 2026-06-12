import React, { useEffect, useState } from 'react';

interface TrustMetrics {
  alpha: number | null;
  hit_rate: number | null;
  sharpe_ratio: number | null;
  calibration_score: number | null;
  total_predictions: number | null;
  total_outcomes: number | null;
}

interface TrustEnvelope {
  status: 'ok' | 'partial' | 'unavailable' | 'empty' | 'error' | 'demo';
  message: string | null;
  data: TrustMetrics | null;
  dataState?: {
    availability?: string;
    asOf?: string | null;
    missingInputs?: string[];
    completenessScore?: number;
  };
}

function formatMetric(value: number | null | undefined, suffix = ''): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data unavailable';
  return `${value.toFixed(2)}${suffix}`;
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Data unavailable';
  return value.toLocaleString('en-IN');
}

function MetricCard({ label, value, description = '' }: { label: string; value: string; description?: string }) {
  return (
    <div className="border-4 border-black bg-white p-4 text-center" style={{ boxShadow: '4px 4px 0px #000' }}>
      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-4 border-black bg-white p-5" style={{ boxShadow: '6px 6px 0px #000' }}>
      <h3 className="font-extrabold text-lg uppercase border-b-4 border-black pb-2 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function TrustCentrePage() {
  const [envelope, setEnvelope] = useState<TrustEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/intelligence/trust-metrics', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.reason || 'TRUST_METRICS_UNAVAILABLE');
        return body as TrustEnvelope;
      })
      .then((data) => {
        setEnvelope(data);
        setLoading(false);
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) return;
        setError(fetchError.message || 'Trust metrics are temporarily unavailable.');
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="inline-block w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 font-extrabold text-xl uppercase">Verifying trust metrics...</p>
      </div>
    );
  }

  const metrics = envelope?.data;
  const state = error ? 'error' : envelope?.status ?? 'unavailable';
  const asOf = envelope?.dataState?.asOf || 'Data unavailable';
  const missingInputs = envelope?.dataState?.missingInputs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="border-4 border-black bg-gray-900 p-8 text-center text-white" style={{ boxShadow: '8px 8px 0px #000' }}>
        <h1 className="font-extrabold text-4xl uppercase tracking-widest mb-4">🔒 Trust Centre</h1>
        <p className="text-2xl font-extrabold text-yellow-400 mb-2">DON'T TRUST US. VERIFY US.</p>
        <p className="text-gray-300 text-sm max-w-lg mx-auto">
          This page displays only metrics returned by connected, auditable data sources. Missing evidence is shown as unavailable.
        </p>
      </div>

      {(state !== 'ok') && (
        <div className="border-4 border-black bg-yellow-100 p-4" role="status">
          <p className="font-extrabold uppercase">Trust metrics status: {state}</p>
          <p className="text-sm mt-1">{error || envelope?.message || 'Some trust metrics are unavailable because the required evidence source is not connected.'}</p>
          {missingInputs.length > 0 && (
            <p className="text-xs mt-2">Missing inputs: {missingInputs.join(', ')}</p>
          )}
        </div>
      )}

      <div>
        <h2 className="font-extrabold text-2xl uppercase mb-4">Performance at a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Alpha" value={formatMetric(metrics?.alpha)} description="Excess return vs benchmark" />
          <MetricCard label="Hit Rate" value={formatMetric(metrics?.hit_rate, '%')} description="Correct predictions" />
          <MetricCard label="Sharpe" value={formatMetric(metrics?.sharpe_ratio)} description="Risk-adjusted return" />
          <MetricCard label="Calibration" value={formatMetric(metrics?.calibration_score, '%')} description="Score-to-outcome alignment" />
        </div>
      </div>

      <div>
        <h2 className="font-extrabold text-2xl uppercase mb-4">Scale</h2>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Predictions Generated" value={formatCount(metrics?.total_predictions)} />
          <MetricCard label="Outcomes Tracked" value={formatCount(metrics?.total_outcomes)} />
        </div>
      </div>

      <Section title="📐 Methodology">
        <div className="space-y-2 text-sm leading-relaxed">
          <p><strong>Factor Model:</strong> Quality, Growth, Value, Momentum, Risk, and sector context are evaluated from connected snapshots where available.</p>
          <p><strong>Explainability:</strong> Stock pages expose source lineage and unavailable states instead of silently inventing values.</p>
          <p><strong>Limitations:</strong> Performance metrics remain unavailable until an audited outcomes dataset is connected.</p>
        </div>
      </Section>

      <Section title="📊 Data Availability">
        <div className="space-y-2 text-sm">
          <p><strong>Metrics as of:</strong> {asOf}</p>
          <p><strong>Availability:</strong> {envelope?.dataState?.availability || 'unavailable'}</p>
          <p><strong>Completeness:</strong> {typeof envelope?.dataState?.completenessScore === 'number' ? `${envelope.dataState.completenessScore}%` : 'Data unavailable'}</p>
        </div>
      </Section>

      <Section title="⚠️ Limitations">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Missing metrics are displayed as unavailable.</li>
          <li>Forward-looking scores are analytical estimates, not guarantees.</li>
          <li>Performance claims must be backed by audited outcomes before they appear here.</li>
        </ul>
      </Section>

      <div className="border-t-4 border-black pt-4 text-center text-xs text-gray-500 font-bold uppercase">
        <p>StockStory India — Financial Intelligence Operating System</p>
        <p className="mt-1">Trust metrics as of: {asOf}</p>
        <p className="mt-2">"We don't expect trust. We earn it through transparency."</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
