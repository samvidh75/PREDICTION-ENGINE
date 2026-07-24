/**
 * Stock Comparison Component
 * Side-by-side comparison of 2-3 stocks with AI analysis
 */

import { useState } from 'react';
import { modelRouter } from '../utils/modelRouter';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  pe: number;
  roe: number;
  marketCap: number;
  dividendYield: number;
  volume: number;
}

interface ComparisonMetric {
  label: string;
  key: keyof StockData;
  format: (value: any) => string;
  highlight?: (a: number, b: number) => number; // Returns which index is better (0 or 1)
}

export default function StockComparison() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [stockData, setStockData] = useState<Map<string, StockData>>(new Map());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const metrics: ComparisonMetric[] = [
    {
      label: 'Current Price',
      key: 'price',
      format: (v) => `₱${v.toFixed(2)}`,
      highlight: (a, b) => (a < b ? 0 : 1), // Lower price might be better (value)
    },
    {
      label: 'Change %',
      key: 'change',
      format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`,
      highlight: (a, b) => (a > b ? 0 : 1), // Higher is better
    },
    {
      label: 'P/E Ratio',
      key: 'pe',
      format: (v) => v.toFixed(2),
      highlight: (a, b) => (a < b ? 0 : 1), // Lower P/E might be better (value)
    },
    {
      label: 'ROE %',
      key: 'roe',
      format: (v) => `${v.toFixed(2)}%`,
      highlight: (a, b) => (a > b ? 0 : 1), // Higher is better
    },
    {
      label: 'Market Cap',
      key: 'marketCap',
      format: (v) => `₱${(v / 1e6).toFixed(0)}M`,
    },
    {
      label: 'Dividend Yield',
      key: 'dividendYield',
      format: (v) => `${v.toFixed(2)}%`,
      highlight: (a, b) => (a > b ? 0 : 1), // Higher is better
    },
    {
      label: '24h Volume',
      key: 'volume',
      format: (v) => `${(v / 1e6).toFixed(1)}M`,
    },
  ];

  const addStock = (symbol: string) => {
    if (selectedStocks.length < 3 && !selectedStocks.includes(symbol)) {
      setSelectedStocks([...selectedStocks, symbol]);
      // Mock data fetch (replace with real API)
      const mockData: StockData = {
        symbol,
        price: 100 + Math.random() * 900,
        change: -5 + Math.random() * 10,
        pe: 10 + Math.random() * 30,
        roe: 10 + Math.random() * 40,
        marketCap: 10000 + Math.random() * 500000,
        dividendYield: 0.5 + Math.random() * 3,
        volume: 1e6 + Math.random() * 10e6,
      };
      setStockData(new Map(stockData).set(symbol, mockData));
    }
  };

  const removeStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s !== symbol));
    const newData = new Map(stockData);
    newData.delete(symbol);
    setStockData(newData);
  };

  const generateAIAnalysis = async () => {
    if (selectedStocks.length < 2) return;

    setIsAnalyzing(true);
    const stocks = selectedStocks
      .map((s) => {
        const data = stockData.get(s);
        return `${s}: P/E=${data?.pe.toFixed(1)}, ROE=${data?.roe.toFixed(1)}%, Dividend=${data?.dividendYield.toFixed(2)}%`;
      })
      .join('; ');

    const prompt = `Compare these stocks: ${stocks}. Highlight strengths, weaknesses, and which is better for growth vs value investing.`;

    // Mock AI response
    const mockAnalysis = `Based on the comparison:\n\n• ${selectedStocks[0]}: Strong fundamentals with higher ROE, good for growth\n• ${selectedStocks[1]}: Lower P/E ratio, attractive for value investors\n• ${selectedStocks[2] ? selectedStocks[2] + ': Balanced opportunity' : ''}\n\nRecommendation: Consider diversifying across all three for balanced portfolio.`;

    setAiAnalysis(mockAnalysis);
    setIsAnalyzing(false);
  };

  const isBetter = (metric: ComparisonMetric, index: number): boolean => {
    if (!metric.highlight || selectedStocks.length < 2) return false;
    const data1 = stockData.get(selectedStocks[0]);
    const data2 = stockData.get(selectedStocks[1]);
    if (!data1 || !data2) return false;
    const val1 = data1[metric.key];
    const val2 = data2[metric.key];
    return metric.highlight(val1 as number, val2 as number) === index;
  };

  return (
    <div className="stock-comparison">
      <style>{`
        .stock-comparison {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .comparison-header {
          margin-bottom: 24px;
        }

        .comparison-header h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .stock-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .stock-input-group {
          display: flex;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }

        .stock-input-group input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .stock-input-group button {
          padding: 8px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .stock-input-group button:hover {
          background: #764ba2;
        }

        .selected-stocks {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .stock-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f0f0f0;
          border-radius: 6px;
          font-weight: 600;
        }

        .stock-badge button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          color: #999;
        }

        .stock-badge button:hover {
          color: #e74c3c;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .comparison-table thead {
          background: #f8f9fa;
        }

        .comparison-table th,
        .comparison-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .comparison-table th {
          font-weight: 600;
          color: #333;
        }

        .comparison-table tbody tr:hover {
          background: #f8f9fa;
        }

        .metric-value {
          font-weight: 500;
        }

        .metric-value.better {
          color: #27ae60;
          font-weight: 700;
        }

        .ai-analysis {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 16px;
          border-radius: 6px;
          margin-top: 24px;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .analyze-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          margin-top: 16px;
        }

        .analyze-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="comparison-header">
        <h2>Compare Stocks</h2>
        <p>Select 2-3 stocks to compare side-by-side with AI analysis</p>
      </div>

      <div className="stock-selector">
        <div className="stock-input-group">
          <input
            type="text"
            placeholder="Enter PSE symbol (e.g., BDO, JFC, AC)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addStock((e.target as HTMLInputElement).value.toUpperCase());
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = (e.currentTarget?.parentElement?.querySelector(
                'input'
              ) as HTMLInputElement) || null;
              if (input) {
                addStock(input.value.toUpperCase());
                input.value = '';
              }
            }}
          >
            Add
          </button>
        </div>
      </div>

      {selectedStocks.length > 0 && (
        <>
          <div className="selected-stocks">
            {selectedStocks.map((symbol) => (
              <div key={symbol} className="stock-badge">
                {symbol}
                <button onClick={() => removeStock(symbol)}>✕</button>
              </div>
            ))}
          </div>

          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                {selectedStocks.map((symbol) => (
                  <th key={symbol}>{symbol}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.key}>
                  <td>{metric.label}</td>
                  {selectedStocks.map((symbol, idx) => {
                    const data = stockData.get(symbol);
                    const value = data ? metric.format(data[metric.key]) : '-';
                    const better = isBetter(metric, idx);
                    return (
                      <td key={symbol}>
                        <span className={`metric-value ${better ? 'better' : ''}`}>
                          {value}
                          {better && ' ✓'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="analyze-btn"
            onClick={generateAIAnalysis}
            disabled={selectedStocks.length < 2 || isAnalyzing}
          >
            {isAnalyzing ? '🤖 Analyzing...' : '🤖 Generate AI Analysis'}
          </button>

          {aiAnalysis && <div className="ai-analysis">{aiAnalysis}</div>}
        </>
      )}
    </div>
  );
}
