# StockStory India Implementation Gap Map

This repo already contains substantial groundwork for the master-index brief, but the surface area is uneven. The most important gap is not "missing code everywhere" but "existing engines are not exposed as coherent product subsystems."

## Already Present

- Real-time quotes and websockets exist, now extended with derived microstructure endpoints.
- Portfolio, backtest, risk, alerts, earnings, and community modules already exist in `src/services`, `src/portfolio`, `src/backtest`, and `src/stockstory`.
- Warehouse and product migrations already cover a large share of the brief's schema ambitions.

## Gaps That Still Matter

- Market microstructure needed honest API exposure instead of only quote transport.
- Portfolio optimization existed as style/research machinery, but not as a direct user-facing optimize/stress-test surface.
- Walk-forward and backtesting logic exists, but is not exposed through clean API contracts.
- Earnings and sentiment are partially wired, but remain split across internal engines and commercial feeds.
- Community and alerts have storage/logic fragments, but need clearer product APIs.

## Priority Order

1. Market microstructure API
   Status: implemented in this session.
2. Portfolio optimization and stress testing API
   Status: implemented in this session.
3. Walk-forward/backtest route layer
4. Alerts rule-management API unification
5. Earnings calendar and sentiment normalization surface

## Implementation Principle

Favor repo-native gap closure over large speculative rewrites. Each subsystem should:

- expose a clean API contract
- state availability honestly
- avoid fabricating missing market structure or research evidence
- land with focused tests
