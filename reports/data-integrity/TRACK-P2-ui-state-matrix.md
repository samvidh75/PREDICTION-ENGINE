# TRACK-P2 — UI State Matrix

**Date:** 2026-06-09

Every frontend component consuming analytical API endpoints must render the following distinct states based on the `status` and `mode` fields in the `AnalyticalResponse<T>` envelope.

---

## Component State Mapping

| Component | Loading | Real | Partial | Stale | Unavailable | Empty | Demo | Error |
|-----------|---------|------|---------|-------|-------------|-------|------|-------|
| **CompanyIntelligencePanel** | Skeleton/Spinner | Full dashboard with insights + narrative | `<PartialDataWarning>` with `availableSections` / `unavailableSections` | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState reason={reason} message={message} />` | N/A | `<DemoBadge />` | `<ErrorBanner reason={reason} message={message} onRetry={...} />` |
| **PortfolioDashboard** | Skeleton/Spinner | Full portfolio analysis | `<PartialDataWarning>` with missing inputs | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState reason={reason} />` | `<AddHoldingsPrompt />` (shows "No positions supplied") | `<DemoBadge />` with "Sample Portfolio" label | `<ErrorBanner />` |
| **SignalFeedPanel** | Skeleton/Spinner | Signal list with entries | N/A | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState reason="SNAPSHOT_NOT_GENERATED" />` | `<NoSignificantSignals />` (shows "No significant changes") | N/A | `<ErrorBanner />` |
| **StockStoryPage** | Skeleton/Spinner | Score card with engine breakdowns | N/A | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState reason="PREDICTION_NOT_FOUND" message={message} />` | N/A | N/A | `<ErrorBanner />` |
| **ExplainabilityPanel** | Skeleton/Spinner | Full explanation view | N/A | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState reason={reason} />` | N/A | N/A | `<ErrorBanner />` |
| **MarketIntelligencePanel** | Skeleton/Spinner | Market mood, breadth, trends | `<PartialDataWarning>`, missing sections grayed out | `<FreshnessBadge value="stale" asOf={...} />` | `<UnavailableState />` | N/A | N/A | `<ErrorBanner />` |
| **ConfidenceBadge** (shared) | N/A | Score displayed with color (green ≥70, yellow ≥40, red <40) | Reduced score + warning icon | Grey + "Stale" label | Hidden (not applicable) | N/A | Hidden | Hidden |
| **FreshnessBadge** (shared) | N/A | `live` (green), `recent` (blue) | N/A | `stale` (amber), `expired` (red) | `unknown` (grey) | N/A | N/A | Hidden |
| **CompletenessIndicator** (shared) | N/A | 100% = full bar green | <100% = partial bar with missing list | N/A | 0% = red "No data" | N/A | N/A | Hidden |

---

## Required Reusable UI Components

### `<DataStateBanner />`
Renders a top-level banner based on `mode`:
- `production_real`: Not shown
- `production_partial`: Yellow banner "Data is partially available"
- `production_unavailable`: Red banner "Data unavailable"
- `demo`: Blue banner "Demonstration Mode"

### `<FreshnessBadge />`
Props: `freshness: DataFreshness`, `asOf: string | null`
- `live`: Green badge "Live"
- `recent`: Blue badge "Recent"
- `stale`: Amber badge "Stale — as of {asOf}"
- `expired`: Red badge "Expired — as of {asOf}"
- `unknown`: Grey badge "Unknown"

### `<CompletenessIndicator />`
Props: `score: number`, `missingFields: string[]`
- Full bar showing score percentage
- Tooltip listing missing fields
- Color: green (≥80), yellow (≥50), red (<50)

### `<DemoBadge />`
Props: none
- Purple badge "DEMO"
- Only rendered when `mode === 'demo'` or `isDemo === true`

### `<UnavailableState />`
Props: `reason: string`, `message: string | null`
- Shows reason code and human-readable message
- "Data unavailable" heading
- Suggested action if applicable (e.g., "Run prediction pipeline")

### `<PartialDataWarning />`
Props: `missingInputs: string[]`, `availableSections?: string[]`, `unavailableSections?: string[]`
- Yellow banner listing what's missing
- "Analysis is based on partial data"
- Affected sections grayed out or hidden

### `<NoSignificantSignals />`
- "No significant changes detected in current prediction window"
- Friendly empty state, not an error

### `<AddHoldingsPrompt />`
- "Add positions to see portfolio analysis"
- Link to portfolio management

### `<ErrorBanner />`
Props: `reason: string`, `message: string | null`, `onRetry?: () => void`
- Red banner with error reason
- Retry button if `onRetry` provided

---

## State Detection Logic

```typescript
function detectState(response: AnalyticalResponse<unknown>) {
  // 1. Check for error
  if (response.status === 'error') return 'error';
  
  // 2. Check for demo
  if (response.mode === 'demo' || response.status === 'demo') return 'demo';
  
  // 3. Check for unavailable
  if (response.status === 'unavailable' || response.mode === 'production_unavailable') return 'unavailable';
  
  // 4. Check for partial
  if (response.status === 'partial' || response.mode === 'production_partial') return 'partial';
  
  // 5. Check for empty
  if (response.status === 'empty') return 'empty';
  
  // 6. Check for real
  if (response.status === 'ok' && response.mode === 'production_real') {
    // Check for staleness
    if (response.dataState.freshness === 'stale' || response.dataState.freshness === 'expired') {
      return 'stale';
    }
    return 'real';
  }
  
  return 'error'; // fallback
}
```

---

## UI Prohibitions

The frontend MUST NEVER:

| Prohibited Behavior | Example | Correct Behavior |
|---|---|---|
| Convert `unavailable` → "markets are stable" | Backend fails → UI shows "Markets are stable" | Show `<UnavailableState reason="DATABASE_UNAVAILABLE" />` |
| Convert `empty` → "healthy" | No signals → UI shows "Portfolio is healthy" | Show `<NoSignificantSignals />` |
| Convert `stale` → live badge | 3-day-old data → green "Live" badge | Show amber "Stale — as of 2026-06-06" badge |
| Convert `demo` → production | User didn't opt in → UI shows as real | Show `<DemoBadge />` prominently |
| Show green confidence for unavailable data | `completenessScore: 0` → green 100% | Hide confidence badge or show grey |
| Show provider badge without lineage | "Validated by NSE" when provider is null | Never show provider badge when provider is null |
| Claim "real-time" without `freshness: 'live'` | Freshness is `recent` → UI says "Real-time" | Only show "Live" when freshness is `live` |
| Fabricate analysis on error | Backend 500 → UI shows computed analysis | Show error banner with retry |

---

## Integration Checklist

For each frontend component, verify:

- [ ] Handles `loading` state (spinner/skeleton)
- [ ] Handles `real` state (normal rendering)
- [ ] Handles `partial` state (warning + limited sections)
- [ ] Handles `stale` state (badge visible)
- [ ] Handles `unavailable` state (message displayed)
- [ ] Handles `empty` state (if applicable)
- [ ] Handles `demo` state (if applicable)
- [ ] Handles `error` state (banner + retry)
- [ ] Does not convert unavailable → stable
- [ ] Does not convert empty → healthy
- [ ] Does not show green confidence badge when completeness is 0
- [ ] Does not show live badge when freshness is not `live`
- [ ] Does not show provider validation badge when provider is null
