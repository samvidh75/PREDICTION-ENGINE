interface ShareholdingRow {
  period: string;
  promoter: number;
  fii: number;
  dii: number;
  retail: number;
  deltas: {
    promoter: number;
    fii: number;
    dii: number;
    retail: number;
  };
}

interface ShareholdingChartProps {
  data: ShareholdingRow[];
  compact?: boolean;
}

function PieChart({ promoter, fii, dii, retail, size = 140 }: { promoter: number; fii: number; dii: number; retail: number; size?: number }) {
  const total = promoter + fii + dii + retail;
  if (total === 0) return null;
  const segments = [
    { pct: promoter / total, color: '#3b82f6', label: 'Promoters' },
    { pct: fii / total, color: '#f59e0b', label: 'FII' },
    { pct: dii / total, color: '#10b981', label: 'DII' },
    { pct: retail / total, color: '#8b5cf6', label: 'Retail' },
  ];

  let cumulativeAngle = -90;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  function polarToCartesian(angle: number): string {
    const rad = (angle * Math.PI) / 180;
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const angle = seg.pct * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;
        cumulativeAngle = endAngle;
        const start = polarToCartesian(startAngle);
        const end = polarToCartesian(endAngle);
        const largeArc = angle > 180 ? 1 : 0;
        const d = `M ${cx},${cy} L ${start} A ${r},${r} 0 ${largeArc} 1 ${end} Z`;
        if (seg.pct === 0) return null;
        return <path key={i} d={d} fill={seg.color} stroke="#1a1a1a" strokeWidth="0.5" />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.35} fill="#1a1a1a" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">{promoter}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#a0a0a0" fontSize="8">Promoter</text>
    </svg>
  );
}

function DeltaIndicator({ value }: { value: number }) {
  if (value === 0) return <span style={{ color: '#666', fontSize: '11px' }}>—</span>;
  return (
    <span style={{ color: value > 0 ? '#22c55e' : '#ef4444', fontSize: '11px', fontWeight: 600 }}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export function ShareholdingChart({ data, compact = false }: ShareholdingChartProps) {
  if (!data || data.length === 0) return <div style={{ color: '#a0a0a0', padding: '20px', textAlign: 'center' }}>No shareholding data available</div>;

  const latest = data[0];
  const prev = data[1];

  return (
    <div style={{ padding: compact ? '12px' : '20px' }}>
      {!compact && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: '#fff' }}>Shareholding Pattern</h3>
          <p style={{ fontSize: '12px', color: '#a0a0a0', margin: 0 }}>As of {latest.period}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: compact ? '16px' : '32px', alignItems: 'center', flexWrap: 'wrap' }}>
        <PieChart promoter={latest.promoter} fii={latest.fii} dii={latest.dii} retail={latest.retail} size={compact ? 100 : 140} />

        <div style={{ flex: 1, minWidth: '200px' }}>
          {[
            { label: 'Promoters', value: latest.promoter, delta: latest.deltas.promoter, color: '#3b82f6' },
            { label: 'Foreign Institutions (FII)', value: latest.fii, delta: latest.deltas.fii, color: '#f59e0b' },
            { label: 'Domestic Institutions (DII)', value: latest.dii, delta: latest.deltas.dii, color: '#10b981' },
            { label: 'Retail & Others', value: latest.retail, delta: latest.deltas.retail, color: '#8b5cf6' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: compact ? '12px' : '13px', color: '#ccc' }}>{item.label}</span>
              <span style={{ fontWeight: 600, fontSize: compact ? '13px' : '14px', color: '#fff' }}>{item.value}%</span>
              <DeltaIndicator value={item.delta} />
            </div>
          ))}
        </div>
      </div>

      {!compact && data.length > 1 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#a0a0a0', marginBottom: '8px' }}>Trend (last {data.length} periods)</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#a0a0a0', fontWeight: 500 }}>Period</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#3b82f6', fontWeight: 500 }}>Promoter</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b', fontWeight: 500 }}>FII</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>DII</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#8b5cf6', fontWeight: 500 }}>Retail</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.period} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '6px 8px', color: '#fff', fontWeight: i === 0 ? 600 : 400 }}>{row.period}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#93c5fd' }}>{row.promoter}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#fde68a' }}>{row.fii}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6ee7b7' }}>{row.dii}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#c4b5fd' }}>{row.retail}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!compact && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '12px', color: '#a0a0a0' }}>
          <strong>What to watch:</strong>{' '}
          {latest.deltas.fii > 0
            ? `FIIs have increased stake by ${latest.deltas.fii}% — typically a bullish signal. `
            : `FIIs have decreased stake by ${Math.abs(latest.deltas.fii)}% — monitor for continued selling. `}
          {latest.promoter > 50
            ? `Promoter holding at ${latest.promoter}% reflects strong alignment with minority shareholders.`
            : `Promoter holding at ${latest.promoter}% — lower than typical Indian promoter levels.`
          }
        </div>
      )}
    </div>
  );
}
