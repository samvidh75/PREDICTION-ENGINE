import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface AnnualEntry {
  fiscalYear: string;
  revenue: number | null;
  pat: number | null;
  operatingProfit: number | null;
}

interface FinancialChartsProps {
  data?: AnnualEntry[] | null;
}

const formatChartValue = (crores: number): string => {
  if (crores >= 100_000) return `₹${(crores / 100_000).toFixed(2)}L Cr`;
  if (crores >= 1_000)   return `₹${(crores / 1_000).toFixed(1)}K Cr`;
  return `₹${crores.toFixed(0)} Cr`;
};

const formatChartYAxis = (value: number): string => {
  if (value === 0)          return '₹0';
  if (value >= 100_000)     return `₹${(value / 100_000).toFixed(1)}L Cr`;
  if (value >= 10_000)      return `₹${(value / 10_000).toFixed(0)}K Cr`;
  if (value >= 1_000)       return `₹${(value / 1_000).toFixed(1)}K Cr`;
  return `₹${value} Cr`;
};

const getCurrentFY = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyYear = month >= 4 ? year + 1 : year;
  return `FY${fyYear}`;
};

const getPrevValue = (data: AnnualEntry[], activeTab: string, label: string): number | null => {
  const years = data.filter(e => e.fiscalYear && e.fiscalYear < label)
    .map(e => e.fiscalYear).sort();
  const prevYear = years[years.length - 1];
  if (!prevYear) return null;
  const entry = data.find(e => e.fiscalYear === prevYear);
  if (!entry) return null;
  const key = activeTab === 'revenue' ? 'revenue' : activeTab === 'pat' ? 'pat' : 'operatingProfit';
  return entry[key];
};

const FinancialTooltip = ({ active, payload, label, data, activeTab }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  const prevVal = getPrevValue(data, activeTab, label);
  const yoy = prevVal && prevVal !== 0 ? ((val - prevVal) / Math.abs(prevVal)) * 100 : null;
  const tabLabels: Record<string, string> = { revenue:'Revenue', pat:'Net Profit (PAT)', 'operating-profit':'Operating Profit' };
  const currentFY = getCurrentFY();
  const isTTM = label === currentFY;

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding: '16px 20px',
      boxShadow:'var(--sh-float)', fontFamily:'var(--font)',
      minWidth:190,
    }}>
      <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
        textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 12 }}>
        {label}{isTTM ? ' (TTM)' : ''}
      </div>

      <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', marginBottom: 4 }}>
        {tabLabels[activeTab] || 'Revenue'}
      </div>

      <div style={{ fontSize:22, fontWeight:800, color:'var(--text-900)',
        letterSpacing:'-0.025em', marginBottom: 8 }}>
        {formatChartValue(val)}
      </div>

      {yoy !== null && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap: 4,
          fontSize:'var(--sz-sm)', fontWeight:700,
          color: yoy >= 0 ? 'var(--green-text)' : 'var(--red-text)',
          padding: '4px 12px', borderRadius:'var(--r-pill)',
          background: yoy >= 0 ? 'var(--green-tint)' : 'var(--red-tint)',
        }}>
          {yoy >= 0 ? '▲' : '▼'} {Math.abs(yoy).toFixed(1)}% YoY
        </div>
      )}
    </div>
  );
};

export const FinancialCharts = ({ data }: FinancialChartsProps) => {
  const entries = data ?? [];
  const [activeTab, setActiveTab] = useState<'revenue'|'pat'|'operating-profit'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasAnyRevenue = entries.some(e => e.revenue !== null && e.revenue > 0);
  const hasAnyPat = entries.some(e => e.pat !== null && e.pat > 0);
  const hasAnyOp = entries.some(e => e.operatingProfit !== null && e.operatingProfit > 0);

  const tabs: { key: string; label: string; visible: boolean }[] = [
    { key: 'revenue', label: 'Revenue', visible: hasAnyRevenue },
    { key: 'pat', label: 'Net Profit', visible: hasAnyPat },
    { key: 'operating-profit', label: 'Operating Profit', visible: hasAnyOp },
  ];
  const visibleTabs = tabs.filter(t => t.visible);

  const chartData = useMemo(() => {
    const fieldMap: Record<string, keyof AnnualEntry> = {
      'revenue': 'revenue',
      'pat': 'pat',
      'operating-profit': 'operatingProfit',
    };
    const field = fieldMap[activeTab] || 'revenue';
    return entries
      .map(e => ({
        year: e.fiscalYear,
        value: (e[field] as number) ?? 0,
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [entries, activeTab]);

  const hasData = chartData.length > 0;
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const domainMax = maxValue * 1.15;
  const currentFY = getCurrentFY();

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding: '24px',
      margin: '12px 0',
    }}>
      <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 16 }}>
        Financial Performance
      </div>

      {!hasData ? (
        <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-300)', textAlign:'center', padding: '24px 0' }}>
          Annual financial history is being compiled.
        </div>
      ) : (
        <>
          {/* Segmented tabs */}
          <div style={{ display:'flex', background:'var(--chip)', borderRadius:'var(--r-md)',
            padding: 4, gap: 4, width:'fit-content', marginBottom: 20 }}>
            {visibleTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
                padding: '8px 16px', fontSize:'var(--sz-sm)', fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? 'var(--text-900)' : 'var(--text-500)',
                background: activeTab === tab.key ? 'var(--surface)' : 'transparent',
                border:'none', borderRadius:'var(--r-sm)', cursor:'pointer',
                fontFamily:'var(--font)',
                boxShadow: activeTab === tab.key ? 'var(--sh-raised)' : 'none',
                transition:'all 150ms ease',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: 'var(--text-300)', fontWeight: 600, fontFamily:'var(--font)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  domain={[0, domainMax]}
                  tick={{ fontSize: 10, fill: 'var(--text-300)', fontFamily:'var(--font)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatChartYAxis(v)}
                  width={72}
                />
                <Tooltip
                  content={<FinancialTooltip data={entries} activeTab={activeTab} />}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar
                  dataKey="value"
                  radius={[6,6,0,0]}
                  maxBarSize={52}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={hoveredIndex === index ? 'var(--brand-hover)' : 'var(--brand)'}
                      opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.45 : 1}
                      style={{ cursor:'default', transition:'opacity 100ms, fill 100ms' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* TTM indicator */}
          {chartData.some(d => d.year === currentFY) && (
            <div style={{
              fontSize:'var(--sz-xs)', color:'var(--amber)', fontWeight:600,
              textAlign:'right', marginTop: 8,
            }}>
              * {currentFY} data is trailing twelve months (TTM)
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialCharts;
