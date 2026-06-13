# Feature Coverage Audit

Generated: 2026-06-14

## Summary

| Metric | Value |
|---|---|
| Total registered features | 117 |
| Active features | 82 |
| Experimental features | 16 |
| Unavailable features | 19 |
| Required features | 11 |
| Features with test coverage | 41 |
| Coverage rate | 35.0% |

## Feature Family Breakdown

| Family | Count | Active | Experimental | Unavailable | Tested |
|---|---|---|---|---|---|
| trend_momentum | 11 | 11 | 0 | 0 | 5 |
| price_return | 8 | 8 | 0 | 0 | 1 |
| fundamental_quality | 7 | 7 | 0 | 0 | 3 |
| balance_sheet | 7 | 7 | 0 | 0 | 2 |
| valuation | 7 | 7 | 0 | 0 | 3 |
| volatility_risk | 6 | 6 | 0 | 0 | 2 |
| growth | 6 | 6 | 0 | 0 | 2 |
| profitabilty_margins | 5 | 5 | 0 | 0 | 1 |
| cash_flow | 5 | 5 | 0 | 0 | 1 |
| volume_liquidity | 5 | 5 | 0 | 0 | 2 |
| provider_confidence | 5 | 5 | 0 | 0 | 0 |
| data_freshness | 5 | 5 | 0 | 0 | 0 |
| dividend_capital_returns | 5 | 3 | 2 | 0 | 1 |
| sector_relative | 5 | 1 | 4 | 0 | 2 |
| shareholding_ownership | 5 | 1 | 0 | 4 | 2 |
| peer_percentile | 5 | 0 | 0 | 5 | 0 |
| corporate_actions | 5 | 0 | 0 | 5 | 1 |
| news_events | 5 | 0 | 0 | 5 | 0 |
| score_stability | 5 | 0 | 5 | 0 | 0 |
| benchmark_market_regime | 5 | 0 | 5 | 0 | 0 |

## Top 20 Highest-Impact Active Features

| Feature | Label | Factor Group | Availability | Required | Impact |
|---|---|---|---|---|---|
| close | Close Price | stability | 95% | Yes | critical |
| volume | Trading Volume | liquidity | 95% | Yes | critical |
| market_cap | Market Capitalization | stability | 92% | Yes | critical |
| return_1d | 1-Day Return | momentum | 90% | No | high |
| price_freshness_days | Price Freshness (days) | dataQuality | 90% | No | high |
| provider_count | Provider Count | dataQuality | 90% | No | high |
| field_completeness | Field Completeness | dataQuality | 90% | No | high |
| stale_field_count | Stale Field Count | dataQuality | 90% | No | high |
| return_5d | 5-Day Return | momentum | 88% | No | high |
| pe_ratio | Price-to-Earnings Ratio | valuation | 88% | Yes | critical |
| open | Open Price | stability | 93% | No | high |
| high | High Price | stability | 93% | No | high |
| low | Low Price | stability | 93% | No | high |
| return_20d | 20-Day Return | momentum | 85% | No | high |
| roe | Return on Equity | quality | 85% | Yes | critical |
| roa | Return on Assets | quality | 85% | Yes | critical |
| pb_ratio | Price-to-Book Ratio | valuation | 85% | No | high |
| revenue | Revenue | quality | 85% | No | high |
| source_confidence | Source Confidence | dataQuality | 85% | No | high |
| fundamental_freshness_days | Fundamental Freshness (days) | dataQuality | 85% | No | high |

## Required Features (Must Have for Scoring)

| Feature | Label | Factor Group | Null Policy |
|---|---|---|---|
| close | Close Price | stability | reject_group |
| volume | Trading Volume | liquidity | reject_group |
| beta | Beta | risk | reduce_confidence |
| roe | Return on Equity | quality | reduce_confidence |
| roa | Return on Assets | quality | reduce_confidence |
| roic | Return on Invested Capital | quality | reduce_confidence |
| pe_ratio | Price-to-Earnings Ratio | valuation | reduce_confidence |
| market_cap | Market Capitalization | stability | reduce_confidence |
| revenue_growth | Revenue Growth | growth | reduce_confidence |
| eps_growth | EPS Growth | growth | reduce_confidence |
| debt_to_equity | Debt-to-Equity Ratio | risk | reduce_confidence |

## Experimental Features

| Feature | Label | Family | Reason |
|---|---|---|---|
| buyback_yield | Buyback Yield | dividend_capital_returns | Share buyback value divided by market capitalization |
| total_shareholder_yield | Total Shareholder Yield | dividend_capital_returns | Dividend yield plus buyback yield |
| sector_pe_relative | Sector-Relative P/E | sector_relative | Company P/E divided by median sector P/E |
| sector_pb_relative | Sector-Relative P/B | sector_relative | Company P/B divided by median sector P/B |
| sector_growth_relative | Sector-Relative Growth | sector_relative | Company revenue growth divided by median sector revenue growth |
| sector_margin_relative | Sector-Relative Margin | sector_relative | Company net margin divided by median sector net margin |
| score_change_1d | Score Change (1d) | score_stability | Absolute change in composite score from previous trading day |
| score_change_5d | Score Change (5d) | score_stability | Absolute change in composite score over last 5 trading days |
| score_change_20d | Score Change (20d) | score_stability | Absolute change in composite score over last 20 trading days |
| score_volatility_20d | Score Volatility (20d) | score_stability | Standard deviation of composite score over 20 trading days |
| score_trend | Score Trend | score_stability | Linear regression slope of composite score over trailing period |
| benchmark_return_20d | Benchmark Return (20d) | benchmark_market_regime | Return of the benchmark index over the last 20 trading days |
| relative_strength_vs_benchmark | Relative Strength vs Benchmark | benchmark_market_regime | Ratio of stock return to benchmark return over trailing period |
| market_volatility | Market Volatility (VIX-like) | benchmark_market_regime | Implied or realized volatility of the broad market index |
| sector_rotation_signal | Sector Rotation Signal | benchmark_market_regime | Binary signal indicating capital rotation between sectors |
| market_breadth | Market Breadth | benchmark_market_regime | Percentage of stocks advancing versus declining in the broad market |

## Unavailable Features (and Why)

| Feature | Label | Family | Reason |
|---|---|---|---|
| pe_percentile | P/E Percentile | peer_percentile | requires peer database |
| pb_percentile | P/B Percentile | peer_percentile | requires peer database |
| roe_percentile | ROE Percentile | peer_percentile | requires peer database |
| growth_percentile | Growth Percentile | peer_percentile | requires peer database |
| momentum_percentile | Momentum Percentile | peer_percentile | requires peer database |
| dividend_count_12m | Dividend Count (12m) | corporate_actions | requires corporate actions feed |
| split_count_12m | Split Count (12m) | corporate_actions | requires corporate actions feed |
| bonus_count_12m | Bonus Issue Count (12m) | corporate_actions | requires corporate actions feed |
| has_corporate_action_90d | Corporate Action (90d) | corporate_actions | requires corporate actions feed |
| corporate_action_impact | Corporate Action Impact | corporate_actions | requires corporate actions feed |
| promoter_holding | Promoter Holding | shareholding_ownership | requires shareholding pattern feed |
| institutional_holding | Institutional Holding | shareholding_ownership | requires shareholding pattern feed |
| public_holding | Public Holding | shareholding_ownership | requires shareholding pattern feed |
| pledged_promoter_holding | Pledged Promoter Holding | shareholding_ownership | requires shareholding pattern feed |
| news_count_7d | News Count (7d) | news_events | requires news feed |
| news_sentiment | News Sentiment | news_events | requires NLP news feed |
| news_volume_spike | News Volume Spike | news_events | requires news feed |
| earnings_announcement_days | Days Since Earnings | news_events | requires earnings calendar feed |
| analyst_rating_change | Analyst Rating Change | news_events | requires analyst coverage feed |

## Evidence: No Fabricated Values for Unsupported Features

The following safeguards are in place to ensure the engine never invents data:

1. **Unavailable features are clearly marked**: All 19 unavailable features have `activationStatus: 'unavailable'` and `sourceTable: 'unavailable'`. The engine's `buildFeatureValues()` only includes features present in the input — it never synthesises unavailable features.

2. **Experimental features are not computed**: All 16 experimental features have `defaultAvailability < 0.50` and use `transform: 'unavailable'` or no breakpoint mapping in FactorGroupScorer. They produce `null` values when the input is missing.

3. **Null policy prevents silent fallbacks**: `reject_group` rejects the entire factor group when a required feature is missing. `reduce_confidence` lowers confidence without fabricating values. `tolerate` excludes the feature from computation. There is **no zero-filling, no neutral-50 fabrication, and no silent fallback**. See `src/prediction-engine/scoring/MissingDataPolicy.ts`.

4. **No fabricated values in score engine**: The unified engine's `computeQualityScore()`, `computeValuationScore()`, etc. all return `null` when no data is available. The composite scorer (`computeCompositeScore()`) returns `null` baseScore when no groups have data. Risk dampening is 0 when risk score is null.

5. **No fabricated values in legacy scoreEngine.ts**: The legacy engine marks unavailable factors with `availability: 'unavailable'` and `value: null`. It never substitutes a default score.

6. **No fabricated values in PredictionFactory**: The P0-MEGA fix explicitly avoids `?? 50` fallbacks. Missing critical scores cause the symbol to be skipped with `INSUFFICIENT_ANALYTICAL_DATA` error code, not silently defaulted.

## Full Feature Coverage Matrix

| Feature | Label | Family | Status | SourceTable | SourceField | Required | FactorGroup | Tested | Impact |
|---|---|---|---|---|---|---|---|---|---|
| close | Close Price | price_return | active | prices | close | Yes | stability | No | critical |
| open | Open Price | price_return | active | prices | open | No | stability | No | high |
| high | High Price | price_return | active | prices | high | No | stability | No | high |
| low | Low Price | price_return | active | prices | low | No | stability | No | high |
| return_1d | 1-Day Return | price_return | active | prices | close | No | momentum | No | high |
| return_5d | 5-Day Return | price_return | active | prices | close | No | momentum | No | high |
| return_20d | 20-Day Return | price_return | active | prices | close | No | momentum | No | high |
| return_60d | 60-Day Return | price_return | active | prices | close | No | momentum | No | medium |
| volume | Trading Volume | volume_liquidity | active | prices | volume | Yes | liquidity | No | critical |
| volume_relative_20d | Relative Volume (20d) | volume_liquidity | active | prices | volume | No | liquidity | No | medium |
| volume_change_1d | Volume Change (1d) | volume_liquidity | active | prices | volume | No | liquidity | No | medium |
| dollar_volume | Dollar Volume | volume_liquidity | active | prices | volume | No | liquidity | No | medium |
| turnover_ratio | Turnover Ratio | volume_liquidity | active | derived | turnover_ratio | No | liquidity | No | medium |
| momentum_20d | 20-Day Momentum | trend_momentum | active | prices | close | No | momentum | No | high |
| rsi | Relative Strength Index (RSI) | trend_momentum | active | technicals | rsi | No | momentum | No | high |
| macd | MACD Line | trend_momentum | active | technicals | macd | No | momentum | No | medium |
| macd_signal | MACD Signal Line | trend_momentum | active | technicals | macdSignal | No | momentum | No | medium |
| macd_histogram | MACD Histogram | trend_momentum | active | technicals | macdHistogram | No | momentum | No | medium |
| adx | Average Directional Index | trend_momentum | active | technicals | adx | No | momentum | No | medium |
| relative_strength | Relative Strength | trend_momentum | active | technicals | relativeStrength | No | momentum | No | medium |
| moving_average_distance | Moving Average Distance | trend_momentum | active | technicals | movingAverageDistance | No | momentum | No | medium |
| trend_strength | Trend Strength | trend_momentum | active | technicals | trendStrength | No | momentum | No | medium |
| price_vs_sma_50 | Price vs SMA(50) | trend_momentum | active | derived | price_vs_sma_50 | No | momentum | No | medium |
| price_vs_sma_200 | Price vs SMA(200) | trend_momentum | active | derived | price_vs_sma_200 | No | momentum | No | medium |
| volatility_20d | 20-Day Volatility | volatility_risk | active | prices | close | No | risk | No | medium |
| atr | Average True Range | volatility_risk | active | technicals | atr | No | risk | No | medium |
| bollinger_width | Bollinger Band Width | volatility_risk | active | technicals | bollingerWidth | No | risk | No | medium |
| beta | Beta | volatility_risk | active | fundamentals | beta | Yes | risk | No | critical |
| downside_volatility | Downside Volatility | volatility_risk | active | derived | downside_volatility | No | risk | No | medium |
| up_down_ratio | Up/Down Volume Ratio | volatility_risk | active | derived | up_down_ratio | No | risk | No | medium |
| roe | Return on Equity | fundamental_quality | active | fundamentals | roe | Yes | quality | No | critical |
| roa | Return on Assets | fundamental_quality | active | fundamentals | roa | Yes | quality | No | critical |
| roic | Return on Invested Capital | fundamental_quality | active | fundamentals | roic | Yes | quality | No | critical |
| gross_margin | Gross Margin | fundamental_quality | active | fundamentals | grossMargin | No | quality | No | high |
| operating_margin | Operating Margin | fundamental_quality | active | fundamentals | operatingMargin | No | quality | No | high |
| net_margin | Net Margin | fundamental_quality | active | fundamentals | netMargin | No | quality | No | high |
| quality_factor | Quality Factor Score | fundamental_quality | active | factors | qualityFactor | No | quality | No | medium |
| pe_ratio | Price-to-Earnings Ratio | valuation | active | fundamentals | peRatio | Yes | valuation | No | critical |
| pb_ratio | Price-to-Book Ratio | valuation | active | fundamentals | pbRatio | No | valuation | No | high |
| ps_ratio | Price-to-Sales Ratio | valuation | active | fundamentals | revenue | No | valuation | No | medium |
| pcf_ratio | Price-to-Cash Flow Ratio | valuation | active | fundamentals | cashFlowFromOperations | No | valuation | No | medium |
| ev_ebitda | EV/EBITDA | valuation | active | fundamentals | evEbitda | No | valuation | No | medium |
| fcf_yield | Free Cash Flow Yield | valuation | active | fundamentals | fcfYield | No | valuation | No | medium |
| market_cap | Market Capitalization | valuation | active | fundamentals | marketCap | Yes | stability | No | critical |
| revenue_growth | Revenue Growth | growth | active | fundamentals | revenueGrowth | Yes | growth | No | critical |
| profit_growth | Profit Growth | growth | active | fundamentals | profitGrowth | No | growth | No | medium |
| eps_growth | EPS Growth | growth | active | fundamentals | epsGrowth | Yes | growth | No | critical |
| fcf_growth | Free Cash Flow Growth | growth | active | fundamentals | fcfGrowth | No | growth | No | medium |
| operating_profit_growth | Operating Profit Growth | growth | active | derived | operating_profit_growth | No | growth | No | medium |
| book_value_growth | Book Value Growth | growth | active | derived | book_value_growth | No | growth | No | medium |
| debt_to_equity | Debt-to-Equity Ratio | balance_sheet | active | fundamentals | debtToEquity | Yes | risk | No | critical |
| current_ratio | Current Ratio | balance_sheet | active | fundamentals | currentRatio | No | liquidity | No | high |
| quick_ratio | Quick Ratio | balance_sheet | active | derived | quick_ratio | No | liquidity | No | medium |
| interest_coverage | Interest Coverage Ratio | balance_sheet | active | derived | interest_coverage | No | stability | No | medium |
| total_assets | Total Assets | balance_sheet | active | fundamentals | totalAssets | No | stability | No | medium |
| total_debt | Total Debt | balance_sheet | active | fundamentals | totalDebt | No | risk | No | medium |
| equity | Shareholders Equity | balance_sheet | active | fundamentals | equity | No | stability | No | medium |
| cash_flow_from_operations | Cash Flow from Operations | cash_flow | active | fundamentals | cashFlowFromOperations | No | quality | No | medium |
| free_cash_flow | Free Cash Flow | cash_flow | active | derived | free_cash_flow | No | quality | No | medium |
| capex_to_revenue | CapEx-to-Revenue Ratio | cash_flow | active | derived | capex_to_revenue | No | quality | No | medium |
| operating_cf_to_net_income | Operating CF to Net Income | cash_flow | active | derived | operating_cf_to_net_income | No | quality | No | medium |
| fcf_to_revenue | FCF-to-Revenue Ratio | cash_flow | active | derived | fcf_to_revenue | No | quality | No | medium |
| gross_profit | Gross Profit | profitabilty_margins | active | fundamentals | revenue | No | quality | No | medium |
| operating_profit | Operating Profit | profitabilty_margins | active | fundamentals | operatingProfit | No | quality | No | medium |
| net_profit | Net Profit | profitabilty_margins | active | fundamentals | netProfit | No | quality | No | medium |
| revenue | Revenue | profitabilty_margins | active | fundamentals | revenue | No | quality | No | high |
| ebitda_margin | EBITDA Margin | profitabilty_margins | active | derived | ebitda_margin | No | quality | No | medium |
| dividend_yield | Dividend Yield | dividend_capital_returns | active | fundamentals | dividendYield | No | valuation | No | high |
| dividend_per_share | Dividend Per Share | dividend_capital_returns | active | fundamentals | dividendYield | No | valuation | No | medium |
| payout_ratio | Payout Ratio | dividend_capital_returns | active | derived | payout_ratio | No | valuation | No | medium |
| buyback_yield | Buyback Yield | dividend_capital_returns | experimental | unavailable | buyback_yield | No | valuation | No | low |
| total_shareholder_yield | Total Shareholder Yield | dividend_capital_returns | experimental | unavailable | total_shareholder_yield | No | valuation | No | low |
| sector_pe_relative | Sector-Relative P/E | sector_relative | experimental | derived | sector_pe_relative | No | sector | No | low |
| sector_pb_relative | Sector-Relative P/B | sector_relative | experimental | derived | sector_pb_relative | No | sector | No | low |
| sector_growth_relative | Sector-Relative Growth | sector_relative | experimental | derived | sector_growth_relative | No | sector | No | low |
| sector_margin_relative | Sector-Relative Margin | sector_relative | experimental | derived | sector_margin_relative | No | sector | No | low |
| sector_strength_factor | Sector Strength Factor | sector_relative | active | factors | sectorStrengthFactor | No | sector | No | medium |
| pe_percentile | P/E Percentile | peer_percentile | unavailable | unavailable | pe_percentile | No | sector | No | none |
| pb_percentile | P/B Percentile | peer_percentile | unavailable | unavailable | pb_percentile | No | sector | No | none |
| roe_percentile | ROE Percentile | peer_percentile | unavailable | unavailable | roe_percentile | No | sector | No | none |
| growth_percentile | Growth Percentile | peer_percentile | unavailable | unavailable | growth_percentile | No | sector | No | none |
| momentum_percentile | Momentum Percentile | peer_percentile | unavailable | unavailable | momentum_percentile | No | sector | No | none |
| dividend_count_12m | Dividend Count (12m) | corporate_actions | unavailable | unavailable | dividend_count_12m | No | events | No | none |
| split_count_12m | Split Count (12m) | corporate_actions | unavailable | unavailable | split_count_12m | No | events | No | none |
| bonus_count_12m | Bonus Issue Count (12m) | corporate_actions | unavailable | unavailable | bonus_count_12m | No | events | No | none |
| has_corporate_action_90d | Corporate Action (90d) | corporate_actions | unavailable | unavailable | has_corporate_action_90d | No | events | No | none |
| corporate_action_impact | Corporate Action Impact | corporate_actions | unavailable | unavailable | corporate_action_impact | No | events | No | none |
| free_float | Free Float | shareholding_ownership | active | fundamentals | freeFloat | No | ownership | No | medium |
| promoter_holding | Promoter Holding | shareholding_ownership | unavailable | unavailable | promoter_holding | No | ownership | No | none |
| institutional_holding | Institutional Holding | shareholding_ownership | unavailable | unavailable | institutional_holding | No | ownership | No | none |
| public_holding | Public Holding | shareholding_ownership | unavailable | unavailable | public_holding | No | ownership | No | none |
| pledged_promoter_holding | Pledged Promoter Holding | shareholding_ownership | unavailable | unavailable | pledged_promoter_holding | No | ownership | No | none |
| news_count_7d | News Count (7d) | news_events | unavailable | unavailable | news_count_7d | No | events | No | none |
| news_sentiment | News Sentiment | news_events | unavailable | unavailable | news_sentiment | No | events | No | none |
| news_volume_spike | News Volume Spike | news_events | unavailable | unavailable | news_volume_spike | No | events | No | none |
| earnings_announcement_days | Days Since Earnings | news_events | unavailable | unavailable | earnings_announcement_days | No | events | No | none |
| analyst_rating_change | Analyst Rating Change | news_events | unavailable | unavailable | analyst_rating_change | No | events | No | none |
| price_freshness_days | Price Freshness (days) | data_freshness | active | metadata | priceFreshnessDays | No | dataQuality | No | high |
| fundamental_freshness_days | Fundamental Freshness (days) | data_freshness | active | metadata | fundamentalFreshnessDays | No | dataQuality | No | high |
| factor_freshness_days | Factor Freshness (days) | data_freshness | active | metadata | factorFreshnessDays | No | dataQuality | No | high |
| feature_freshness_days | Feature Freshness (days) | data_freshness | active | metadata | featureFreshnessDays | No | dataQuality | No | high |
| max_data_age_days | Max Data Age (days) | data_freshness | active | metadata | freshnessThresholds | No | dataQuality | No | medium |
| provider_count | Provider Count | provider_confidence | active | metadata | providerCount | No | dataQuality | No | high |
| lineage_count | Lineage Count | provider_confidence | active | metadata | lineageCount | No | dataQuality | No | high |
| field_completeness | Field Completeness | provider_confidence | active | metadata | fieldCompleteness | No | dataQuality | No | high |
| stale_field_count | Stale Field Count | provider_confidence | active | metadata | staleFieldCount | No | dataQuality | No | high |
| source_confidence | Source Confidence | provider_confidence | active | metadata | sourceConfidence | No | dataQuality | No | high |
| score_change_1d | Score Change (1d) | score_stability | experimental | derived | score_change_1d | No | stability | No | low |
| score_change_5d | Score Change (5d) | score_stability | experimental | derived | score_change_5d | No | stability | No | low |
| score_change_20d | Score Change (20d) | score_stability | experimental | derived | score_change_20d | No | stability | No | low |
| score_volatility_20d | Score Volatility (20d) | score_stability | experimental | derived | score_volatility_20d | No | stability | No | low |
| score_trend | Score Trend | score_stability | experimental | derived | score_trend | No | stability | No | low |
| benchmark_return_20d | Benchmark Return (20d) | benchmark_market_regime | experimental | derived | benchmark_return_20d | No | risk | No | low |
| relative_strength_vs_benchmark | Relative Strength vs Benchmark | benchmark_market_regime | experimental | derived | relative_strength_vs_benchmark | No | momentum | No | low |
| market_volatility | Market Volatility (VIX-like) | benchmark_market_regime | experimental | derived | market_volatility | No | risk | No | low |
| sector_rotation_signal | Sector Rotation Signal | benchmark_market_regime | experimental | derived | sector_rotation_signal | No | sector | No | low |
| market_breadth | Market Breadth | benchmark_market_regime | experimental | derived | market_breadth | No | risk | No | low |
