import { useEffect, useState } from 'react';
import { providerHealthMonitor, type ProviderHealthMetrics } from '../services/health/ProviderHealthMonitor';
import { colors } from '../design/tokens';

export default function ProviderHealthIndicator() {
  const [metrics, setMetrics] = useState<ProviderHealthMetrics[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      const allMetrics = providerHealthMonitor.getAllMetrics();
      setMetrics(allMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#22c55e';
      case 'degraded':
        return '#f59e0b';
      case 'down':
        return '#ef4444';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '●';
      case 'degraded':
        return '◐';
      case 'down':
        return '○';
      default:
        return '?';
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: colors.surface,
        borderRadius: '8px',
        fontSize: '12px',
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          justifyContent: 'space-between',
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', color: colors.textPrimary }}>Provider Health</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {metrics.map((m) => (
              <span
                key={m.provider}
                title={`${m.provider}: ${m.status} (${m.uptime.toFixed(1)}%)`}
                style={{
                  color: getStatusColor(m.status),
                  fontSize: '16px',
                  lineHeight: '1',
                  cursor: 'pointer',
                }}
              >
                {getStatusIcon(m.status)}
              </span>
            ))}
          </div>
        </div>
        <span style={{ color: colors.textSecondary }}>{showDetails ? '▼' : '▶'}</span>
      </div>

      {showDetails && (
        <div style={{ marginTop: '12px', borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
          {metrics.map((m) => (
            <div
              key={m.provider}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: colors.canvas,
                borderRadius: '4px',
              }}
            >
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>
                  {m.provider.toUpperCase()}
                </p>
                <p style={{ margin: '0', fontWeight: '600', color: getStatusColor(m.status) }}>
                  {m.status}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>Uptime</p>
                <p style={{ margin: '0', fontWeight: '600' }}>{m.uptime.toFixed(1)}%</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>Avg Response</p>
                <p style={{ margin: '0', fontWeight: '600' }}>{m.avgResponseTime}ms</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>Requests</p>
                <p style={{ margin: '0', fontWeight: '600' }}>{m.totalRequests}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>Successes</p>
                <p style={{ margin: '0', fontWeight: '600' }}>{m.successCount}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: colors.textSecondary }}>Failures</p>
                <p style={{ margin: '0', fontWeight: '600' }}>{m.failCount}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
