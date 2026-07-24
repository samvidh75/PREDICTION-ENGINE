// src/components/WatchlistWebSocket.tsx
// Phase 30 — Live WebSocket price feed display component.
//
// Renders real-time ticker prices pushed from the server via WebSocket.
// Zero CPU polling overhead — data arrives via server push.

import React from "react";
import { useWatchlistWebSocket } from "../hooks/useWatchlistWebSocket";
import { typography } from "../design/tokens";

interface WatchlistWebSocketProps {
  /** Maximum tickers to display (default: 20) */
  maxDisplay?: number;
  /** CSS class name for the container */
  className?: string;
  /** Tickers to subscribe to for per-ticker filtering */
  watchlistTickers?: string[];
}

export default function WatchlistWebSocket({
  maxDisplay = 20,
  className = "",
  watchlistTickers,
}: WatchlistWebSocketProps) {
  const { livePrices, connectionState, tickCount, reconnect } =
    useWatchlistWebSocket({ watchlistTickers });

  const tickers = Array.from(livePrices.values()).slice(0, maxDisplay);

  const stateColor: Record<string, string> = {
    connected: "text-emerald-400",
    connecting: "text-amber-400",
    disconnected: "text-slate-500",
    error: "text-red-400",
  };

  return (
    <div className={`bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left ${className}`} style={{ fontFamily: typography.fontFamily }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            connectionState === "connected" ? "bg-emerald-400 animate-pulse" :
            connectionState === "connecting" ? "bg-amber-400 animate-pulse" :
            "bg-slate-600"
          }`} />
          <span className="text-slate-400 text-[10px] uppercase tracking-wider">
            Live WebSocket Feed
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className={stateColor[connectionState] ?? "text-slate-500"}>
            {connectionState}
          </span>
          <span className="text-slate-600">
            {tickCount} ticks
          </span>
          {connectionState === "error" && (
            <button
              onClick={reconnect}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Price list */}
      {tickers.length === 0 ? (
        <div className="text-slate-600 italic py-4 text-center">
          {connectionState === "connected"
            ? "Listening for incoming exchange ticks..."
            : connectionState === "connecting"
            ? "Establishing WebSocket connection..."
            : "WebSocket unavailable — using HTTP polling fallback"}
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {tickers.map((tick) => (
            <div
              key={tick.ticker}
              className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0"
            >
              <span className="font-bold text-indigo-400 w-24 truncate">
                {tick.ticker}
              </span>
              <span className="text-slate-200 tabular-nums">
                ₱{tick.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`w-16 text-right tabular-nums ${
                  tick.change_pct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {tick.change_pct >= 0 ? "+" : ""}
                {tick.change_pct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-800/50 text-[9px] text-slate-600 flex justify-between">
        <span>0% CPU polling overhead</span>
        <span>{tickers.length} / {livePrices.size} shown</span>
      </div>
    </div>
  );
}
