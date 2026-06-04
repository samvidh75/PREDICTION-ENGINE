# Mock Eradication Audit

Repository evidence inspected:
- `src/` scan via `findstr` for `mock|fixture|sample|placeholder|demo`

## Summary

The repository contains a large number of mock, placeholder, sample, and demo references. Some are clearly production fallbacks, while others are demo-only or likely safe to remove. This audit separates them by observed repository usage.

Status legend:
- **Production Path?** = appears on an active code path that can affect runtime
- **Dead Code?** = not observed on the active audited path
- **Safe To Remove?** = likely removable without breaking the audited active path; still requires manual verification

## High-Impact Occurrences

| File | Line | Occurrence | Production Path? | Dead Code? | Safe To Remove? |
|---|---:|---|---|---|---|
| `src/components/BrokerRedirector.tsx` | 21-22 | `mock external brokerage framework`, `terminal.mockbroker.in` | Yes | No | No |
| `src/components/CalibrationPlaceholder.tsx` | 3-14 | Placeholder component | Yes, via `PredictiveHologram` | No | No |
| `src/components/dashboard/DashboardHub.tsx` | 4 | `MockTelemetryStream` import | Yes | No | No |
| `src/components/HealthSummaryCard.tsx` | 58-60 | `SSI_MOCKINVALID`, `Mock Fallback Corp` | Yes | No | No |
| `src/core/data/MarketDataFetcher.ts` | 3, 9, 32, 62-136 | Mock data fallback routing | Yes | No | No |
| `src/core/data/MockDataFetcher.ts` | 2-4, 9, 83, 98-166 | Mock telemetry provider | Yes | No | No |
| `src/core/MarketConfig.ts` | 25, 36, 61, 70, 77 | Mock mode fallback enabled | Yes | No | No |
| `src/services/data/providers/HistoricalProvider.ts` | 8-13 | `MockHistoricalProvider` | Yes, but not wired to active gateway | Partial | Maybe |
| `src/services/data/providers/MetadataProvider.ts` | 8-17 | `MockMetadataProvider` | Yes, but not wired to active gateway | Partial | Maybe |
| `src/services/data/providers/NewsProvider.ts` | 16 | `MockNewsProvider` | Yes, but not wired to active gateway | Partial | Maybe |
| `src/services/data/providers/PriceProvider.ts` | 8 | `MockPriceProvider` | Yes, but not wired to active gateway | Partial | Maybe |
| `src/services/telemetry/mockTelemetrySnapshot.ts` | 3-19 | Mock telemetry snapshot | Yes | No | No |
| `src/services/telemetry/MockTelemetryStream.ts` | 3-56 | Mock telemetry stream | Yes | No | No |
| `src/views/CommunityHub.jsx` | 7-77 | Mock community dataset | Yes | No | No |
| `src/components/PredictiveHologram.tsx` | 19 | Calibration placeholder gating | Yes | No | No |
| `src/components/PredictiveHologram.test.tsx` | 19-29 | Test uses calibration placeholder | No | Yes | Yes |
| `src/components/subscriptions/FeatureGate.tsx` | 56 | `Blurred mock children preview` | Yes | No | No |
| `src/components/premium/PremiumTierSwitch.tsx` | 49, 51, 83 | demo labels / learning-first demo context | Yes | No | No |
| `src/components/StoryLessonViewer.jsx` | 15, 162 | content placeholder | Yes | No | No |
| `src/pages/PortfolioPage.tsx` | 21-22 | Mock volatility/drawdown comments | Yes | No | No |
| `src/services/news/NewsCoordinator.ts` | 15 | `MOCK_NEWS` | Yes | No | No |
| `src/services/realtime/RealtimeStateManager.ts` | 13, 22, 33, 39, 65, 68, 69, 72 | mock intervals / mock stream | Yes | No | No |
| `src/services/auth/firebase.ts` | 7-12 | placeholder config values | Yes | No | No |

## Production Path Assessment

### Clearly production-path fallbacks
These are not dead code because they are part of runtime behavior:
- `MarketDataFetcher` fallback to mock data
- `MockDataFetcher`
- `MockTelemetryStream`
- `MockTelemetrySnapshot`
- `NewsCoordinator.MOCK_NEWS`
- `RealtimeStateManager` mock stream behavior
- Firebase placeholder config defaults

Status:
- **Keep for now** if the repository requires runtime fallback.
- **Not safe to remove** without replacing the execution path.

### Demo/placeholder UI or string content
These are visible in UI or comments:
- broker mock URL
- calibration placeholder component
- demo labels in premium switch
- placeholder copy in story viewers and feature gates
- mock fallback corp labels

Status:
- **Should be removed or replaced** if the goal is production truth.
- Some are still actively consumed by UI, so removal requires code changes, not deletion.

### Likely dead or non-audited-path code
- `PredictiveHologram.test.tsx` placeholder-specific test path
- any mock-only strings inside tests
- mocked helper comments not affecting runtime

Status:
- **Likely safe to remove**, but only after verifying no other tests rely on them.

## Notable Findings

### `BrokerRedirector.tsx`
- Contains a mock brokerage URL:
  - `https://terminal.mockbroker.in/trade?symbol=${ticker}&ref=stockstory`
- This is a production path because the component is part of the company-page surface.
- It is not dead code.
- It is not safe to remove without replacement.

### `MarketConfig.ts`
- Explicitly enables mock fallback.
- This means mock data is not accidental; it is part of the runtime design.

### `CompanySuperpage` and related view code
- Several values remain hardcoded or placeholder-based, but they are not always labeled as `mock`.
- This audit should be read together with `COMPANY_PAGE_TRUTH_AUDIT.md`.

## Final Verdict

Mock and placeholder code is widespread and mixed between:
- runtime fallback infrastructure,
- demo-only UI text,
- and inactive test/helper paths.

Overall mock eradication status: **PARTIAL**

Primary conclusion:
- Many mock references are still part of active production paths.
- Not all mock content is safe to remove yet.
- The repository is not “mock-free” and not “truth-only” at the audited surfaces.
