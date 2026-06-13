# Feature Registry

## Overview

The Feature Registry is a centralized catalog of all features used by the Unified Prediction Engine. It defines 117 features organized into 20 families, each with complete metadata describing its source, transformation, availability, and role in the scoring system.

## Total Feature Count

| Metric | Value |
|---|---|
| Total features | 117 |
| Active features | 87 |
| Experimental features | 11 |
| Unavailable features | 19 |
| Required features | 11 |
| Feature families | 20 |

## Breakdown by Family

| # | Family | Count | Active | Experimental | Unavailable |
|---|---|---|---|---|---|
| 1 | price_return | 8 | 8 | 0 | 0 |
| 2 | volume_liquidity | 5 | 5 | 0 | 0 |
| 3 | trend_momentum | 11 | 11 | 0 | 0 |
| 4 | volatility_risk | 6 | 6 | 0 | 0 |
| 5 | fundamental_quality | 7 | 7 | 0 | 0 |
| 6 | valuation | 7 | 7 | 0 | 0 |
| 7 | growth | 6 | 6 | 0 | 0 |
| 8 | balance_sheet | 7 | 7 | 0 | 0 |
| 9 | cash_flow | 5 | 5 | 0 | 0 |
| 10 | profitability_margins | 5 | 5 | 0 | 0 |
| 11 | dividend_capital_returns | 5 | 3 | 2 | 0 |
| 12 | sector_relative | 5 | 1 | 4 | 0 |
| 13 | peer_percentile | 5 | 0 | 0 | 5 |
| 14 | corporate_actions | 5 | 0 | 0 | 5 |
| 15 | shareholding_ownership | 5 | 1 | 0 | 4 |
| 16 | news_events | 5 | 0 | 0 | 5 |
| 17 | data_freshness | 5 | 5 | 0 | 0 |
| 18 | provider_confidence | 5 | 5 | 0 | 0 |
| 19 | score_stability | 5 | 0 | 5 | 0 |
| 20 | benchmark_market_regime | 5 | 0 | 5 | 0 |

## Activation Criteria

Features are classified into three activation states:

### Active (87 features)

Features with direct source coverage from the `UnifiedPredictionInput` data model. These include:

- **Price data** (family: price_return): OHLCV prices and derived returns
- **Technical indicators** (family: trend_momentum, volatility_risk): RSI, MACD, ADX, ATR, Bollinger Bands, etc.
- **Fundamental data** (families: fundamental_quality, valuation, growth, balance_sheet, cash_flow, profitability_margins): ROE, ROA, P/E, debt ratios, margins, etc.
- **Factor scores** (families: fundamental_quality, sector_relative): qualityFactor, sectorStrengthFactor
- **Metadata** (families: data_freshness, provider_confidence): freshness days, provider counts, completeness metrics
- **Ownership** (family: shareholding_ownership): freeFloat
- **Capital returns** (family: dividend_capital_returns): dividend yield, dividend per share, payout ratio

Active features have `defaultAvailability >= 0.60` and `sourceTable != 'unavailable'`. They are ready for production use.

### Experimental (11 features)

Features that require additional data sources or computation not yet available in the current data model:

- **score_stability** (5 features): Requires historical score tracking to compute changes, volatility, and trends
- **benchmark_market_regime** (5 features): Requires benchmark index price data and market-wide breadth data
- **buyback_yield**, **total_shareholder_yield** (2 features from dividend_capital_returns): Requires share buyback data
- **sector_pe_relative**, **sector_pb_relative**, **sector_growth_relative**, **sector_margin_relative** (4 features from sector_relative): Requires peer median calculations

Experimental features have `defaultAvailability < 0.50`. They are defined in the registry to maintain a complete feature catalog but are not computed during standard prediction runs.

### Unavailable (19 features)

Features that depend on external data feeds not yet integrated:

- **peer_percentile** (5 features): Requires a peer-group database with percentile computations
- **corporate_actions** (5 features): Requires a corporate actions feed (dividends, splits, bonus issues)
- **shareholding_ownership** (4 of 5 features): Requires shareholding pattern data (promoter, institutional, public holdings)
- **news_events** (5 features): Requires news aggregation and NLP sentiment analysis

Unavailable features have `defaultAvailability = 0` and `sourceTable = 'unavailable'`. They serve as placeholders for future data source integration.

## Required vs Optional Features

### Required Features (11)

These are core features that must be present for reliable prediction. If a required feature is missing, the engine's confidence in that factor group is significantly reduced:

| Feature | Factor Group | Reason |
|---|---|---|
| close | stability | Base price for all price-derived computations |
| volume | liquidity | Core liquidity measure |
| beta | risk | Systematic risk measurement |
| roe | quality | Primary profitability ratio |
| roa | quality | Asset efficiency measure |
| roic | quality | Capital efficiency measure |
| pe_ratio | valuation | Primary valuation multiple |
| market_cap | stability | Size classification and stability |
| revenue_growth | growth | Primary top-line growth metric |
| eps_growth | growth | Primary bottom-line growth metric |
| debt_to_equity | risk | Primary leverage indicator |

### Optional Features (106)

All other features are optional. Their absence reduces data completeness and may lower confidence in the relevant factor group, but does not prevent prediction.

## Transform Descriptions

| Transform | Function | Used For |
|---|---|---|
| `identity` | `f(x) = x` | Raw values that need no transformation (RSI, scores, percentages) |
| `inverse` | `f(x) = 1/x` | Valuation multiples (P/E, P/B) converted to yields; division by zero returns null |
| `log10` | `f(x) = log10(x)` | Market cap, volume, dollar amounts; handles wide dynamic ranges; negative/zero returns null |
| `zscore` | `f(x) = (x - μ) / σ` | Relative volume, Bollinger width; requires population parameters |
| `winsorize` | `f(x) = clamp(x, min, max)` | ROE, growth rates, volatility; caps extreme outliers at configured bounds |
| `percentile` | `f(x) = rank(x) / N * 100` | Peer percentile comparisons; currently unused (unavailable features) |
| `binary` | `f(x) = 0 if x == 0 else 1` | Flag features (corporate action flags, sector rotation signals) |
| `ratio` | `f(x, y) = x / y` | Computed ratios (turnover, payout, coverage ratios); division by zero returns null |
| `difference` | `f(x, y) = x - y` | MACD histogram, spread computations |
| `custom` | Domain-specific logic | Complex composite transformations |
| `unavailable` | N/A | Features not yet implemented; transform is a no-op |

All transforms are deterministic: given the same inputs, they always produce the same output. All transforms handle:
- `null` inputs by returning `null`
- `NaN` inputs by returning `null`
- `Infinity` / `-Infinity` inputs by returning `null`
- Division by zero by returning `null`

## Null Policy Descriptions

| Policy | Behavior | Applied To |
|---|---|---|
| `reject_group` | If this feature has null value, the entire factor group score is considered unavailable (null) | Core features essential to factor computation (close, volume, roe) |
| `reduce_confidence` | Null value reduces the confidence level of the feature and its factor group but does not nullify the group score | Important but non-essential features (open, pe_ratio when others available) |
| `tolerate` | Null value is tolerated with minimal impact on confidence; feature is excluded from computation | Nice-to-have features, derived features, freshness metrics |

## Directionality Notes

- **higher_is_better**: Used for profitability metrics (ROE, ROA, margins), growth rates, momentum, liquidity measures, and quality scores
- **lower_is_better**: Used for risk metrics (volatility, beta, debt ratios), valuation multiples (P/E, P/B), data age indicators, and stale field counts
- **neutral**: Used for raw prices, volumes, scores that require context (RSI at 50 is neutral), and flags/events where direction depends on context

Directionality is metadata for downstream consumers (explanation generation, scorecards) and does not affect the transformation logic.

## How New Features Are Added

1. **Define the feature**: Add a new `FeatureDefinition` object to the `FEATURE_REGISTRY` array in `FeatureRegistry.ts`
2. **Choose the family**: Assign one of the 20 `FeatureFamily` values; keep the feature's `factorGroup` consistent with its family
3. **Set activation status**:
   - `'active'` if the input data model already provides the source field
   - `'experimental'` if the feature requires data not yet available but planned
   - `'unavailable'` if the feature depends on an external data source not yet integrated
4. **Determine null policy**: Use `'tolerate'` for new optional features; escalate to `'reduce_confidence'` or `'reject_group'` only if the feature becomes critical
5. **Select a transform**: Prefer standard transforms (`identity`, `ratio`, `log10`, `inverse`) over `'custom'` where possible
6. **Set availability**: Set `defaultAvailability` based on expected production coverage (0.6-0.95 for active, <0.5 for experimental, 0 for unavailable)
7. **Ensure uniqueness**: Verify the feature `id` does not collide with existing feature IDs
8. **Update tests**: Add test coverage for the new feature in `FeatureRegistry.test.ts`
9. **Document**: Update this report and any downstream documentation

## Helper Functions

| Function | Return Type | Description |
|---|---|---|
| `getFeatureById(id)` | `FeatureDefinition \| undefined` | Lookup a feature by its unique ID |
| `getFeaturesByFamily(family)` | `FeatureDefinition[]` | Get all features in a given family |
| `getActiveFeatures()` | `FeatureDefinition[]` | Features with `activationStatus === 'active'` |
| `getUnavailableFeatures()` | `FeatureDefinition[]` | Features with `activationStatus === 'experimental' \| 'unavailable'` |
| `getRequiredFeatures()` | `FeatureDefinition[]` | Features with `required === true` |
| `getFeatureCount()` | `number` | Total features in registry |
| `getActiveFeatureCount()` | `number` | Count of active features |
| `getFeatureFamilies()` | `FeatureFamily[]` | All 20 family names |

## Data Flow

```
UnifiedPredictionInput
        │
        ▼
  buildFeatureValues()       ◄──── FeatureRegistry (definitions)
        │                              │
        ▼                              ▼
  UnifiedFeatureValue[]      FeatureVector (runtime wrapper)
        │                              │
        ▼                              ▼
  FeatureTransforms          applyTransform / getTransformed()
        │
        ▼
  UnifiedPredictionOutput.featureVector
```
