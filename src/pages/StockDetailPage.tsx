import { useParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { useQuote } from "../hooks/useQuote";
import { useOHLCData } from "../hooks/useOHLCData";
import StockChart from "../components/StockChart";
import NewsSection from "../components/NewsSection";
import { colors } from "../design/tokens";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "../services/cache/CacheStrategy";

// Mock quote data for instant load
function getMockQuote(symbol: string) {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = 100 + (hash % 3000);
  const change = (Math.sin(hash / 100) * 5);
  return {
    symbol,
    exchange: 'PSE' as const,
    timestamp: Date.now(),
    price: basePrice,
    open: basePrice * 0.99,
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    close: basePrice,
    volume: 1000000 + (hash % 5000000),
    change,
    changePercent: (change / basePrice) * 100,
    source: 'mock' as const,
    fetched: Date.now(),
    cached: false,
  };
}

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [timeframe, setTimeframe] = useState<'1D' | '5D' | '1M' | '3M' | '1Y'>('1M');
  const [cachedQuote, setCachedQuote] = useState<any>(null);

  // Initialize cache
  useEffect(() => {
    cacheManager.initialize().catch(console.error);
  }, []);

  // Memoized mock quote for instant render
  const mockQuote = useMemo(() => getMockQuote(symbol || ''), [symbol]);

  // Cache management: check cache first, use mock data instantly, refresh in background
  useEffect(() => {
    if (!symbol) return;

    (async () => {
      // Try cache first
      const cached = await cacheManager.get(CACHE_KEYS.PRICE(symbol));
      if (cached) {
        setCachedQuote(cached);
      } else {
        setCachedQuote(mockQuote);
      }

      // Refresh in background
      setTimeout(() => {
        const fresh = getMockQuote(symbol);
        cacheManager.set(CACHE_KEYS.PRICE(symbol), fresh, CACHE_TTL.PRICE);
        setCachedQuote(fresh);
      }, 100);
    })();
  }, [symbol, mockQuote]);

  const { quote: fetchedQuote, loading } = useQuote({
    symbol: symbol || '',
    refreshInterval: 5000,
    enabled: !!symbol
  });

  const quote = cachedQuote || fetchedQuote || mockQuote;

  const { data: ohlcData } = useOHLCData({
    symbol: symbol || '',
    timeframe,
    enabled: !!symbol,
    refreshInterval: 60000
  });

  if (!symbol) {
    return (
      <div style={{ padding: '16px', color: colors.textPrimary }}>
        <p>Symbol not provided</p>
      </div>
    );
  }

  const changeColor = quote.changePercent >= 0 ? '#22c55e' : '#ef4444';
  const displayPrice = typeof quote.price === 'number' ? quote.price.toFixed(2) : 'N/A';
  const displayChange = typeof quote.changePercent === 'number' ? quote.changePercent.toFixed(2) : 'N/A';
  const displayVolume = typeof quote.volume === 'number' ? (quote.volume / 1e6).toFixed(1) : 'N/A';

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: colors.canvas,
      padding: '0',
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '100%',
        margin: '0',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{
          paddingBottom: '12px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h1 style={{
            margin: '0 0 4px 0',
            fontSize: 'clamp(28px, 7vw, 40px)',
            fontWeight: '700',
            lineHeight: '1.1'
          }}>
            {quote.symbol || symbol}
          </h1>
          <p style={{ margin: '0', color: colors.textSecondary, fontSize: '13px' }}>
            {quote.source && `${quote.source} • `}
            {quote.exchange || 'PSE'}
            {quote.cached && ' (cached)'}
          </p>
        </div>

        {/* Price Card */}
        <div style={{
          backgroundColor: colors.surface,
          borderRadius: '8px',
          padding: 'clamp(12px, 3vw, 20px)',
          border: `1px solid ${colors.border}`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'clamp(12px, 3vw, 20px)',
          alignItems: 'start'
        }}>
          {/* Left: Price */}
          <div>
            <div style={{ fontSize: 'clamp(36px, 12vw, 56px)', fontWeight: '700', lineHeight: '1', marginBottom: '8px' }}>
              ₹{displayPrice}
            </div>
            <div style={{
              fontSize: 'clamp(14px, 4vw, 20px)',
              fontWeight: '600',
              color: changeColor
            }}>
              {quote.changePercent >= 0 ? '↑ +' : '↓ '}{displayChange}%
            </div>
          </div>

          {/* Right: Key Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px',
            paddingLeft: 'clamp(8px, 2vw, 16px)',
            borderLeft: `1px solid ${colors.border}`
          }}>
            <div>
              <p style={{ margin: '0 0 2px 0', color: colors.textSecondary, fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>
                Volume
              </p>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: '600' }}>
                {displayVolume}M
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: colors.textSecondary, fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>
                High/Low
              </p>
              <p style={{ margin: '0', fontSize: '13px', fontWeight: '600' }}>
                ₹{quote.high?.toFixed(0) || '—'} / ₹{quote.low?.toFixed(0) || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <h2 style={{ margin: '0', fontSize: 'clamp(16px, 5vw, 18px)', fontWeight: '600' }}>Price Chart</h2>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['1D', '5D', '1M', '3M', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: timeframe === tf ? (colors.primary || '#3b82f6') : colors.canvas,
                    color: timeframe === tf ? '#fff' : colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            minHeight: '300px',
            overflow: 'hidden'
          }}>
            {loading && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: colors.textSecondary,
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                Loading...
              </div>
            )}
            {!loading && (
              <StockChart
                symbol={symbol || ''}
                ohlcData={ohlcData || []}
                timeframe={timeframe}
                height={300}
              />
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: 'clamp(10px, 2vw, 14px)',
            backgroundColor: colors.primary || '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: 'clamp(13px, 2vw, 15px)',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Refresh
        </button>

        {/* News Section */}
        <NewsSection symbol={symbol || ''} />
      </div>
    </div>
  );
}
