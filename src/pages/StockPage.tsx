import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, TrendingUp, Shield, BarChart3, Newspaper } from 'lucide-react';
import { color, font, space, radius, typeScale, layout } from '../design/tokens';
import { Button } from '../components/ui/Button';
import { Card, CardLabel } from '../components/ui/Card';
import { Stat } from '../components/ui/Stat';
import { Badge } from '../components/ui/Badge';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getStockBySymbol } from '../services/scanner/scoringEngine';
import type { FactorScores } from '../services/scanner/scoringEngine';
import type { StockFundamentals } from '../services/scanner/stockUniverse';

interface StockData extends StockFundamentals, FactorScores {}

const TIMEFRAMES = ['1W', '1M', '3M', '1Y', '5Y'] as const;

function generatePrices(base: number, days: number, seed: number): number[] {
  const prices: number[] = [base];
  let p = base;
  for (let i = 1; i < days; i++) {
    const change = (Math.sin(seed + i * 0.3) * 0.015 + (Math.random() - 0.48) * 0.02) * base;
    p = Math.max(p + change, base * 0.5);
    prices.push(p);
  }
  return prices;
}

function StockSkeleton() {
  return (
    <div style={{ maxWidth: layout.maxContentWidth, margin: '0 auto', padding: `0 ${space[3]}` }}>
      <div style={{ height: 24, width: 120, background: color.bgAlt, borderRadius: radius.sm, marginBottom: space[4] }} />
      <div style={{ height: 36, width: 200, background: color.bgAlt, borderRadius: radius.sm, marginBottom: space[2] }} />
      <div style={{ height: 16, width: 160, background: color.bgAlt, borderRadius: radius.sm, marginBottom: space[8] }} />
      <div style={{ height: 240, background: color.bgAlt, borderRadius: radius.md, marginBottom: space[6] }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space[4] }}>
        <div style={{ height: 120, background: color.bgAlt, borderRadius: radius.md }} />
        <div style={{ height: 120, background: color.bgAlt, borderRadius: radius.md }} />
      </div>
    </div>
  );
}

function StockError({ symbol }: { symbol: string }) {
  return (
    <div style={{ textAlign: 'center', padding: `${space[12]} ${space[3]}` }}>
      <p style={{ fontSize: '18px', fontWeight: 600, color: color.text, marginBottom: space[2] }}>
        Stock not found
      </p>
      <p style={{ fontSize: '14px', color: color.textMuted }}>
        We could not find data for {symbol}.
      </p>
    </div>
  );
}

interface Props {
  symbol?: string;
}

export default function StockDetailPage({ symbol: rawSymbol }: Props) {
  const symbol = rawSymbol ?? 'TCS';
  const [stock, setStock] = useState<StockData | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [timeframe, setTimeframe] = useState<typeof TIMEFRAMES[number]>('1Y');
  const [tracking, setTracking] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    setStatus('loading');
    const timer = setTimeout(() => {
      const result = getStockBySymbol(symbol);
      if (result) {
        setStock(result);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [symbol]);

  const prices = useMemo(() => {
    if (!stock) return [];
    const days = timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '1Y' ? 365 : 1825;
    return generatePrices(stock.price, days, stock.price);
  }, [stock, timeframe]);

  if (status === 'loading') return <StockSkeleton />;
  if (status === 'error' || !stock) return <StockError symbol={symbol} />;

  const isUp = stock.change >= 0;
  const lineColor = isUp ? color.success : color.danger;

  const FACTORS = [
    { label: 'Quality', value: stock.quality },
    { label: 'Valuation', value: stock.valuation },
    { label: 'Growth', value: stock.growth },
    { label: 'Risk', value: stock.risk },
    { label: 'Technical', value: stock.technical },
  ];

  const width = 600;
  const height = 200;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pathData = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 20) - 10;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');

  const areaPath = pathData + ` L${width},${height} L0,${height} Z`;

  const sectionGap = isDesktop ? space[8] : space[6];
  const pagePadX = isDesktop ? space[6] : space[3];

  return (
    <div style={{ background: color.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: layout.maxContentWidth, margin: '0 auto', paddingLeft: pagePadX, paddingRight: pagePadX }}>

        {/* 1. Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space[3], marginBottom: space[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
            <Button variant="ghost" onClick={() => window.history.back()} style={{ padding: 0, height: 'auto', width: 'auto' }}>
              <ArrowLeft size={18} color={color.textMuted} />
            </Button>
            <div>
              <h1 style={{ fontFamily: font, fontSize: '28px', fontWeight: 600, lineHeight: '1.2', color: color.text, margin: 0 }}>
                {symbol}
              </h1>
              <span style={{ fontSize: '14px', color: color.textMuted }}>{stock.name}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setTracking(!tracking)}>
              {tracking ? 'Tracking' : 'Track'}
            </Button>
            <Button variant="secondary">Compare</Button>
            <Button variant="primary">Invest</Button>
          </div>
        </div>

        {/* 2. Price block */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: space[2], marginBottom: space[6] }}>
          <span style={{ fontFamily: '"SFMono-Regular", Consolas, monospace', fontSize: '32px', fontWeight: 600, color: color.text }}>
            ₹{stock.price.toLocaleString('en-IN')}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '14px', fontWeight: 600, color: lineColor,
          }}>
            {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
          </span>
        </div>

        {/* 3. Price chart */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <div style={{ display: 'flex', gap: space[2], marginBottom: space[3], flexWrap: 'wrap' }}>
            {TIMEFRAMES.map((tf) => (
              <Button key={tf} variant={timeframe === tf ? 'primary' : 'ghost'} onClick={() => setTimeframe(tf)} style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}>
                {tf}
              </Button>
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={pathData} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Card>

        {/* 4. Score overview */}
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: space[4], marginBottom: sectionGap }}>
          <Card padding="md">
            <CardLabel>Health</CardLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: space[2], marginBottom: space[4] }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: color.text }}>{stock.overall}</span>
              <span style={{ fontSize: '14px', color: color.textMuted }}>/100</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: space[2] }}>
              {FACTORS.map((f) => (
                <div key={f.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: color.primary }}>{f.value}</div>
                  <div style={{ fontSize: '10px', color: color.textMuted, textTransform: 'uppercase' }}>{f.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card padding="md">
            <CardLabel>Risk</CardLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: space[2], marginBottom: space[4] }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: color.text }}>{stock.risk}</span>
              <span style={{ fontSize: '14px', color: color.textMuted }}>/100</span>
            </div>
            <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
              <Badge value={stock.quality} label="Q" />
              <Badge value={stock.valuation} label="V" />
              <Badge value={stock.growth} label="G" />
              <Badge value={stock.risk} label="R" />
              <Badge value={stock.technical} label="T" />
            </div>
          </Card>
        </div>

        {/* 5. Key metrics grid */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <CardLabel>Key Metrics</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: space[4] }}>
            <Stat label="Market Cap" value={`₹${(stock.marketCap / 100).toFixed(0)}Cr`} />
            <Stat label="PE (TTM)" value={stock.pe.toFixed(1)} />
            <Stat label="PB Ratio" value={stock.pb.toFixed(1)} />
            <Stat label="ROE" value={`${stock.roe.toFixed(1)}%`} />
            <Stat label="Debt/Equity" value={stock.debtToEquity.toFixed(2)} />
            <Stat label="Dividend Yield" value={`${stock.dividendYield.toFixed(2)}%`} />
            <Stat label="Revenue Growth" value={`${stock.revenueGrowth.toFixed(1)}%`} />
            <Stat label="Profit Growth" value={`${stock.profitGrowth.toFixed(1)}%`} />
            <Stat label="RSI" value={stock.rsi.toFixed(0)} />
          </div>
        </Card>

        {/* 6. About company */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <CardLabel>About</CardLabel>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: color.text, marginBottom: space[4] }}>
            {stock.name} is a leading {stock.industry.toLowerCase()} company in the {stock.sector.toLowerCase()} sector.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: space[3] }}>
            <Stat label="Sector" value={stock.sector} />
            <Stat label="Industry" value={stock.industry} />
            <Stat label="Exchange" value="NSE" />
            <Stat label="Symbol" value={stock.symbol} />
          </div>
        </Card>

        {/* 7. Financials (simplified) */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <CardLabel>Financials</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: space[4] }}>
            <div>
              <div style={{ fontSize: '12px', color: color.textMuted, marginBottom: space[2] }}>Revenue</div>
              <div style={{ height: 8, background: color.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, stock.revenueGrowth * 3)}%`, background: color.primary, borderRadius: radius.sm }} />
              </div>
              <div style={{ fontSize: '12px', color: color.textMuted, marginTop: space[1] }}>{stock.revenueGrowth.toFixed(1)}% YoY</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: color.textMuted, marginBottom: space[2] }}>Profit</div>
              <div style={{ height: 8, background: color.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, stock.profitGrowth * 3)}%`, background: color.success, borderRadius: radius.sm }} />
              </div>
              <div style={{ fontSize: '12px', color: color.textMuted, marginTop: space[1] }}>{stock.profitGrowth.toFixed(1)}% YoY</div>
            </div>
          </div>
        </Card>

        {/* 8. Shareholdings (simplified) */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <CardLabel>Shareholding Pattern</CardLabel>
          <div style={{ display: 'grid', gap: space[3] }}>
            {[
              { label: 'Promoter', pct: stock.debtToEquity < 0.5 ? 52 : 35 },
              { label: 'FII', pct: stock.debtToEquity < 0.5 ? 28 : 22 },
              { label: 'DII', pct: stock.debtToEquity < 0.5 ? 12 : 18 },
              { label: 'Retail', pct: stock.debtToEquity < 0.5 ? 8 : 25 },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                <span style={{ fontSize: '12px', color: color.textMuted, width: 70, flexShrink: 0 }}>{s.label}</span>
                <div style={{ flex: 1, height: 6, background: color.border, borderRadius: radius.sm, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: color.primary, borderRadius: radius.sm }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: color.text, width: 40, textAlign: 'right' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 9. News */}
        <Card padding="md" style={{ marginBottom: sectionGap }}>
          <CardLabel>Recent News</CardLabel>
          {[
            { headline: `${stock.name} posts strong quarterly results`, source: 'Reuters', time: '2h ago' },
            { headline: `Analysts remain bullish on ${stock.symbol}`, source: 'ET', time: '4h ago' },
            { headline: `${stock.symbol} shows improved fundamentals`, source: 'Bloomberg', time: '1d ago' },
            { headline: `${stock.sector} sector outlook remains positive`, source: 'Mint', time: '2d ago' },
            { headline: `${stock.name} among top performers in ${stock.industry}`, source: 'CNBC', time: '3d ago' },
          ].map((article, i) => (
            <div key={i} style={{
              paddingBottom: i < 4 ? space[3] : 0,
              borderBottom: i < 4 ? `1px solid ${color.border}` : 'none',
              marginBottom: i < 4 ? space[3] : 0,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: color.text, marginBottom: 2 }}>
                {article.headline}
              </p>
              <p style={{ fontSize: '12px', color: color.textMuted, margin: 0 }}>
                {article.source} · {article.time}
              </p>
            </div>
          ))}
        </Card>

      </div>
    </div>
  );
}
