import React from "react";
import { useMarketData, MarketData } from "../hooks/useMarketData";

export function MarketDashboard({ symbol }: { symbol: string }) {
  const { data, loading, error } = useMarketData(symbol);

  if (loading) return <div className="market-dashboard-loading" data-testid="market-loading">Loading {symbol}...</div>;
  if (error) return <div className="market-dashboard-error" data-testid="market-error">Error: {error.message}</div>;
  if (!data) return <div className="market-dashboard-empty" data-testid="market-empty">No data for {symbol}</div>;

  return (
    <div className="market-dashboard" data-testid="market-dashboard">
      <QuoteCard quote={data.quote} symbol={data.symbol} />
      <TechnicalIndicators indicators={data.technical_indicators} />
      <EMAAnalyzer
        symbol={data.symbol}
        crosses={data.ema_crosses}
        ema50={data.technical_indicators.ema_50}
        ema200={data.technical_indicators.ema_200}
      />
      <OptionGreeks greeks={data.options_greeks} />
    </div>
  );
}

function QuoteCard({
  quote,
  symbol,
}: {
  quote: MarketData["quote"];
  symbol: string;
}) {
  if (!quote) return <div className="quote-card">No quote data</div>;
  return (
    <div className="quote-card" data-testid="quote-card">
      <h2>{symbol}</h2>
      <p className="price" data-testid="current-price">₹{quote.price?.toFixed(2)}</p>
      <div className="quote-details">
        <span>Bid: ₹{quote.bid?.toFixed(2) ?? '—'}</span>
        <span>Ask: ₹{quote.ask?.toFixed(2) ?? '—'}</span>
        <span>Volume: {quote.volume ? (quote.volume / 1e6).toFixed(2) + 'M' : '—'}</span>
      </div>
    </div>
  );
}

function TechnicalIndicators({
  indicators,
}: {
  indicators: MarketData["technical_indicators"];
}) {
  return (
    <div className="indicators-card" data-testid="technical-indicators">
      <h3>Technical Indicators</h3>
      <table>
        <tbody>
          <tr>
            <td>RSI (14)</td>
            <td data-testid="indicator-rsi">
              {formatVal(indicators.rsi_14)}
              {indicators.rsi_14 !== null && indicators.rsi_14 > 70 ? ' Overbought' : ''}
              {indicators.rsi_14 !== null && indicators.rsi_14 < 30 ? ' Oversold' : ''}
            </td>
          </tr>
          <tr><td>MACD</td><td>{formatVal(indicators.macd)}</td></tr>
          <tr><td>MACD Signal</td><td>{formatVal(indicators.macd_signal)}</td></tr>
          <tr><td>BB Upper</td><td>{formatVal(indicators.bb_upper)}</td></tr>
          <tr><td>BB Middle</td><td>{formatVal(indicators.bb_middle)}</td></tr>
          <tr><td>BB Lower</td><td>{formatVal(indicators.bb_lower)}</td></tr>
          <tr><td>ATR (14)</td><td>{formatVal(indicators.atr_14)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function EMAAnalyzer({
  symbol,
  crosses,
  ema50,
  ema200,
}: {
  symbol: string;
  crosses: MarketData["ema_crosses"];
  ema50: number | null;
  ema200: number | null;
}) {
  return (
    <div className="ema-card" data-testid="ema-analyzer">
      <h3>EMA Analysis</h3>
      <p>EMA 50: {formatVal(ema50)} &middot; EMA 200: {formatVal(ema200)}</p>
      {ema50 !== null && ema200 !== null && (
        <p>
          Status: {ema50 > ema200 ? 'Bullish (50 above 200)' : 'Bearish (50 below 200)'}
        </p>
      )}
      {crosses.length > 0 ? (
        <ul>
          {crosses.map((cross, i) => (
            <li key={i}>
              {cross.type === "GOLDEN_CROSS" ? 'Golden Cross' : 'Death Cross'} on {new Date(cross.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p>No recent crosses</p>
      )}
    </div>
  );
}

function OptionGreeks({
  greeks,
}: {
  greeks: MarketData["options_greeks"];
}) {
  return (
    <div className="greeks-card" data-testid="option-greeks">
      <h3>Option Greeks (ATM, 30 DTE)</h3>
      <div className="greeks-grid">
        <div>
          <h4>Call</h4>
          <p>Δ: {greeks.call.delta?.toFixed(3) ?? '—'}</p>
          <p>Γ: {greeks.call.gamma?.toFixed(3) ?? '—'}</p>
          <p>ν: {greeks.call.vega?.toFixed(3) ?? '—'}</p>
          <p>Θ: {greeks.call.theta?.toFixed(3) ?? '—'}</p>
        </div>
        <div>
          <h4>Put</h4>
          <p>Δ: {greeks.put.delta?.toFixed(3) ?? '—'}</p>
          <p>Γ: {greeks.put.gamma?.toFixed(3) ?? '—'}</p>
          <p>ν: {greeks.put.vega?.toFixed(3) ?? '—'}</p>
          <p>Θ: {greeks.put.theta?.toFixed(3) ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

function formatVal(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(2);
}
