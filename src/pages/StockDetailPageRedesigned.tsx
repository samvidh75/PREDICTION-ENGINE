/**
 * Stock Detail Page - Upstocks-Inspired Layout
 * Separate implementations for mobile and desktop
 * Zero layout gaps, natural eye flow, <1s loading
 */

import { useParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useOHLCData } from '../hooks/useOHLCData';
import StockChart from '../components/StockChart';
import FloatingAIButton from '../components/FloatingAIButton';
import { colors } from '../design/tokens';
import { cacheManager, CACHE_KEYS, CACHE_TTL } from '../services/cache/CacheStrategy';
import { PriceSkeleton, HealthometerSkeleton, ChartSkeleton, MetricsSkeleton, NewsSkeleton } from '../components/SkeletonLoader';

// Detect device type and return layout
function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

// Mock quote data
function getMockQuote(symbol: string) {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 100 + (hash % 3000);
  const change = Math.sin(hash / 100) * 5;
  return {
    symbol,
    exchange: 'NSE' as const,
    price: basePrice,
    open: basePrice * 0.99,
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    volume: 1000000 + (hash % 5000000),
    change,
    changePercent: (change / basePrice) * 100,
    marketCap: 10000 + (hash % 500000),
    peRatio: 10 + ((hash % 1000) / 1000) * 30,
    roe: 5 + ((hash % 1000) / 1000) * 40,
    roce: 8 + ((hash % 1000) / 1000) * 45,
    bookValue: basePrice / (1.5 + (hash % 1000) / 1000),
    dividendYield: 0.2 + ((hash % 1000) / 1000) * 3,
    high52Week: basePrice * 1.5,
    low52Week: basePrice * 0.7,
    eps: basePrice / (10 + ((hash % 1000) / 1000) * 30),
  };
}

export default function StockDetailPageRedesigned() {
  const { symbol } = useParams<{ symbol: string }>();
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  const [timeframe, setTimeframe] = useState<'1D' | '5D' | '1M' | '3M' | '1Y'>('1M');
  const [cachedQuote, setCachedQuote] = useState<any>(null);
  const [isLoadingFromAPI, setIsLoadingFromAPI] = useState(false);

  // Initialize cache on mount
  useEffect(() => {
    cacheManager.initialize().catch(console.error);
  }, []);

  // Get quote from cache or mock data instantly
  const mockQuote = useMemo(() => getMockQuote(symbol || ''), [symbol]);

  // Load cached data first (instant), then refresh in background
  useEffect(() => {
    if (!symbol) return;

    (async () => {
      // Try to get from cache first (instant)
      const cachedData = await cacheManager.get(CACHE_KEYS.PRICE(symbol));
      if (cachedData) {
        setCachedQuote(cachedData);
      } else {
        // Use mock data while loading
        setCachedQuote(mockQuote);
      }

      // Refresh from API in background (non-blocking)
      setIsLoadingFromAPI(true);
      setTimeout(() => {
        // Simulate API fetch
        const freshData = getMockQuote(symbol);
        cacheManager.set(CACHE_KEYS.PRICE(symbol), freshData, CACHE_TTL.PRICE);
        setCachedQuote(freshData);
        setIsLoadingFromAPI(false);
      }, 100);
    })();
  }, [symbol, mockQuote]);

  const { data: ohlcData } = useOHLCData({
    symbol: symbol || '',
    timeframe,
    enabled: !!symbol,
    refreshInterval: 60000
  });

  useEffect(() => {
    setDeviceType(getDeviceType());
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!symbol) return <div style={{ padding: '16px' }}>Symbol not provided</div>;

  const quote = cachedQuote || mockQuote;
  const changeColor = quote.changePercent >= 0 ? '#22c55e' : '#ef4444';

  return deviceType === 'mobile'
    ? <MobileLayout quote={quote} symbol={symbol} timeframe={timeframe} setTimeframe={setTimeframe} ohlcData={ohlcData} changeColor={changeColor} isLoading={isLoadingFromAPI} />
    : <DesktopLayout quote={quote} symbol={symbol} timeframe={timeframe} setTimeframe={setTimeframe} ohlcData={ohlcData} changeColor={changeColor} isLoading={isLoadingFromAPI} />;
}

// ============================================
// DESKTOP LAYOUT (Upstocks Style)
// ============================================
function DesktopLayout({ quote, symbol, timeframe, setTimeframe, ohlcData, changeColor, isLoading }: any) {
  return (
    <div style={{
      background: colors.canvas,
      color: colors.textPrimary,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>

        {/* Section 1: Price + Healthometer (Top Row) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Left: Price Header */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>{symbol}</h1>
            <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '12px' }}>NSE</div>
            <div style={{ fontSize: '48px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              ₹{quote.price.toFixed(2)}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: changeColor }}>
              {quote.changePercent >= 0 ? '↑ +' : '↓ '}{Math.abs(quote.changePercent).toFixed(2)}%
            </div>
          </div>

          {/* Right: Healthometer Score (Skeleton Ready) */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '4px solid #ffc533',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: '700',
                margin: '0 auto 12px'
              }}>
                70
              </div>
              <div style={{ fontSize: '12px', color: colors.textSecondary }}>HEALTHOMETER</div>
            </div>
          </div>
        </div>

        {/* Section 2: Chart + Key Metrics (No Gap) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Left: Chart */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>PRICE CHART</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['1D', '5D', '1M', '3M', '1Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      backgroundColor: timeframe === tf ? colors.primary : colors.canvas,
                      color: timeframe === tf ? '#000' : colors.textSecondary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <StockChart symbol={symbol} ohlcData={ohlcData || []} timeframe={timeframe} height={280} />
          </div>

          {/* Right: Key Metrics Grid (Screener.in Style) */}
          {isLoading ? <MetricsSkeleton /> : <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>KEY METRICS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MetricRow label="Market Cap" value={`₹${quote.marketCap.toFixed(0)}Cr`} />
              <MetricRow label="P/E (TTM)" value={quote.peRatio.toFixed(2)} />
              <MetricRow label="Book Value" value={`₹${quote.bookValue.toFixed(2)}`} />
              <MetricRow label="P/B Ratio" value={(quote.price / quote.bookValue).toFixed(2)} />
              <MetricRow label="ROE" value={`${quote.roe.toFixed(1)}%`} />
              <MetricRow label="ROCE" value={`${quote.roce.toFixed(1)}%`} />
              <MetricRow label="Div Yield" value={`${quote.dividendYield.toFixed(2)}%`} />
              <MetricRow label="52W High" value={`₹${quote.high52Week.toFixed(0)}`} />
              <MetricRow label="52W Low" value={`₹${quote.low52Week.toFixed(0)}`} />
              <MetricRow label="EPS" value={`₹${quote.eps.toFixed(2)}`} />
            </div>
          </div>}
        </div>

        {/* Section 3: Research Summary + AI Chat + News (No Gap) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1.5fr',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Left: Research Summary */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>RESEARCH SUMMARY</h3>
            <p style={{ margin: '0', fontSize: '13px', lineHeight: '1.5', color: colors.textPrimary }}>
              Stock shows strong fundamentals with ROE {">"} 15% and ROCE {">"} 20%. Valuation attractive at P/E below 20x. Revenue growth consistent. Monitor debt levels and sector trends.
            </p>
          </div>

          {/* Middle: AI Chat */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '12px', textAlign: 'center', color: colors.textSecondary }}>AI Research Chat</div>
            <div style={{ fontSize: '11px', textAlign: 'center', color: colors.textSecondary, marginTop: '8px' }}>Ask about this stock</div>
          </div>

          {/* Right: News */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>LATEST NEWS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <NewsItem title="Stock rises on strong Q3 earnings" source="Yahoo Finance" />
              <NewsItem title="Analyst upgrades rating" source="MoneyControl" />
              <NewsItem title="Sector momentum continues" source="BusinessToday" />
            </div>
          </div>
        </div>

        {/* Section 4: Pros/Cons + About (No Gap) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          {/* Pros/Cons */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>INVESTMENT THESIS</h3>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#22c55e', marginBottom: '4px' }}>Pros:</div>
              <ul style={{ margin: '0 0 12px 0', paddingLeft: '16px', fontSize: '12px' }}>
                <li>Strong ROE & ROCE</li>
                <li>Attractive valuation</li>
              </ul>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>Cons:</div>
              <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '12px' }}>
                <li>High debt levels</li>
                <li>Sector cyclicality</li>
              </ul>
            </div>
          </div>

          {/* About */}
          <div style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>ABOUT</h3>
            <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.5', color: colors.textPrimary }}>
              Company operates in automotive sector with strong market presence. Revenue CAGR 12% over 3 years. Recently upgraded to positive outlook.
            </p>
          </div>
        </div>
      </div>
      <FloatingAIButton />
    </div>
  );
}

// ============================================
// MOBILE LAYOUT (Optimized for phones)
// ============================================
function MobileLayout({ quote, symbol, timeframe, setTimeframe, ohlcData, changeColor, isLoading }: any) {
  return (
    <div style={{
      background: colors.canvas,
      color: colors.textPrimary,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ padding: '12px' }}>

        {/* Price Header */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700' }}>{symbol}</h1>
          <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '12px' }}>NSE</div>
          <div style={{ fontSize: '36px', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
            ₹{quote.price.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: changeColor }}>
            {quote.changePercent >= 0 ? '↑ +' : '↓ '}{Math.abs(quote.changePercent).toFixed(2)}%
          </div>
        </div>

        {/* Healthometer */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '4px solid #ffc533',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '700',
            margin: '0 auto 8px'
          }}>
            70
          </div>
          <div style={{ fontSize: '11px', color: colors.textSecondary }}>HEALTHOMETER</div>
        </div>

        {/* Chart */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <h3 style={{ margin: '0', fontSize: '12px', fontWeight: '600' }}>CHART</h3>
            <div style={{ display: 'flex', gap: '2px' }}>
              {(['1D', '5D', '1M', '3M'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    backgroundColor: timeframe === tf ? colors.primary : colors.canvas,
                    color: timeframe === tf ? '#000' : colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <StockChart symbol={symbol} ohlcData={ohlcData || []} timeframe={timeframe} height={200} />
        </div>

        {/* Key Metrics (Stacked) */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>KEY METRICS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <MetricRow label="Market Cap" value={`₹${quote.marketCap.toFixed(0)}Cr`} />
            <MetricRow label="P/E" value={quote.peRatio.toFixed(2)} />
            <MetricRow label="ROE" value={`${quote.roe.toFixed(1)}%`} />
            <MetricRow label="ROCE" value={`${quote.roce.toFixed(1)}%`} />
            <MetricRow label="52W High" value={`₹${quote.high52Week.toFixed(0)}`} />
            <MetricRow label="52W Low" value={`₹${quote.low52Week.toFixed(0)}`} />
          </div>
        </div>

        {/* Research Summary */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>SUMMARY</h3>
          <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.5', color: colors.textPrimary }}>
            Strong fundamentals with ROE {">"} 15%. Attractive valuation. Monitor debt and sector trends.
          </p>
        </div>

        {/* AI Chat */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '4px' }}>💬</div>
          <div style={{ fontSize: '12px', fontWeight: '600' }}>Ask AI about {symbol}</div>
        </div>

        {/* News */}
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary }}>NEWS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <NewsItem title="Strong Q3 earnings" source="Yahoo" />
            <NewsItem title="Analyst upgrade" source="MoneyControl" />
          </div>
        </div>
      </div>
      <FloatingAIButton />
    </div>
  );
}

// ============================================
// Components
// ============================================

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
      <span style={{ color: colors.textSecondary }}>{label}</span>
      <span style={{ fontWeight: '600' }}>{value}</span>
    </div>
  );
}

function NewsItem({ title, source }: { title: string; source: string }) {
  return (
    <div style={{
      fontSize: '12px',
      lineHeight: '1.4',
      paddingBottom: '8px',
      borderBottom: `1px solid ${colors.border}`
    }}>
      <div>{title}</div>
      <div style={{ fontSize: '11px', color: colors.textSecondary }}>{source}</div>
    </div>
  );
}
