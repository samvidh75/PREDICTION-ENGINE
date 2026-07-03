/**
 * React Hook: WebSocket Live Quote Stream
 *
 * Usage:
 * const quotes = useLiveQuotes(['TCS', 'INFY', 'RELIANCE']);
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface LiveQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
  source: 'indianapi' | 'groww' | 'yahoo';
}

interface UseLiveQuotesOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function useLiveQuotes(
  symbols: string[],
  options: UseLiveQuotesOptions = {}
) {
  const { enabled = true, onError } = options;

  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    const getWsBase = () => {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return `ws://localhost:${window.location.port || '10000'}`;
      }
      return 'wss://api.stockstory-india.com';
    };

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${getWsBase()}/api/quotes/ws`);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);

          ws.send(JSON.stringify({ type: 'subscribe', symbols }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'quote') {
              setQuotes(prev => ({
                ...prev,
                [message.symbol]: {
                  symbol: message.symbol,
                  price: message.price,
                  bid: message.bid,
                  ask: message.ask,
                  volume: message.volume,
                  timestamp: message.timestamp,
                  source: message.source
                }
              }));
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        };

        ws.onerror = () => {
          const errorMsg = 'WebSocket connection error';
          console.error(errorMsg);
          setError(errorMsg);
          if (onError) onError(new Error(errorMsg));
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        };

        wsRef.current = ws;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('WebSocket connection failed:', errorMsg);
        setError(errorMsg);
        if (onError) onError(new Error(errorMsg));
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, symbols.join(','), onError]);

  const subscribe = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbols: [symbol] }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols: [symbol] }));
    }
  }, []);

  return {
    quotes,
    isConnected,
    error,
    subscribe,
    unsubscribe
  };
}
