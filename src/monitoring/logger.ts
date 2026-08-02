export function logEvent(event: string, data: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info') {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    level,
    ...data,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

export function logEngineCalculation(symbol: string, engine: string, score: number, durationMs: number) {
  logEvent('engine_calculation', { symbol, engine, score, duration_ms: durationMs });
}

export function logQuoteFetch(provider: string, symbol: string, durationMs: number, success: boolean) {
  logEvent('quote_fetch', { provider, symbol, duration_ms: durationMs, success }, success ? 'info' : 'error');
}

export function logWebSocketConnection(activeCount: number) {
  logEvent('websocket_connection', { active_connections: activeCount });
}
