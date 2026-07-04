/**
 * Live Price Feed Component
 * - Real Upstox WebSocket data
 * - Fallback to REST API and cache
 * - Shows live ticks and connection status
 */

import { useEffect, useState } from 'react';
import { Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { colors } from '../design/tokens';
import { upstoxPriceService, PriceUpdate } from '../services/realtime/UpstoxPriceService';

interface LivePriceFeedProps {
  watchlistTickers: string[];
  maxDisplay?: number;
}

export default function LivePriceFeed({ watchlistTickers, maxDisplay = 10 }: LivePriceFeedProps) {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [status, setStatus] = useState<{ connected: boolean; reconnectAttempts: number; ticks: number }>({
    connected: false,
    reconnectAttempts: 0,
    ticks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let tickCount = 0;
    const unsubscribers: (() => void)[] = [];
    let statusInterval: ReturnType<typeof setInterval>;

    const initializeFeed = async () => {
      try {
        // Initialize Upstox service
        await upstoxPriceService.initialize();

        // Subscribe to each ticker
        watchlistTickers.slice(0, maxDisplay).forEach(ticker => {
          const unsubscribe = upstoxPriceService.subscribe(ticker, (update) => {
            setPrices(prev => new Map(prev).set(ticker, update));
            tickCount++;

            // Update status every 10 ticks
            if (tickCount % 10 === 0) {
              const stat = upstoxPriceService.getStatus();
              setStatus({
                connected: stat.connected,
                reconnectAttempts: stat.reconnectAttempts,
                ticks: tickCount
              });
            }
          });

          unsubscribers.push(unsubscribe);

          // Try to fetch from cache/API if WebSocket not ready
          upstoxPriceService.fetchPrice(ticker)
            .then(price => {
              if (price) {
                setPrices(prev => new Map(prev).set(ticker, price));
              }
            })
            .catch(error => console.error(`Failed to fetch ${ticker}:`, error));
        });

        setLoading(false);

        // Update status periodically
        statusInterval = setInterval(() => {
          const stat = upstoxPriceService.getStatus();
          setStatus({
            connected: stat.connected,
            reconnectAttempts: stat.reconnectAttempts,
            ticks: tickCount
          });
        }, 1000);
      } catch (error) {
        console.error('Failed to initialize price feed:', error);
        setLoading(false);
      }
    };

    initializeFeed();

    return () => {
      if (statusInterval) clearInterval(statusInterval);
      unsubscribers.forEach(fn => fn());
    };
  }, [watchlistTickers, maxDisplay]);

  const displayPrices = Array.from(prices.values()).slice(0, maxDisplay);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {status.connected ? (
            <>
              <CheckCircle size={16} color="#22c55e" />
              <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                Live Feed
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={16} color={colors.warning} />
              <span style={{ fontSize: '12px', color: colors.warning, fontWeight: 600 }}>
                Connecting...
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '11px', color: colors.body }}>
          <span>
            <strong>{status.ticks}</strong> ticks
          </span>
          <span>
            CPU: <strong>0%</strong>
          </span>
          <span>
            {displayPrices.length} / {displayPrices.length} shown
          </span>
        </div>
      </div>

      {/* Price List */}
      <div style={{ display: 'grid', gap: 8 }}>
        {loading ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: colors.body,
              fontSize: '13px',
            }}
          >
            Establishing WebSocket connection...
          </div>
        ) : displayPrices.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: colors.body,
              fontSize: '13px',
            }}
          >
            No price data available
          </div>
        ) : (
          displayPrices.map((price, idx) => (
            <PriceRow key={price.symbol} price={price} index={idx} />
          ))
        )}
      </div>
    </div>
  );
}

function PriceRow({ price, index }: { price: PriceUpdate; index: number }) {
  const isPositive = price.changePercent >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: '8px',
        background: index === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: index === 0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.2s ease',
        animation: `slideIn 0.3s ease-out ${index * 0.05}s backwards`,
      }}
    >
      {/* Rank */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '6px',
          background: index === 0 ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '700',
          color: index === 0 ? '#FF6B6B' : colors.body,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>

      {/* Symbol & Price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
            {price.symbol}
          </span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
            ₹{price.price.toFixed(2)}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
          }}
        >
          <span style={{ color: colors.body }}>
            {price.source === 'upstox-ws' ? (
              <>
                <Zap size={10} style={{ marginRight: 4, display: 'inline' }} /> Live
              </>
            ) : (
              <span style={{ opacity: 0.6 }}>{price.source}</span>
            )}
          </span>
          <span style={{ color: changeColor, fontWeight: '600' }}>
            {isPositive ? '↑' : '↓'} {Math.abs(price.changePercent).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Volume */}
      <div
        style={{
          textAlign: 'right',
          minWidth: '60px',
        }}
      >
        <div style={{ fontSize: '11px', color: colors.body }}>
          Vol
        </div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: colors.ink }}>
          {(price.volume / 1e5).toFixed(1)}L
        </div>
      </div>
    </div>
  );
}
