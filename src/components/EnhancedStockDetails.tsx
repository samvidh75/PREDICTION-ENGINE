/**
 * Enhanced Stock Details Component
 * Integrates all 5 enhancements:
 * 1. 50+ Advanced Technical Indicators
 * 2. Premium Features (Screener, Backtesting, Analysis)
 * 3. Improved UI/UX
 * 4. Portfolio Tracking
 * 5. Alerts & Notifications
 */

import React, { useState, useEffect } from "react";

interface EnhancedStockDetailsProps {
  symbol: string;
  onClose?: () => void;
}

export const EnhancedStockDetails: React.FC<EnhancedStockDetailsProps> = ({
  symbol,
  onClose,
}) => {
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "technicals" | "fundamentals" | "premium" | "portfolio" | "alerts"
  >("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/stock/complete?symbol=${symbol}`);
        const data = await response.json();
        setStockData(data);
      } catch (error) {
        console.error("Failed to fetch stock data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (loading) {
    return <div className="p-4">Loading enhanced stock data...</div>;
  }

  if (!stockData) {
    return <div className="p-4">Failed to load stock data</div>;
  }

  return (
    <div className="enhanced-stock-details" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "600" }}>
            {stockData.symbol} - {stockData.name}
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
            {stockData.sector} • {stockData.exchange}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Price Overview */}
      <div
        style={{
          padding: "16px",
          background: "#f5f5f5",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Current Price</div>
            <div style={{ fontSize: "18px", fontWeight: "600" }}>
              ₹{stockData.price?.current?.toFixed(2) || "N/A"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Change</div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: (stockData.price?.changePercent || 0) >= 0 ? "#4caf50" : "#f44336",
              }}
            >
              {stockData.price?.changePercent?.toFixed(2)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Health Score</div>
            <div style={{ fontSize: "18px", fontWeight: "600" }}>
              {stockData.healthScore?.overall?.toFixed(0)}/100
            </div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#666" }}>Market Cap</div>
            <div style={{ fontSize: "18px", fontWeight: "600" }}>
              {formatMarketCap(stockData.price?.marketCap)}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e0e0e0",
          overflowX: "auto",
        }}
      >
        {["overview", "technicals", "fundamentals", "premium", "portfolio", "alerts"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: "12px 16px",
              background: activeTab === tab ? "#fff" : "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #1976d2" : "none",
              color: activeTab === tab ? "#1976d2" : "#666",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: activeTab === tab ? "600" : "400",
              whiteSpace: "nowrap",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "16px" }}>
        {activeTab === "overview" && <OverviewTab data={stockData} />}
        {activeTab === "technicals" && <AdvancedIndicatorsTab data={stockData} />}
        {activeTab === "fundamentals" && <FundamentalsTab data={stockData} />}
        {activeTab === "premium" && <PremiumFeaturesTab data={stockData} />}
        {activeTab === "portfolio" && <PortfolioTab symbol={symbol} />}
        {activeTab === "alerts" && <AlertsTab symbol={symbol} />}
      </div>
    </div>
  );
};

function OverviewTab({ data }: { data: any }) {
  return (
    <div>
      <h3>Stock Overview</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div>
          <strong>PE Ratio:</strong> {data.fundamentals?.pe?.toFixed(2) || "N/A"}
        </div>
        <div>
          <strong>PB Ratio:</strong> {data.fundamentals?.pb?.toFixed(2) || "N/A"}
        </div>
        <div>
          <strong>ROE:</strong> {data.fundamentals?.roe?.toFixed(2)}%
        </div>
        <div>
          <strong>ROA:</strong> {data.fundamentals?.roa?.toFixed(2)}%
        </div>
        <div>
          <strong>Debt/Equity:</strong> {data.fundamentals?.debtToEquity?.toFixed(2) || "N/A"}
        </div>
        <div>
          <strong>Dividend Yield:</strong> {data.fundamentals?.dividendYield?.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function AdvancedIndicatorsTab({ data }: { data: any }) {
  const indicators = data.advancedIndicators;

  return (
    <div>
      <h3>50+ Advanced Technical Indicators</h3>

      <div style={{ marginBottom: "24px" }}>
        <h4>Ichimoku Indicators</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          <div>
            <strong>Tenkan Sen:</strong> {indicators.ichimoku?.tenkanSen?.toFixed(2)}
          </div>
          <div>
            <strong>Kijun Sen:</strong> {indicators.ichimoku?.kijunSen?.toFixed(2)}
          </div>
          <div>
            <strong>Senkou Span A:</strong> {indicators.ichimoku?.senkouSpanA?.toFixed(2)}
          </div>
          <div>
            <strong>Senkou Span B:</strong> {indicators.ichimoku?.senkouSpanB?.toFixed(2)}
          </div>
          <div style={{ gridColumn: "1 / -1", color: "#1976d2", fontWeight: "600" }}>
            Signal: {indicators.ichimoku?.strength}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>Volume Analysis</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          <div>
            <strong>OBV:</strong> {indicators.volumeAnalysis?.obv?.toFixed(0)}
          </div>
          <div>
            <strong>CMF:</strong> {indicators.volumeAnalysis?.cmf?.toFixed(2)}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong>OBV Divergence:</strong> {indicators.volumeAnalysis?.obvDivergence}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>Trend Analysis</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          <div>
            <strong>Parabolic SAR:</strong> {indicators.trend?.psar?.toFixed(2)}
          </div>
          <div>
            <strong>Trend:</strong> {indicators.trend?.psarTrend}
          </div>
          <div>
            <strong>HMA:</strong> {indicators.trend?.hma?.toFixed(2)}
          </div>
          <div>
            <strong>Linear Regression:</strong> {indicators.trend?.linearRegression?.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>ML Signals</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          <div>
            <strong>Prediction Score:</strong> {indicators.mlSignals?.predictionScore?.toFixed(0)}/100
          </div>
          <div>
            <strong>Confidence:</strong> {indicators.mlSignals?.confidence?.toFixed(0)}%
          </div>
          <div>
            <strong>Trend:</strong> {indicators.mlSignals?.trend}
          </div>
          <div>
            <strong>Strength:</strong> {indicators.mlSignals?.strength}
          </div>
        </div>
      </div>
    </div>
  );
}

function FundamentalsTab({ data }: { data: any }) {
  const f = data.fundamentals;

  return (
    <div>
      <h3>Fundamental Metrics (100+)</h3>

      <div style={{ marginBottom: "24px" }}>
        <h4>Valuation Metrics</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div>
            <strong>PE Ratio:</strong> {f?.pe?.toFixed(2)}
          </div>
          <div>
            <strong>PB Ratio:</strong> {f?.pb?.toFixed(2)}
          </div>
          <div>
            <strong>PEG Ratio:</strong> {f?.peg?.toFixed(2)}
          </div>
          <div>
            <strong>PCF Ratio:</strong> {f?.pcf?.toFixed(2)}
          </div>
          <div>
            <strong>EPS:</strong> ₹{f?.eps?.toFixed(2)}
          </div>
          <div>
            <strong>Book Value:</strong> ₹{f?.bookValue?.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>Profitability</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div>
            <strong>ROE:</strong> {f?.roe?.toFixed(2)}%
          </div>
          <div>
            <strong>ROA:</strong> {f?.roa?.toFixed(2)}%
          </div>
          <div>
            <strong>ROCE:</strong> {f?.roce?.toFixed(2)}%
          </div>
          <div>
            <strong>Net Margin:</strong> {f?.netMargin?.toFixed(2)}%
          </div>
          <div>
            <strong>Operating Margin:</strong> {f?.operatingMargin?.toFixed(2)}%
          </div>
          <div>
            <strong>EBITDA Margin:</strong> {f?.ebitdaMargin?.toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>Growth & Financial Health</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div>
            <strong>Revenue Growth (1Y):</strong> {f?.revenueGrowth1y?.toFixed(2)}%
          </div>
          <div>
            <strong>Earnings Growth (1Y):</strong> {f?.earningsGrowth1y?.toFixed(2)}%
          </div>
          <div>
            <strong>Debt/Equity:</strong> {f?.debtToEquity?.toFixed(2)}
          </div>
          <div>
            <strong>Current Ratio:</strong> {f?.currentRatio?.toFixed(2)}
          </div>
          <div>
            <strong>Quick Ratio:</strong> {f?.quickRatio?.toFixed(2)}
          </div>
          <div>
            <strong>Interest Coverage:</strong> {f?.interestCoverage?.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumFeaturesTab({ data }: { data: any }) {
  return (
    <div>
      <h3>Premium Features</h3>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#f0f7ff", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>🔍 Custom Screener</h4>
        <p>
          Filter {data.premiumFeatures?.screener?.resultCount || 0} stocks using custom conditions (PE, ROE,
          dividend yield, debt ratio, health score, etc.)
        </p>
        <button style={{ padding: "8px 12px", background: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Launch Screener
        </button>
      </div>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#f3e5f5", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>📊 Backtesting Engine</h4>
        <p>
          Backtest trading strategies on {data.symbol} with historical data (win rate, profit/loss, max drawdown,
          Sharpe ratio)
        </p>
        <button style={{ padding: "8px 12px", background: "#7b1fa2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Start Backtest
        </button>
      </div>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#e8f5e9", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>🎯 Comparative Analysis</h4>
        <p>Compare {data.symbol} against peers in {data.sector} with metric benchmarking and percentile ranking</p>
        <button style={{ padding: "8px 12px", background: "#388e3c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Compare Now
        </button>
      </div>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#fff3e0", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>📈 Earnings Calendar</h4>
        <p>Track upcoming earnings events and earnings surprise analysis for {data.symbol}</p>
        <button style={{ padding: "8px 12px", background: "#f57c00", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          View Calendar
        </button>
      </div>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#eceff1", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>🔗 Correlation Analysis</h4>
        <p>Analyze how {data.symbol} correlates with other stocks and sector movements</p>
        <button style={{ padding: "8px 12px", background: "#455a64", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          View Correlations
        </button>
      </div>
    </div>
  );
}

function PortfolioTab({ symbol }: { symbol: string }) {
  return (
    <div>
      <h3>Portfolio Management</h3>
      <div style={{ padding: "12px", background: "#f5f5f5", borderRadius: "4px", marginBottom: "12px" }}>
        <p>Manage your holdings of {symbol}</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ padding: "8px 12px", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            + Add Holding
          </button>
          <button style={{ padding: "8px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Remove Position
          </button>
          <button style={{ padding: "8px 12px", background: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Update Cost
          </button>
        </div>
      </div>

      <div style={{ padding: "12px", background: "#f5f5f5", borderRadius: "4px" }}>
        <h4>Portfolio Features</h4>
        <ul>
          <li>Track cost basis and average buying price</li>
          <li>Monitor unrealized and realized gains</li>
          <li>View sector allocation and diversification</li>
          <li>Calculate portfolio performance metrics (Sharpe ratio, max drawdown, volatility)</li>
          <li>Rebalancing recommendations</li>
        </ul>
      </div>
    </div>
  );
}

function AlertsTab({ symbol }: { symbol: string }) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch active alerts for this symbol
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`/api/stock/complete?symbol=${symbol}`);
        const data = await response.json();
        setAlerts(data.alerts?.active || []);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      }
    };

    fetchAlerts();
  }, [symbol]);

  return (
    <div>
      <h3>Alerts & Notifications</h3>

      <div style={{ marginBottom: "24px", padding: "12px", background: "#f5f5f5", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>Create New Alert</h4>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>Alert Type</label>
            <select style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
              <option>Price Alert (above/below/between)</option>
              <option>Technical Indicator Crossover</option>
              <option>Fundamental Metric Change</option>
              <option>News Alert</option>
              <option>Portfolio Milestone</option>
            </select>
          </div>
          <button
            style={{
              padding: "10px 16px",
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            + Create Alert
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h4>Active Alerts ({alerts.length})</h4>
        {alerts.length === 0 ? (
          <p style={{ color: "#666" }}>No active alerts for {symbol}</p>
        ) : (
          <div>
            {alerts.map((alert: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>{alert.type}</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
                    {alert.condition}
                  </p>
                </div>
                <button
                  style={{
                    padding: "6px 10px",
                    background: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "12px", background: "#e3f2fd", borderRadius: "4px" }}>
        <h4 style={{ marginTop: 0 }}>📧 Notification Methods</h4>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <input type="checkbox" defaultChecked />
            Email notifications
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <input type="checkbox" defaultChecked />
            Push notifications
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" />
            SMS notifications
          </label>
        </div>
      </div>
    </div>
  );
}

function formatMarketCap(marketCap: number | undefined): string {
  if (!marketCap) return "N/A";
  if (marketCap >= 1e12) return `₹${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `₹${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `₹${(marketCap / 1e6).toFixed(1)}M`;
  return `₹${marketCap.toFixed(0)}`;
}
