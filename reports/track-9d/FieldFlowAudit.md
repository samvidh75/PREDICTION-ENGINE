# TRACK-9D Field Flow Audit

Generated: 2026-06-05T19:32:32.453Z

| Symbol | Field | Provider source | Provider emits value? | EngineInputs receives value? | Expected consumer |
| --- | --- | --- | --- | --- | --- |
| RELIANCE | peRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| RELIANCE | pbRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| RELIANCE | roe | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| RELIANCE | roic | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| RELIANCE | roa | UpstoxFundamentalsProvider | YES | NO: not in EngineInputs.financials | No StockStory engine input consumer |
| RELIANCE | debtToEquity | UpstoxFundamentalsProvider | YES | YES | StabilityEngine |
| RELIANCE | evEbitda | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| RELIANCE | revenueGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| RELIANCE | profitGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| RELIANCE | operatingMargin | MISSING | NO | NO | QualityEngine/StabilityEngine |
| RELIANCE | dividendYield | ScreenerProvider | YES | YES | ConfidenceEngine/Factor only if mapped |
| RELIANCE | bookValue | ScreenerProvider | YES | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| RELIANCE | marketCap | ScreenerProvider | YES | YES | RiskEngine/ConfidenceEngine |
| RELIANCE | eps | MISSING | NO | NO | ConfidenceEngine/general only |
| RELIANCE | freeCashFlow | MISSING | NO | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| TCS | peRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| TCS | pbRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| TCS | roe | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| TCS | roic | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| TCS | roa | UpstoxFundamentalsProvider | YES | NO: not in EngineInputs.financials | No StockStory engine input consumer |
| TCS | debtToEquity | UpstoxFundamentalsProvider | YES | YES | StabilityEngine |
| TCS | evEbitda | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| TCS | revenueGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| TCS | profitGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| TCS | operatingMargin | MISSING | NO | NO | QualityEngine/StabilityEngine |
| TCS | dividendYield | ScreenerProvider | YES | YES | ConfidenceEngine/Factor only if mapped |
| TCS | bookValue | ScreenerProvider | YES | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| TCS | marketCap | ScreenerProvider | YES | YES | RiskEngine/ConfidenceEngine |
| TCS | eps | MISSING | NO | NO | ConfidenceEngine/general only |
| TCS | freeCashFlow | MISSING | NO | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| INFY | peRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| INFY | pbRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| INFY | roe | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| INFY | roic | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| INFY | roa | UpstoxFundamentalsProvider | YES | NO: not in EngineInputs.financials | No StockStory engine input consumer |
| INFY | debtToEquity | UpstoxFundamentalsProvider | YES | YES | StabilityEngine |
| INFY | evEbitda | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| INFY | revenueGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| INFY | profitGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| INFY | operatingMargin | MISSING | NO | NO | QualityEngine/StabilityEngine |
| INFY | dividendYield | ScreenerProvider | YES | YES | ConfidenceEngine/Factor only if mapped |
| INFY | bookValue | ScreenerProvider | YES | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| INFY | marketCap | ScreenerProvider | YES | YES | RiskEngine/ConfidenceEngine |
| INFY | eps | MISSING | NO | NO | ConfidenceEngine/general only |
| INFY | freeCashFlow | MISSING | NO | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| HDFCBANK | peRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| HDFCBANK | pbRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| HDFCBANK | roe | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| HDFCBANK | roic | MISSING | NO | NO | QualityEngine |
| HDFCBANK | roa | UpstoxFundamentalsProvider | YES | NO: not in EngineInputs.financials | No StockStory engine input consumer |
| HDFCBANK | debtToEquity | UpstoxFundamentalsProvider | YES | YES | StabilityEngine |
| HDFCBANK | evEbitda | MISSING | NO | NO | ValuationEngine |
| HDFCBANK | revenueGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| HDFCBANK | profitGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| HDFCBANK | operatingMargin | MISSING | NO | NO | QualityEngine/StabilityEngine |
| HDFCBANK | dividendYield | ScreenerProvider | YES | YES | ConfidenceEngine/Factor only if mapped |
| HDFCBANK | bookValue | ScreenerProvider | YES | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| HDFCBANK | marketCap | ScreenerProvider | YES | YES | RiskEngine/ConfidenceEngine |
| HDFCBANK | eps | MISSING | NO | NO | ConfidenceEngine/general only |
| HDFCBANK | freeCashFlow | MISSING | NO | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| ICICIBANK | peRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| ICICIBANK | pbRatio | UpstoxFundamentalsProvider | YES | YES | ValuationEngine |
| ICICIBANK | roe | UpstoxFundamentalsProvider | YES | YES | QualityEngine |
| ICICIBANK | roic | MISSING | NO | NO | QualityEngine |
| ICICIBANK | roa | UpstoxFundamentalsProvider | YES | NO: not in EngineInputs.financials | No StockStory engine input consumer |
| ICICIBANK | debtToEquity | UpstoxFundamentalsProvider | YES | YES | StabilityEngine |
| ICICIBANK | evEbitda | MISSING | NO | NO | ValuationEngine |
| ICICIBANK | revenueGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| ICICIBANK | profitGrowth | ScreenerProvider | YES | YES | GrowthEngine |
| ICICIBANK | operatingMargin | MISSING | NO | NO | QualityEngine/StabilityEngine |
| ICICIBANK | dividendYield | ScreenerProvider | YES | YES | ConfidenceEngine/Factor only if mapped |
| ICICIBANK | bookValue | ScreenerProvider | YES | NO: not in EngineInputs.financials | Not in EngineInputs schema |
| ICICIBANK | marketCap | ScreenerProvider | YES | YES | RiskEngine/ConfidenceEngine |
| ICICIBANK | eps | MISSING | NO | NO | ConfidenceEngine/general only |
| ICICIBANK | freeCashFlow | MISSING | NO | NO: not in EngineInputs.financials | Not in EngineInputs schema |
