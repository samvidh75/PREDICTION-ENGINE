import { useState, useEffect } from 'react';
import { spacing, typography, colors } from '../styles';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { getStockBySymbol } from '../services/scanner/scoringEngine';
import type { FactorScores } from '../services/scanner/scoringEngine';
import type { StockFundamentals } from '../services/scanner/stockUniverse';

interface NewsArticle {
  headline: string;
  source: string;
  time: string;
}

type StockData = StockFundamentals & FactorScores & { news: NewsArticle[] };

const TIMEFRAMES = ['1W', '1M', '3M', '1Y', '5Y'];

function generatePricePath(prices: number[], width = 600, height = 240): string {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const xStep = width / (prices.length - 1);
  return prices.map((p, i) => {
    const x = i * xStep;
    const y = height - ((p - min) / range) * height * 0.85 - height * 0.075;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
}

function generatePrices(basePrice: number, days: number): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i < days; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.02;
    prices.push(Math.max(prices[i - 1] + change, basePrice * 0.5));
  }
  return prices;
}

interface Props {
  symbol?: string;
}

export default function StockDetailPage({ symbol: rawSymbol }: Props) {
  const symbol = rawSymbol ?? 'TCS';
  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1W');
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const result = getStockBySymbol(symbol);
      if (result) {
        setStock({
          ...result,
          news: [
            { headline: `${result.name} posts strong quarterly results`, source: 'Reuters', time: '2h ago' },
            { headline: `Analysts remain bullish on ${result.symbol}`, source: 'ET', time: '4h ago' },
            { headline: `${result.symbol} shows improved fundamentals`, source: 'Bloomberg', time: '1d ago' },
          ],
        });
      }
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [symbol]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', background: colors.bg.primary }}>
        <p style={{ ...typography.bodyText, color: colors.text.secondary }}>Loading stock data...</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', background: colors.bg.primary }}>
        <p style={{ ...typography.bodyText, color: colors.error }}>Stock not found</p>
      </div>
    );
  }

  const prices = generatePrices(stock.price, timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : 365,);
  const pathData = generatePricePath(prices);
  const isUp = stock.change >= 0;
  const lineColor = isUp ? colors.success : colors.error;

  const scoreColor = stock.overall >= 75 ? colors.success : stock.overall >= 60 ? colors.primary : stock.overall >= 45 ? colors.warning : colors.error;

  const FACTORS = [
    { label: 'Quality', value: stock.quality },
    { label: 'Valuation', value: stock.valuation },
    { label: 'Growth', value: stock.growth },
    { label: 'Risk', value: stock.risk },
    { label: 'Technical', value: stock.technical },
  ] as const;

  return (
    <div style={{ background: colors.bg.secondary, minHeight: '100vh', paddingTop: spacing.xl, paddingBottom: spacing.xxl }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto', paddingLeft: spacing.xl, paddingRight: spacing.xl }}>
        <div style={{ marginBottom: spacing.base }}>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            ← Back to home
          </Button>
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.base, marginBottom: spacing.xs }}>
            <h1 style={{ ...typography.pageTitle, color: colors.text.primary, margin: 0 }}>{symbol}</h1>
            <span style={{ ...typography.cardTitle, color: colors.text.secondary }}>{stock.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.base }}>
            <span style={{ ...typography.sectionTitle, color: colors.text.primary }}>
              ₹{stock.price.toLocaleString()}
            </span>
            <span style={{ ...typography.bodyEmphasis, color: lineColor }}>
              {isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <Card padding="md" style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.base, flexWrap: 'wrap' }}>
            {TIMEFRAMES.map((p) => (
              <Button key={p} variant={timeframe === p ? 'primary' : 'secondary'} size="sm" onClick={() => setTimeframe(p)}>
                {p}
              </Button>
            ))}
          </div>
          <svg viewBox="0 0 600 240" style={{ width: '100%', height: 'auto', maxHeight: '240px' }}>
            <path d={pathData} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base, marginBottom: spacing.xl }}>
          <Card padding="md" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
              <h3 style={{ ...typography.cardTitle, color: colors.text.primary, margin: 0 }}>Healthometer</h3>
              <span style={{ ...typography.cardTitle, color: scoreColor }}>{stock.overall}/100</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: spacing.sm }}>
              {FACTORS.map((f) => (
                <div key={f.label} style={{ textAlign: 'center' }}>
                  <div style={{ ...typography.bodyEmphasis, color: colors.primary, marginBottom: spacing.xs }}>{f.value}</div>
                  <div style={{ ...typography.caption, color: colors.text.secondary }}>{f.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button variant={tracking ? 'primary' : 'secondary'} size="sm" onClick={() => setTracking(!tracking)}>
                {tracking ? 'Tracking' : 'Track Stock'}
              </Button>
              <Button variant="secondary" size="sm">Compare Peers</Button>
              <Button variant="primary" size="sm">Invest via Broker</Button>
            </div>
            <p style={{ ...typography.caption, color: colors.text.secondary, marginTop: spacing.base, marginBottom: 0 }}>
              {tracking ? 'You are tracking this stock' : 'Track to get updates on this stock'}
            </p>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base, marginBottom: spacing.xl }}>
          <Card padding="md" style={{ marginBottom: 0 }}>
            <h3 style={{ ...typography.cardTitle, color: colors.text.primary, marginBottom: spacing.base }}>Company Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.base }}>
              {[
                { label: 'Sector', value: stock.sector },
                { label: 'Industry', value: stock.industry },
                { label: 'Market Cap', value: `₹${(stock.marketCap / 100).toFixed(0)}Cr` },
                { label: 'PE Ratio', value: stock.pe.toFixed(1) },
                { label: 'PB Ratio', value: stock.pb.toFixed(1) },
                { label: 'ROE', value: `${stock.roe.toFixed(1)}%` },
                { label: 'Debt/Equity', value: stock.debtToEquity.toFixed(2) },
                { label: 'Dividend Yield', value: `${stock.dividendYield.toFixed(2)}%` },
                { label: 'Revenue Growth', value: `${stock.revenueGrowth.toFixed(1)}%` },
                { label: 'Profit Growth', value: `${stock.profitGrowth.toFixed(1)}%` },
                { label: 'RSI', value: stock.rsi.toFixed(0) },
              ].map((item) => (
                <div key={item.label}>
                  <p style={{ ...typography.caption, color: colors.text.secondary, marginBottom: 2 }}>{item.label}</p>
                  <p style={{ ...typography.bodyEmphasis, color: colors.text.primary, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md" style={{ marginBottom: 0 }}>
            <h3 style={{ ...typography.cardTitle, color: colors.text.primary, marginBottom: spacing.base }}>Recent News</h3>
            {stock.news.map((article, i) => (
              <div key={i} style={{
                paddingBottom: spacing.sm,
                borderBottom: i !== stock.news.length - 1 ? `1px solid ${colors.bg.tertiary}` : 'none',
                marginBottom: i !== stock.news.length - 1 ? spacing.sm : '0',
              }}>
                <p style={{ ...typography.bodyEmphasis, color: colors.text.primary, marginBottom: 2 }}>{article.headline}</p>
                <p style={{ ...typography.caption, color: colors.text.secondary, margin: 0 }}>{article.source} • {article.time}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
