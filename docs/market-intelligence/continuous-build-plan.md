# Continuous Market Brain Build Plan

This plan defines the next build sequence for StockStory India.

## Objective

Build the strongest practical Indian equities research engine in phases without turning the product into a broker clone or a backend diagnostics UI.

## Build sequence

1. Deterministic market brain core.
2. Adapter from existing StockStory engine inputs to the market brain packet.
3. Unit tests for scoring boundaries.
4. Research narrative formatter.
5. Backend read endpoint for product-safe research output.
6. Frontend integration into company research, scanner, compare, watchlist, and portfolio thesis monitor.
7. Evidence and compliance audit layer.
8. Data-domain expansion for shareholding, corporate actions, announcements, and sector context.
9. Backtesting and calibration reports.
10. Production verification gates.

## Non-negotiables

- No fake data.
- No fake recommendations.
- No direct order placement inside StockStory.
- No provider or backend plumbing in normal frontend routes.
- The deterministic engine remains the source of truth.
- The LLM explains engine output only.
