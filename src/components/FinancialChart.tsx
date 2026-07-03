import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, LineChart } from 'lucide-react';
import { ExportUtils } from '../services/export/ExportUtils';

interface FinancialDataPoint {
  period: string;
  value: number;
}

interface FinancialChartProps {
  annualRevenue: FinancialDataPoint[];
  annualProfit: FinancialDataPoint[];
  annualEbitda: FinancialDataPoint[];
  quarterlyRevenue?: FinancialDataPoint[];
  quarterlyProfit?: FinancialDataPoint[];
  quarterlyEbitda?: FinancialDataPoint[];
  symbol: string;
}

type MetricType = 'revenue' | 'profit' | 'ebitda';
type ViewMode = 'bar' | 'line';
type PeriodMode = 'annual' | 'quarterly';

function computeGrowth(data: FinancialDataPoint[]): number | null {
  if (data.length < 2) return null;
  const latest = data[data.length - 1].value;
  const prev = data[data.length - 2].value;
  if (prev === 0) return null;
  return ((latest - prev) / prev) * 100;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function FinancialChart({ annualRevenue, annualProfit, annualEbitda, quarterlyRevenue, quarterlyProfit, quarterlyEbitda, symbol }: FinancialChartProps) {
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('annual');

  const data = useMemo(() => {
    if (periodMode === 'annual') {
      const map = { revenue: annualRevenue, profit: annualProfit, ebitda: annualEbitda };
      return map[metric] || [];
    }
    const map = { revenue: quarterlyRevenue || [], profit: quarterlyProfit || [], ebitda: quarterlyEbitda || [] };
    return map[metric] || [];
  }, [metric, periodMode, annualRevenue, annualProfit, annualEbitda, quarterlyRevenue, quarterlyProfit, quarterlyEbitda]);

  const growth = useMemo(() => computeGrowth(data), [data]);
  const maxVal = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minVal = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  const range = maxVal - minVal || 1;

  const FILL_COLOR = '#3b82f6';
  const LINE_COLOR = '#60a5fa';
  const POSITIVE_COLOR = '#22c55e';
  const NEGATIVE_COLOR = '#ef4444';

  const METRICS: { key: MetricType; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'profit', label: 'Profit' },
    { key: 'ebitda', label: 'EBITDA' },
  ];

  const svgWidth = 600;
  const svgHeight = 250;
  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const barWidth = Math.min(30, (chartW / data.length) * 0.6);
  const barGap = (chartW - barWidth * data.length) / (data.length + 1);

  const linePath = data.length > 1
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.value)}`).join(' ')
    : '';

  const areaPath = data.length > 1
    ? linePath + ` L${xScale(data.length - 1)},${padding.top + chartH} L${xScale(0)},${padding.top + chartH} Z`
    : '';

  const yTicks = 5;
  const yStep = range / yTicks;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minVal + i * yStep);

  const handleExport = () => {
    ExportUtils.toCSV(
      ['Period', `${metric.charAt(0).toUpperCase() + metric.slice(1)} (₹ Cr)`],
      data.map(d => [d.period, (d.value / 10000000).toFixed(2)]),
      `${symbol}_${metric}_${periodMode}`
    );
  };

  return (
    <div style={{ padding: '20px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px' }}>
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: metric === m.key ? 600 : 400,
                background: metric === m.key ? '#3b82f6' : 'transparent',
                color: metric === m.key ? '#fff' : '#a0a0a0',
                transition: 'all 0.15s',
              }}
            >{m.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
            {(['annual', 'quarterly'] as PeriodMode[]).map(m => (
              <button
                key={m}
                onClick={() => setPeriodMode(m)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: periodMode === m ? 600 : 400,
                  background: periodMode === m ? '#3b82f6' : 'transparent',
                  color: periodMode === m ? '#fff' : '#a0a0a0',
                }}
              >{m === 'annual' ? 'Annual' : 'Quarterly'}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
            {(['bar', 'line'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === m ? '#3b82f6' : 'transparent',
                  color: viewMode === m ? '#fff' : '#a0a0a0',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >{m === 'bar' ? <BarChart3 size={14} /> : <LineChart size={14} />}</button>
            ))}
          </div>

          <button
            onClick={handleExport}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              fontSize: '11px',
              background: 'transparent',
              color: '#a0a0a0',
            }}
          >Export CSV</button>
        </div>
      </div>

      {growth !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '13px', color: '#a0a0a0' }}>
          YoY Growth: <span style={{ fontWeight: 600, color: growth >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR, display: 'flex', alignItems: 'center', gap: '2px' }}>
            {growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
          <span style={{ marginLeft: 'auto' }}>Latest: {formatValue(data[data.length - 1]?.value || 0)}</span>
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          No data available for this period
        </div>
      ) : (
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
          {yLabels.map((v, i) => (
            <g key={i}>
              <line x1={padding.left} y1={yScale(v)} x2={svgWidth - padding.right} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" />
              <text x={padding.left - 8} y={yScale(v) + 4} textAnchor="end" fill="#666" fontSize="10">{formatValue(v)}</text>
            </g>
          ))}

          {viewMode === 'bar' && data.map((d, i) => {
            const x = barGap + i * (barWidth + barGap);
            const h = ((d.value - minVal) / range) * chartH;
            return (
              <g key={i}>
                <rect
                  x={padding.left + x}
                  y={padding.top + chartH - h}
                  width={barWidth}
                  height={Math.max(h, 1)}
                  fill={d.value >= 0 ? FILL_COLOR : '#ef4444'}
                  opacity={0.8}
                  rx="2"
                >
                  <title>{d.period}: {formatValue(d.value)}</title>
                </rect>
              </g>
            );
          })}

          {viewMode === 'line' && data.length > 1 && (
            <>
              <path d={areaPath} fill={`${LINE_COLOR}20`} />
              <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth="2" />
              {data.map((d, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="3" fill={LINE_COLOR}>
                  <title>{d.period}: {formatValue(d.value)}</title>
                </circle>
              ))}
            </>
          )}

          {data.map((d, i) => (
            <text
              key={i}
              x={viewMode === 'bar' ? padding.left + barGap + i * (barWidth + barGap) + barWidth / 2 : xScale(i)}
              y={svgHeight - 8}
              textAnchor="middle"
              fill="#666"
              fontSize="8"
              transform={data.length > 8 ? `rotate(-45, ${viewMode === 'bar' ? padding.left + barGap + i * (barWidth + barGap) + barWidth / 2 : xScale(i)}, ${svgHeight - 8})` : undefined}
            >{d.period.replace('FY', '').replace("'", "")}</text>
          ))}
        </svg>
      )}
    </div>
  );
}
