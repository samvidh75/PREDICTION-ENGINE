export const METHODOLOGY_SECTIONS = [
  {
    id: "overview",
    title: "Methodology Overview",
    content: "StockStory Pakistan uses a comprehensive, multi-factor framework to evaluate and score PSX equities based on fundamental, technical, and market data.",
    subsections: [
      {
        title: "Data Sources",
        content: "We aggregate data from PSX stock exchanges (PSE, PSE), regulatory filings, broker APIs, and verified financial databases.",
      },
      {
        title: "Update Frequency",
        content: "Scores are updated quarterly for fundamental metrics and daily for technical indicators and market data.",
      },
    ],
  },
  {
    id: "fundamental-analysis",
    title: "Fundamental Analysis",
    content: "We evaluate companies based on profitability, growth, valuations, and balance sheet strength.",
    subsections: [
      {
        title: "Profitability Metrics",
        content: "We track ROE, ROA, net margins, and operating margins to assess earning power.",
      },
      {
        title: "Valuation",
        content: "P/E ratios, P/B ratios, and dividend yields are compared against sector and market averages.",
      },
    ],
  },
  {
    id: "technical-analysis",
    title: "Technical Analysis",
    content: "We use moving averages, momentum indicators, and trend analysis to identify price patterns.",
    subsections: [
      {
        title: "Indicators",
        content: "RSI, MACD, Bollinger Bands, and volume analysis inform short-term price expectations.",
      },
      {
        title: "Trend Identification",
        content: "We identify uptrends, downtrends, and consolidation patterns using multiple timeframes.",
      },
    ],
  },
  {
    id: "scoring-system",
    title: "Scoring System",
    content: "All metrics are normalized to a 0-100 scale and weighted by importance to generate composite scores.",
    subsections: [
      {
        title: "Weights",
        content: "Fundamental metrics: 50%, Technical metrics: 30%, Market metrics: 20%.",
      },
      {
        title: "Updates",
        content: "Weights are adjusted periodically based on backtesting and market regime changes.",
      },
    ],
  },
];
