import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

const RANGES = ['1D','5D','1M','3M','6M','1Y','3Y'] as const;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding:'12px 16px',
      boxShadow:'var(--sh-float)', fontFamily:'var(--font)', minWidth:160,
    }}>
      <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)',
        fontWeight:600, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:'var(--text-900)',
        letterSpacing:'-0.02em' }}>
        ₹{Number(payload[0].value).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })}
      </div>
    </div>
  );
};

export const PriceChart = ({ symbol }: { symbol: string }) => {
  const isMobile = useIsMobile();
  const [range, setRange] = useState<string>('1Y');
  const { data, isLoading, isError } = useQuery(
    {
      queryKey: ['history', symbol, range],
      queryFn: async () => {
        const r = await fetch(`/api/history/${symbol}?range=${range}`);
        if (!r.ok) throw new Error('Failed to fetch history');
        const d = await r.json();
        return d.data as Array<{ date: string; close: number }>;
      },
      staleTime: range === '1D' ? 60_000 : 5 * 60_000,
      enabled: !!symbol,
    }
  );

  const isPositive = (data?.length ?? 0) > 1
    ? data![data!.length - 1].close >= data![0].close
    : true;
  const color = isPositive ? 'var(--green)' : 'var(--red)';

  if (isLoading) return (
    <div style={{ marginTop:12, marginBottom:12 }}>
      <div className="skeleton" style={{ height:300, borderRadius:'var(--r-lg)' }} />
    </div>
  );

  if (isError || !data?.length) return (
    <div style={{
      height:300, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:8,
      border:'1px dashed var(--border)', borderRadius:'var(--r-lg)',
      margin:'12px 0',
    }}>
      <span style={{ fontSize:24 }}>📊</span>
      <span style={{ fontSize:'var(--sz-sm)', color:'var(--text-300)' }}>
        Price history temporarily unavailable
      </span>
    </div>
  );

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding:'20px 20px 12px',
      margin:'12px 0',
    }}>
      <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap' }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            padding: isMobile ? '4px 9px' : '5px 12px',
            fontSize: isMobile ? 'var(--sz-2xs)' : 'var(--sz-xs)',
            fontWeight:700,
            borderRadius:'var(--r-pill)', cursor:'pointer',
            background: r === range ? 'var(--text-900)' : 'transparent',
            color: r === range ? 'var(--text-inverse)' : 'var(--text-500)',
            border: r === range ? 'none' : '1px solid var(--border)',
            transition:'all 80ms ease',
          }}>
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
        <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
          <defs>
            <linearGradient id={`grad-${symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={isPositive ? '#16A34A' : '#DC2626'} stopOpacity={0.13}/>
              <stop offset="100%" stopColor={isPositive ? '#16A34A' : '#DC2626'} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-300)', fontFamily:'var(--font)' }}
            tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis orientation="right" width={72}
            tick={{ fontSize:11, fill:'var(--text-300)', fontFamily:'var(--font)' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="close"
            stroke={isPositive ? '#16A34A' : '#DC2626'} strokeWidth={2}
            fill={`url(#grad-${symbol}-${range})`}
            dot={false}
            activeDot={{ r:4, fill:isPositive ? '#16A34A' : '#DC2626',
              stroke:'var(--surface)', strokeWidth:2 }} />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', textAlign:'right', marginTop:6 }}>
        ~30 second delay
      </div>
    </div>
  );
};

export default PriceChart;
