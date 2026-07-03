/**
 * React Hook: WebSocket Live Quote Stream
 *
 * Usage:
 *   const { quotes, isConnected, get } = useLiveQuotes(['TCS', 'INFY']);
 *   const tcs = get('TCS'); // LiveQuote | undefined
 *
 * Protocol:
 *   Client → {"type":"subscribe", "symbols":["TCS","INFY"]}
 *   Client → {"type":"unsubscribe", "symbols":["RELIANCE"]}
 *   Server → {"symbol":"TCS", "price":4523.5, "bid":4522.0, "ask":4524.5, "volume":1234567, "timestamp":"..."}
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface LiveQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: string;
  priceChange?: number;
  priceChangePercent?: number;
  source?: string;
}

interface UseLiveQuotesOptions {
  onError?: (error: Error) => void;
  autoConnect?: boolean;
  includeDetails?: boolean;
}

const wsUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/quotes/ws`
    : '';

export function useLiveQuotes(
  symbols: string | string[],
  options: UseLiveQuotesOptions = {}
) {
  const { onError, autoConnect = true, includeDetails = false } = options;

  const [quotes, setQuotes] = useState<Map<string, LiveQuote>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPricesRef = useRef<Map<string, number>>(new Map());

  const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
  const symbolKey = symbolArray.join(',');

  useEffect(() => {
    if (!autoConnect || !symbolArray.length || !wsUrl) return;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WS] Connected');
          setIsConnected(true);

          ws.send(JSON.stringify({
            type: 'subscribe',
            symbols: symbolArray,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'connected') {
              console.log('[WS] Greeting:', data.message);
              return;
            }

            if (data.symbol) {
              const prevPrice = lastPricesRef.current.get(data.symbol);
              const priceChange = prevPrice != null ? data.price - prevPrice : 0;
              const priceChangePercent = prevPrice != null
                ? (priceChange / prevPrice) * 100
                : 0;

              lastPricesRef.current.set(data.symbol, data.price);

              setQuotes((prev) => {
                const next = new Map(prev);
                next.set(data.symbol, {
                  symbol: data.symbol,
                  price: data.price,
                  bid: data.bid,
                  ask: data.ask,
                  volume: data.volume ?? 0,
                  timestamp: data.timestamp ?? new Date().toISOString(),
                  priceChange,
                  priceChangePercent,
                  source: data.source,
                });
                return next;
              });
            }
          } catch (err) {
            console.error('[WS] Parse error:', err);
          }
        };

        ws.onerror = () => {
          const errorMsg = 'WebSocket connection error';
          console.error(errorMsg);
          if (onError) onError(new Error(errorMsg));
        };

        ws.onclose = () => {
          console.log('[WS] Disconnected');
          setIsConnected(false);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[WS] Connection failed:', errorMsg);
        if (onError) onError(new Error(errorMsg));
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          symbols: symbolArray,
        }));
      }
      wsRef.current?.close();
    };
  }, [symbolKey, autoConnect, onError]);

  const get = useCallback((symbol: string): LiveQuote | undefined => {
    return quotes.get(symbol.toUpperCase());
  }, [quotes]);

  const getAll = useCallback((): LiveQuote[] => {
    return Array.from(quotes.values());
  }, [quotes]);

  const subscribe = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbols: [symbol.toUpperCase()] }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols: [symbol.toUpperCase()] }));
    }
  }, []);

  return {
    quotes,
    isConnected,
    get,
    getAll,
    subscribe,
    unsubscribe,
  };
}


