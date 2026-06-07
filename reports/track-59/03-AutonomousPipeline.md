# Agent C — Autonomous Prediction Pipeline

## Flow
Generate Predictions → Validate Mature Predictions → Update Metrics → Refresh Feed

## Components
- **predictionFactory**: src/predictions/PredictionFactory.ts — creates prediction records with timestamp, symbol, horizon
- **outcomeValidator**: src/validation/OutcomeValidator.ts — validates mature predictions against realized prices
- **trustMetricsService**: Computes hit rates, Sharpe, calibration from validated outcomes
- **feedRefresh**: Updates Trust Centre JSON with live metrics from computed stats

## Automation
All metrics sourced from alpha_research_registry.hit column. No manual numbers.
