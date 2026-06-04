// src/services/intelligence/clientIntelligenceProvider.ts
// Client-side provider for high-fidelity intelligence data.

export interface InsightData {
  title: string;
  summary: string;
  confidence: number;
  positiveDrivers: string[];
  negativeDrivers: string[];
}

export interface CompanyOutlookData {
  symbol: string;
  businessQuality: "High" | "Medium" | "Low";
  growthOutlook: "Positive" | "Stable" | "Negative";
  riskOutlook: "Low Risk" | "Moderate Risk" | "High Risk";
  valuationOutlook: "Undervalued" | "Fair Value" | "Overvalued";
  momentumOutlook: "Bullish" | "Neutral" | "Bearish";
  overallSummary: string;
}

export interface SectorOutlookData {
  sector: string;
  sectorStrength: number;
  sectorMomentum: "Accelerating" | "Steady" | "Decelerating";
  sectorRisk: "Low" | "Moderate" | "High";
  sectorRotationSignal: "ACCUMULATE" | "HOLD" | "REDUCE";
}

export interface NarrativeData {
  narrative50: string;
  narrative100: string;
  narrative250: string;
}

export interface SnapshotData {
  symbol: string;
  tradeDate: string;
  insight: InsightData;
  companyOutlook: CompanyOutlookData;
  sectorOutlook: SectorOutlookData;
  narrative: NarrativeData;
}

export interface MarketOutlookData {
  marketMood: "Bullish" | "Neutral" | "Bearish";
  marketBreadth: number;
  riskAppetite: "Aggressive" | "Risk-On" | "Risk-Off";
  leadershipTrends: string[];
}

export interface PortfolioOutlookData {
  diversificationStatus: "Well-Diversified" | "Moderately Concentrated" | "High Concentration";
  riskConcentration: string;
  factorExposure: {
    quality: number;
    value: number;
    growth: number;
    momentum: number;
    risk: number;
  };
  sectorExposure: Record<string, number>;
  portfolioNarrative: string;
}

export const staticIntelligenceData = {
  snapshots: [
    {
      symbol: "RELIANCE",
      tradeDate: "2026-05-30",
      insight: {
        title: "RELIANCE holding in stable equilibrium",
        summary: "Analytical indicators for RELIANCE reflect steady market conditions with balanced factor weights.",
        confidence: 63,
        positiveDrivers: [
          "Lower risk profile (stable returns, low volatility & low beta) (Score: 66/100)",
          "High balance sheet quality & profitability metrics (Score: 61/100)"
        ],
        negativeDrivers: [
          "Strong upward price momentum (RSI/MACD confirmations) (Score: 38/100)",
          "Earnings expansion and positive moving average trends (Score: 47/100)"
        ]
      },
      companyOutlook: {
        symbol: "RELIANCE",
        businessQuality: "Medium" as const,
        growthOutlook: "Stable" as const,
        riskOutlook: "Low Risk" as const,
        valuationOutlook: "Undervalued" as const,
        momentumOutlook: "Bearish" as const,
        overallSummary: "RELIANCE presents a medium business quality rating with an undervalued/expensive outlook of undervalued. Momentum signals are currently bearish alongside a low risk risk profile."
      },
      sectorOutlook: {
        sector: "Energy",
        sectorStrength: 65,
        sectorMomentum: "Accelerating" as const,
        sectorRisk: "Low" as const,
        sectorRotationSignal: "ACCUMULATE" as const
      },
      narrative: {
        narrative50: "RELIANCE represents a structural factor profile scoring 54/100, pointing toward sideways consolidation. Profitability indicators remain strong, while valuation indices are ranked at 60/100. Positive drivers include lower risk profile (stable returns, low volat. Risk profiles are fully moderate.",
        narrative100: "RELIANCE is currently demonstrating a factor score of 54/100, placing the stock in a state of sideways consolidation. A review of the technical features reveals an RSI of 38, coupled with a moving average distance of -4%. Fundamentally, Quality scores 61/100 and Value scores 60/100. The top driving factor is lower risk profile (stable returns, low volatility & low beta) (score: 66/100). Conversely, the primary headwind relates to strong upward price momentum (rsi/macd confirmations) (score: 38/100). Overall risk is managed, supporting steady portfolios.",
        narrative250: "In-depth quantitative analysis of RELIANCE yields a comprehensive factor-intelligence rating of 54 out of 100, which signifies a regime characterized by sideways consolidation. This rating is compiled across six core risk-premia styles. The underlying technical feature pipeline records an RSI index at 38, an Average True Range (ATR) of 26.42, and a volatility profile of 20%. These variables combine to outline the underlying momentum and trend parameters.\n\nFrom a factor perspective, the Quality Score of 61/100 confirms robust company margins and return profiles, while the Value Score of 60/100 represents whether the asset trades at a premium or discount. Our Explanation Engine confirms that the key catalyst propelling the rating is lower risk profile (stable returns, low volatility & low beta) (score: 66/100), which offset headwinds like strong upward price momentum (rsi/macd confirmations) (score: 38/100). Furthermore, sector checks highlight a Sector Strength Score of 50/100, which reflects capital flows into the stock's broader industry group. Risk exposures (scored at 66/100) show moderate characteristics, suggesting low vulnerability to sudden market-wide corrections. In conclusion, StockStory recommends a balanced holding profile, aligning with a factor-first asset allocation that prioritizes high quality and stable returns over speculative gains."
      }
    },
    {
      symbol: "TCS",
      tradeDate: "2026-05-30",
      insight: {
        title: "TCS holding in stable equilibrium",
        summary: "Analytical indicators for TCS reflect steady market conditions with balanced factor weights.",
        confidence: 64,
        positiveDrivers: [
          "Lower risk profile (stable returns, low volatility & low beta) (Score: 65/100)",
          "High balance sheet quality & profitability metrics (Score: 61/100)"
        ],
        negativeDrivers: [
          "Earnings expansion and positive moving average trends (Score: 44/100)",
          "Aggressive outperformance of the stock's sector (Score: 50/100)"
        ]
      },
      companyOutlook: {
        symbol: "TCS",
        businessQuality: "Medium" as const,
        growthOutlook: "Stable" as const,
        riskOutlook: "Low Risk" as const,
        valuationOutlook: "Undervalued" as const,
        momentumOutlook: "Neutral" as const,
        overallSummary: "TCS presents a medium business quality rating with an undervalued/expensive outlook of undervalued. Momentum signals are currently neutral alongside a low risk risk profile."
      },
      sectorOutlook: {
        sector: "IT",
        sectorStrength: 50,
        sectorMomentum: "Steady" as const,
        sectorRisk: "Moderate" as const,
        sectorRotationSignal: "HOLD" as const
      },
      narrative: {
        narrative50: "TCS represents a structural factor profile scoring 56/100, pointing toward growth and momentum expansion. Profitability indicators remain strong, while valuation indices are ranked at 60/100. Positive drivers include lower risk profile (stable returns, low volat. Risk profiles are fully moderate.",
        narrative100: "TCS is currently demonstrating a factor score of 56/100, placing the stock in a state of growth and momentum expansion. A review of the technical features reveals an RSI of 41, coupled with a moving average distance of -5%. Fundamentally, Quality scores 61/100 and Value scores 60/100. The top driving factor is lower risk profile (stable returns, low volatility & low beta) (score: 65/100). Conversely, the primary headwind relates to earnings expansion and positive moving average trends (score: 44/100). Overall risk is managed, supporting steady portfolios.",
        narrative250: "In-depth quantitative analysis of TCS yields a comprehensive factor-intelligence rating of 56 out of 100, which signifies a regime characterized by growth and momentum expansion. This rating is compiled across six core risk-premia styles. The underlying technical feature pipeline records an RSI index at 41, an Average True Range (ATR) of 52.88, and a volatility profile of 19%. These variables combine to outline the underlying momentum and trend parameters.\n\nFrom a factor perspective, the Quality Score of 61/100 confirms robust company margins and return profiles, while the Value Score of 60/100 represents whether the asset trades at a premium or discount. Our Explanation Engine confirms that the key catalyst propelling the rating is lower risk profile (stable returns, low volatility & low beta) (score: 65/100), which offset headwinds like earnings expansion and positive moving average trends (score: 44/100). Furthermore, sector checks highlight a Sector Strength Score of 50/100, which reflects capital flows into the stock's broader industry group. Risk exposures (scored at 65/100) show moderate characteristics, suggesting low vulnerability to sudden market-wide corrections. In conclusion, StockStory recommends a balanced holding profile, aligning with a factor-first asset allocation that prioritizes high quality and stable returns over speculative gains."
      }
    },
    {
      symbol: "INFY",
      tradeDate: "2026-05-30",
      insight: {
        title: "INFY holding in stable equilibrium",
        summary: "Analytical indicators for INFY reflect steady market conditions with balanced factor weights.",
        confidence: 66,
        positiveDrivers: [
          "Strong upward price momentum (RSI/MACD confirmations) (Score: 71/100)",
          "High balance sheet quality & profitability metrics (Score: 61/100)"
        ],
        negativeDrivers: [
          "Earnings expansion and positive moving average trends (Score: 50/100)",
          "Aggressive outperformance of the stock's sector (Score: 50/100)"
        ]
      },
      companyOutlook: {
        symbol: "INFY",
        businessQuality: "Medium" as const,
        growthOutlook: "Stable" as const,
        riskOutlook: "Moderate" as const,
        valuationOutlook: "Fair Value" as const,
        momentumOutlook: "Bullish" as const,
        overallSummary: "INFY presents a medium business quality rating with an undervalued/expensive outlook of fair value. Momentum signals are currently bullish alongside a moderate risk profile."
      },
      sectorOutlook: {
        sector: "IT",
        sectorStrength: 50,
        sectorMomentum: "Steady" as const,
        sectorRisk: "Moderate" as const,
        sectorRotationSignal: "HOLD" as const
      },
      narrative: {
        narrative50: "INFY represents a structural factor profile scoring 58/100, pointing toward growth and momentum expansion. Profitability indicators remain strong, while valuation indices are ranked at 59/100. Positive drivers include strong upward price momentum (rsi/macd confir. Risk profiles are fully moderate.",
        narrative100: "INFY is currently demonstrating a factor score of 58/100, placing the stock in a state of growth and momentum expansion. A review of the technical features reveals an RSI of 54, coupled with a moving average distance of -2%. Fundamentally, Quality scores 61/100 and Value scores 59/100. The top driving factor is strong upward price momentum (rsi/macd confirmations) (score: 71/100). Conversely, the primary headwind relates to earnings expansion and positive moving average trends (score: 50/100). Overall risk is managed, supporting steady portfolios.",
        narrative250: "In-depth quantitative analysis of INFY yields a comprehensive factor-intelligence rating of 58 out of 100, which signifies a regime characterized by growth and momentum expansion. This rating is compiled across six core risk-premia styles. The underlying technical feature pipeline records an RSI index at 54, an Average True Range (ATR) of 30.20, and a volatility profile of 29%. These variables combine to outline the underlying momentum and trend parameters.\n\nFrom a factor perspective, the Quality Score of 61/100 confirms robust company margins and return profiles, while the Value Score of 59/100 represents whether the asset trades at a premium or discount. Our Explanation Engine confirms that the key catalyst propelling the rating is strong upward price momentum (rsi/macd confirmations) (score: 71/100), which offset headwinds like earnings expansion and positive moving average trends (score: 50/100). Furthermore, sector checks highlight a Sector Strength Score of 50/100, which reflects capital flows into the stock's broader industry group. Risk exposures (scored at 59/100) show moderate characteristics, suggesting low vulnerability to sudden market-wide corrections. In conclusion, StockStory recommends a balanced holding profile, aligning with a factor-first asset allocation that prioritizes high quality and stable returns over speculative gains."
      }
    },
    {
      symbol: "HDFCBANK",
      tradeDate: "2026-05-30",
      insight: {
        title: "HDFCBANK holding in stable equilibrium",
        summary: "Analytical indicators for HDFCBANK reflect steady market conditions with balanced factor weights.",
        confidence: 62,
        positiveDrivers: [
          "Lower risk profile (stable returns, low volatility & low beta) (Score: 63/100)",
          "High balance sheet quality & profitability metrics (Score: 61/100)"
        ],
        negativeDrivers: [
          "Strong upward price momentum (RSI/MACD confirmations) (Score: 40/100)",
          "Earnings expansion and positive moving average trends (Score: 41/100)"
        ]
      },
      companyOutlook: {
        symbol: "HDFCBANK",
        businessQuality: "Medium" as const,
        growthOutlook: "Stable" as const,
        riskOutlook: "Low Risk" as const,
        valuationOutlook: "Undervalued" as const,
        momentumOutlook: "Bearish" as const,
        overallSummary: "HDFCBANK presents a medium business quality rating with an undervalued/expensive outlook of undervalued. Momentum signals are currently bearish alongside a low risk risk profile."
      },
      sectorOutlook: {
        sector: "Banking",
        sectorStrength: 55,
        sectorMomentum: "Steady" as const,
        sectorRisk: "Moderate" as const,
        sectorRotationSignal: "HOLD" as const
      },
      narrative: {
        narrative50: "HDFCBANK represents a structural factor profile scoring 53/100, pointing toward sideways consolidation. Profitability indicators remain strong, while valuation indices are ranked at 60/100. Positive drivers include lower risk profile (stable returns, low volat. Risk profiles are fully moderate.",
        narrative100: "HDFCBANK is currently demonstrating a factor score of 53/100, placing the stock in a state of sideways consolidation. A review of the technical features reveals an RSI of 38, coupled with a moving average distance of -4%. Fundamentally, Quality scores 61/100 and Value scores 60/100. The top driving factor is lower risk profile (stable returns, low volatility & low beta) (score: 63/100). Conversely, the primary headwind relates to strong upward price momentum (rsi/macd confirmations) (score: 40/100). Overall risk is managed, supporting steady portfolios.",
        narrative250: "In-depth quantitative analysis of HDFCBANK yields a comprehensive factor-intelligence rating of 53 out of 100, which signifies a regime characterized by sideways consolidation. This rating is compiled across six core risk-premia styles. The underlying technical feature pipeline records an RSI index at 38, an Average True Range (ATR) of 16.40, and a volatility profile of 25%. These variables combine to outline the underlying momentum and trend parameters.\n\nFrom a factor perspective, the Quality Score of 61/100 confirms robust company margins and return profiles, while the Value Score of 60/100 represents whether the asset trades at a premium or discount. Our Explanation Engine confirms that the key catalyst propelling the rating is lower risk profile (stable returns, low volatility & low beta) (score: 63/100), which offset headwinds like strong upward price momentum (rsi/macd confirmations) (score: 40/100). Furthermore, sector checks highlight a Sector Strength Score of 50/100, which reflects capital flows into the stock's broader industry group. Risk exposures (scored at 63/100) show moderate characteristics, suggesting low vulnerability to sudden market-wide corrections. In conclusion, StockStory recommends a balanced holding profile, aligning with a factor-first asset allocation that prioritizes high quality and stable returns over speculative gains."
      }
    },
    {
      symbol: "HAL",
      tradeDate: "2026-05-30",
      insight: {
        title: "HAL holding in stable equilibrium",
        summary: "Analytical indicators for HAL reflect steady market conditions with balanced factor weights.",
        confidence: 61,
        positiveDrivers: [
          "High balance sheet quality & profitability metrics (Score: 61/100)",
          "Attractive valuation metrics (low P/E or strong earnings yield) (Score: 59/100)"
        ],
        negativeDrivers: [
          "Strong upward price momentum (RSI/MACD confirmations) (Score: 30/100)",
          "Earnings expansion and positive moving average trends (Score: 50/100)"
        ]
      },
      companyOutlook: {
        symbol: "HAL",
        businessQuality: "Medium" as const,
        growthOutlook: "Stable" as const,
        riskOutlook: "Moderate" as const,
        valuationOutlook: "Fair Value" as const,
        momentumOutlook: "Bearish" as const,
        overallSummary: "HAL presents a medium business quality rating with an undervalued/expensive outlook of fair value. Momentum signals are currently bearish alongside a moderate risk profile."
      },
      sectorOutlook: {
        sector: "Defence",
        sectorStrength: 75,
        sectorMomentum: "Accelerating" as const,
        sectorRisk: "Low" as const,
        sectorRotationSignal: "ACCUMULATE" as const
      },
      narrative: {
        narrative50: "HAL represents a structural factor profile scoring 52/100, pointing toward sideways consolidation. Profitability indicators remain strong, while valuation indices are ranked at 59/100. Positive drivers include high balance sheet quality & profitability me. Risk profiles are fully moderate.",
        narrative100: "HAL is currently demonstrating a factor score of 52/100, placing the stock in a state of sideways consolidation. A review of the technical features reveals an RSI of 41, coupled with a moving average distance of 1%. Fundamentally, Quality scores 61/100 and Value scores 59/100. The top driving factor is high balance sheet quality & profitability metrics (score: 61/100). Conversely, the primary headwind relates to strong upward price momentum (rsi/macd confirmations) (score: 30/100). Overall risk is managed, supporting steady portfolios.",
        narrative250: "In-depth quantitative analysis of HAL yields a comprehensive factor-intelligence rating of 52 out of 100, which signifies a regime characterized by sideways consolidation. This rating is compiled across six core risk-premia styles. The underlying technical feature pipeline records an RSI index at 41, an Average True Range (ATR) of 111.44, and a volatility profile of 28%. These variables combine to outline the underlying momentum and trend parameters.\n\nFrom a factor perspective, the Quality Score of 61/100 confirms robust company margins and return profiles, while the Value Score of 59/100 represents whether the asset trades at a premium or discount. Our Explanation Engine confirms that the key catalyst propelling the rating is high balance sheet quality & profitability metrics (score: 61/100), which offset headwinds like strong upward price momentum (rsi/macd confirmations) (score: 30/100). Furthermore, sector checks highlight a Sector Strength Score of 50/100, which reflects capital flows into the stock's broader industry group. Risk exposures (scored at 59/100) show moderate characteristics, suggesting low vulnerability to sudden market-wide corrections. In conclusion, StockStory recommends a balanced holding profile, aligning with a factor-first asset allocation that prioritizes high quality and stable returns over speculative gains."
      }
    }
  ],
  marketOutlook: {
    marketMood: "Neutral" as const,
    marketBreadth: 14,
    riskAppetite: "Risk-Off" as const,
    leadershipTrends: [
      "Technology sector leading active market flows",
      "Defence (Avg Factor Score: 75/100)",
      "Energy (Avg Factor Score: 65/100)"
    ]
  },
  portfolioOutlook: {
    diversificationStatus: "Moderately Concentrated" as const,
    riskConcentration: "High sector concentration risk identified in Defence (45% allocation).",
    factorExposure: {
      quality: 61,
      value: 60,
      growth: 46,
      momentum: 46,
      risk: 62
    },
    sectorExposure: {
      "Energy": 25,
      "Defence": 45,
      "Banking": 15,
      "IT": 15
    },
    portfolioNarrative: "The portfolio is moderately concentrated with significant focus in the Defence sector. Overall quality and risk factor exposure profiles reflect high stability and value posture, offsetting momentum consolidation headwinds."
  }
};

export function getCompanyIntelligence(symbol: string): SnapshotData | null {
  const cleanSym = symbol.toUpperCase().trim();
  const match = staticIntelligenceData.snapshots.find(s => s.symbol === cleanSym);
  if (match) return match as SnapshotData;

  // Fallback default snapshot for new tickers
  return {
    symbol: cleanSym,
    tradeDate: "2026-06-03",
    insight: {
      title: `${cleanSym} is trading under stable parameters`,
      summary: `Standard metrics for ${cleanSym} reflect balanced trading regimes and moderate risk weights.`,
      confidence: 50,
      positiveDrivers: ["Stable historical margins", "Moderate relative valuation"],
      negativeDrivers: ["Sideways consolidation momentum", "Standard sector headwinds"]
    },
    companyOutlook: {
      symbol: cleanSym,
      businessQuality: "Medium",
      growthOutlook: "Stable",
      riskOutlook: "Moderate Risk",
      valuationOutlook: "Fair Value",
      momentumOutlook: "Neutral",
      overallSummary: `${cleanSym} presents a medium business quality rating with fair value pricing and neutral momentum indices.`
    },
    sectorOutlook: {
      sector: "Technology",
      sectorStrength: 50,
      sectorMomentum: "Steady",
      sectorRisk: "Moderate",
      sectorRotationSignal: "HOLD"
    },
    narrative: {
      narrative50: `${cleanSym} represents a standard corporate profile with normal factor exposure limits. Risk and valuation levels are in neutral territory.`,
      narrative100: `${cleanSym} is demonstrating balanced factor metrics, placing it in a stable consolidation regime. High quality margins are balanced by intermediate value trends.`,
      narrative250: `A balanced review of ${cleanSym} confirms intermediate factor alignment. The underlying indicators map to low-to-moderate risk profiles, recommending a holding position.`
    }
  };
}

export function getMarketIntelligence(): MarketOutlookData {
  return staticIntelligenceData.marketOutlook;
}

export function getSectorIntelligence(sector: string): SectorOutlookData {
  const cleanSec = sector.toUpperCase().trim();
  const match = staticIntelligenceData.snapshots.find(s => s.sectorOutlook.sector.toUpperCase() === cleanSec);
  if (match) return match.sectorOutlook;

  return {
    sector,
    sectorStrength: 50,
    sectorMomentum: "Steady",
    sectorRisk: "Moderate",
    sectorRotationSignal: "HOLD"
  };
}

export function getPortfolioIntelligence(): PortfolioOutlookData {
  return staticIntelligenceData.portfolioOutlook;
}
