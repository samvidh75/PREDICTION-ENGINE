import { useEffect, useState, useCallback } from 'react';

export interface TrendingStock {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number; // in millions
  inMinutesUp: number; // minutes stock has been trending up
  source: string;
}

interface UseTrendingStocksResult {
  trending: TrendingStock[];
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  reconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/api/ws/trending';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useTrendingStocks(): UseTrendingStocksResult {
  const [trending, setTrending] = useState<TrendingStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(() => {
    if (ws) return; // Already connecting

    try {
      const websocket = new WebSocket(WS_URL);

      websocket.onopen = () => {
        console.log('[useTrendingStocks] Connected to trending WebSocket');
        setIsConnected(true);
        setLoading(false);
        setError(null);
        setReconnectAttempts(0);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'trending' && Array.isArray(data.stocks)) {
            setTrending(data.stocks);
          } else if (data.type === 'ping') {
            websocket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (parseError) {
          console.error('[useTrendingStocks] Failed to parse message:', parseError);
        }
      };

      websocket.onerror = (event) => {
        const err = new Error('WebSocket error');
        console.error('[useTrendingStocks] Error:', event);
        setError(err);
        setIsConnected(false);
        setLoading(false);
      };

      websocket.onclose = () => {
        console.log('[useTrendingStocks] WebSocket closed');
        setIsConnected(false);
        setWs(null);

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
          console.log(`[useTrendingStocks] Reconnecting in ${delay}ms...`);
          setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        } else {
          setError(new Error('Max reconnection attempts reached'));
        }
      };

      setWs(websocket);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useTrendingStocks] Failed to connect:', error);
      setError(error);
      setLoading(false);
    }
  }, [ws, reconnectAttempts]);

  const reconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setReconnectAttempts(0);
    setLoading(true);
    connect();
  }, [ws, connect]);

  useEffect(() => {
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return {
    trending,
    loading,
    error,
    isConnected,
    reconnect,
  };
}
