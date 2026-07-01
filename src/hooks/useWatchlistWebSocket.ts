// src/hooks/useWatchlistWebSocket.ts
// Phase 30 — Real-time WebSocket price stream for watchlist widgets.
//
// Connects to the server's /ws/v1/live-stream endpoint and maintains
// a live price map that React components can consume.
// Falls back gracefully if WebSocket is unavailable.

import { useEffect, useRef, useState, useCallback } from "react";

/** A single ticker price tick from the WebSocket stream. */
export interface TickerTick {
  ticker: string;
  price: number;
  change_pct: number;
}

/** Connection state for the WebSocket. */
export type WsConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface UseWatchlistWebSocketOptions {
  /** WebSocket endpoint URL (defaults to relative /ws/v1/live-stream) */
  url?: string;
  /** Auto-reconnect delay in ms (default: 5000) */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnects?: number;
}

interface UseWatchlistWebSocketReturn {
  /** Live price map keyed by ticker symbol */
  livePrices: Map<string, TickerTick>;
  /** Current WebSocket connection state */
  connectionState: WsConnectionState;
  /** Number of ticks received since connection */
  tickCount: number;
  /** Manually reconnect */
  reconnect: () => void;
}

export function useWatchlistWebSocket(
  options: UseWatchlistWebSocketOptions = {},
): UseWatchlistWebSocketReturn {
  const {
    url = "/ws/v1/live-stream",
    reconnectDelay = 5000,
    maxReconnects = 10,
  } = options;

  const [livePrices, setLivePrices] = useState<Map<string, TickerTick>>(new Map());
  const [connectionState, setConnectionState] = useState<WsConnectionState>("disconnected");
  const [tickCount, setTickCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Determine WebSocket URL based on current page location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = url.startsWith("ws") ? url : `${protocol}//${window.location.host}${url}`;

    setConnectionState("connecting");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === "ticker_tick") {
            setLivePrices((prev) => {
              const next = new Map(prev);
              next.set(packet.ticker, {
                ticker: packet.ticker,
                price: packet.price,
                change_pct: packet.change_pct,
              });
              return next;
            });
            setTickCount((c) => c + 1);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnectionState("disconnected");
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectCountRef.current < maxReconnects) {
          reconnectCountRef.current++;
          const delay = reconnectDelay * Math.min(reconnectCountRef.current, 5);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setConnectionState("error");
        }
      };

      ws.onerror = () => {
        setConnectionState("error");
      };
    } catch {
      setConnectionState("error");
    }
  }, [url, reconnectDelay, maxReconnects]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectCountRef.current = 0;
    wsRef.current?.close();
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { livePrices, connectionState, tickCount, reconnect };
}
