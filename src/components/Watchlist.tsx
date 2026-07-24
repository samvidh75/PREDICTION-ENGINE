import { useState, useEffect } from "react";
import { useQuotes } from "../hooks/useQuote";
import { colors, space } from "../design/tokens";

const STORAGE_KEY = "prediction-engine:watchlist";
const DEFAULT_SYMBOLS = ["RELIANCE", "TCS", "INFY", "WIPRO", "HDFC"];

export default function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SYMBOLS;
    } catch {
      return DEFAULT_SYMBOLS;
    }
  });

  const { quotes } = useQuotes(
    symbols.map(s => s.endsWith('.PS') ? s : `${s}.PS`),
    5000
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols]);

  const handleAddSymbol = () => {
    const input = prompt("Enter stock symbol (e.g., RELIANCE):");
    if (input) {
      const newSymbol = input.toUpperCase().trim();
      if (newSymbol && !symbols.includes(newSymbol)) {
        setSymbols([...symbols, newSymbol]);
      }
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  return (
    <div style={{
      padding: space?.[4] || '24px',
      backgroundColor: colors.surface,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      borderRadius: "8px",
      marginTop: "24px"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: space?.[4] || '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>My Watchlist</h2>
        <button
          onClick={handleAddSymbol}
          style={{
            padding: "8px 16px",
            backgroundColor: colors.primary || "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600"
          }}
        >
          + Add
        </button>
      </div>

      {symbols.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "40px 20px",
          color: colors.textSecondary
        }}>
          <p>No symbols in watchlist</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space?.[2] || '12px' }}>
          {symbols.map(symbol => {
            const quote = Array.from(quotes.values()).find(
              q => q.symbol.replace('.PS', '') === symbol
            );

            return (
              <div
                key={symbol}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: space?.[2] || '12px',
                  backgroundColor: colors.canvas || colors.surface,
                  borderRadius: "4px",
                  border: `1px solid ${colors.border}`
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: '14px' }}>
                    {symbol}
                  </p>
                  <p style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: colors.textSecondary
                  }}>
                    {quote?.source || 'Loading...'}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: '14px' }}>
                    {quote ? `₱${quote.price.toFixed(2)}` : '--'}
                  </p>
                  <p style={{
                    margin: "4px 0 0 0",
                    color: quote && quote.changePercent >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: "600",
                    fontSize: '12px'
                  }}>
                    {quote ? `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%` : '--'}
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveSymbol(symbol)}
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "transparent",
                    color: colors.textSecondary,
                    border: "none",
                    cursor: "pointer",
                    fontSize: "20px",
                    lineHeight: "1"
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
