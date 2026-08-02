# Stock Detail Precision Redesign — Proportions, Speed, Broker Handoff, Trendlyne

## Baseline Commit: `45f0985ea`

## Issues Identified
1. **Redundant copy** — "Market context", "Price journey", filler descriptions throughout chart, Healthometer, AnalysisMeters, News
2. **Header too large** — excessive padding, whitespace, oversized cards
3. **Chart panel oversized** — too tall, poorly balanced with other sections
4. **No floating broker CTA** — "Buy via broker" label needs changing to "Invest" / "Continue with broker"
5. **Top action row cluttered** — unnecessary action buttons
6. **No chart color adapt** — green/red logic exists but area gradients need verification
7. **No quote caching** — re-fetches on every mount
8. **No Trendlyne integration** — widget exists but not wired
9. **Micro-design rough** — inconsistent spacing, borders, font sizes

## Files to Change
- `src/pages/StockStoryPageF0.tsx` — main layout, sections, copy, actions, floating CTA
- `src/components/research/HealthometerPanel.tsx` — compact redesign
- `src/components/research/AnalysisMeters.tsx` — remove redundant copy
- `src/components/research/StockNewsPanel.tsx` — remove redundant copy
- `src/components/research/FinancialHistogram.tsx` — remove redundant copy
- `src/components/market/HistoricalPriceChart.tsx` — verify colors, compact
- `src/components/invest/InvestHandoffSheet.tsx` — broker handoff UX
- `src/hooks/useLiveQuotes.ts` — add caching/dedup
- `scripts/trendlyne-config.ts` — Trendlyne config script
- `scripts/trendlyne-smoke.ts` — Trendlyne smoke script
- `src/backend/integrations/trendlyne/` — Trendlyne adapter files
- `src/components/external/TrendlyneWidget.tsx` — existing widget check

## Acceptance Checklist
- [x] Remove "Market context", "Price journey", filler copy
- [x] Compact header (20-24px padding, not oversized)
- [x] Chart height: desktop 360-440px, mobile 260-320px
- [x] Top action row: Compare only
- [x] Floating CTA: "Invest" or "Continue with broker"
- [x] Broker handoff: review sheet first, no fake active brokers
- [x] Chart color adapts green/red per period return
- [x] Price accuracy: no NaN/null/undefined
- [x] Quote caching with stale-while-revalidate
- [x] Healthometer compact design
- [x] Trendlyne adapter (disabled if no API key)
- [x] No forbidden copy in public UI
- [x] All tests pass
- [x] 50 e2e pass
