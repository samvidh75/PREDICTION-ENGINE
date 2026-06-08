# DETERMINISTIC FINANCE AUDIT — TRACK-96A

## Summary

The `deriveDeterministicFinance` function in `formatCompanyFinance.ts` currently returns hardcoded zeros/NaNs (previously gutted), but the import chain and caller `useHeroFinance` hook in `CompanyUniversePage.tsx` still passes its values into the UI, displaying `"Unavailable"`, `"—"`, and `"NaNx"` in the market cap / PE sections. Additionally, `CompanyProgressiveFinancialAnalysis.tsx` and `MasterInfographicEngine.tsx` also call `deriveDeterministicFinance` and display its outputs directly.

A broader deterministic finance ecosystem exists across the codebase via `hashStringToSeed` and PRNG-based generation in `companyUniverseEngine.ts` (health state derivation, narrative generation, etc.). This audit covers only **financial metrics** (PE, PB, ROE, margins, growth rates, etc.) directly or transitively used by the Company Universe page. The wider deterministic health state/narrative system is out of scope per the task instructions but is noted.

---

## Primary Target: `deriveDeterministicFinance`

| File | Line | Metric Generated | Current Fallback |
|------|------|------------------|------------------|
| `src/components/companyUniverse/formatCompanyFinance.ts` | 71 | `marketCap`, `pe`, `industryPe`, `fiveYearPeAvg` | Returns `{ marketCap: 0, pe: NaN, industryPe: NaN, fiveYearPeAvg: NaN }` — already gutted |

## Callers of `deriveDeterministicFinance`

### 1. `CompanyUniversePage.tsx` — `useHeroFinance` hook

| File | Line(s) | Metric Displayed | Fallback Behaviour |
|------|---------|------------------|--------------------|
| `src/pages/CompanyUniversePage.tsx` | 55-58 (import), 124-125 (call) | Market cap (exact + words), PE (context) | `formatMarketCap(0)` → `"Unavailable"`; `formatPE(NaN)` → `"—"`. PE shown as `"—x"` in the hero HUD |
| `src/pages/CompanyUniversePage.tsx` | ~282-297 (render) | `heroFinance.marketCapExact`, `heroFinance.marketCapWords`, `heroFinance.pe` | Shows `"Unavailable"` and `"—x"` in UI |

**Verdict:** Already shows "Unavailable" / "—" for PE and market cap, but still imports + calls `deriveDeterministicFinance` via `useHeroFinance`. The import and hook must be removed.

### 2. `CompanyProgressiveFinancialAnalysis.tsx`

| File | Line(s) | Metric Displayed | Fallback Behaviour |
|------|---------|------------------|--------------------|
| `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` | 6 (import), 72-73 (call) | PE (context), industry PE, 5Y avg PE | `formatPE(NaN)` → `"—"`; `NaN.toFixed(1)` → `"NaN"`. Shows `"—x"` or `"NaNx"` in progressive disclosure |
| `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` | ~107 (render: "Valuation texture") | `finance.peFormatted`, `finance.marketCapExact` | Shows `"—x"` / `"Unavailable"` |
| `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` | ~140-142 (render: "Advanced valuation context") | `finance.peFormatted`, `finance.industryPe`, `finance.fiveYearPeAvg` | Shows `"—x"`, `"NaNx"`, `"NaNx"` |

**Verdict:** Imports + calls `deriveDeterministicFinance`. PE, industry PE, 5Y avg PE all derive from it. Must be replaced with real API data or "Unavailable".

### 3. `MasterInfographicEngine.tsx`

| File | Line(s) | Metric Displayed | Fallback Behaviour |
|------|---------|------------------|--------------------|
| `src/components/infographics/MasterInfographicEngine.tsx` | 5 (import), 79-80 (call) | marketCap (exact + words), PE (formatted), industryPe, fiveYearPeAvg via context | Provides `finance` to all child infographic components via context |
| `src/components/infographics/MasterInfographicEngine.tsx` | 25-27 (type), 80-93 (memo) | `FinanceDerived` type includes all deterministic fields | Wraps `deriveDeterministicFinance` result for context consumers |

**Verdict:** Imports + calls `deriveDeterministicFinance`. Provides deterministic finance to the entire infographic subtree. Must be replaced with real API data or "Unavailable".

---

## Secondary Deterministic Finance: `companyUniverseEngine.ts`

While `companyUniverseEngine.ts` (`src/services/company/companyUniverseEngine.ts`) does not call `deriveDeterministicFinance`, it is the broader deterministic generation engine for the entire Company Universe feature. It provides:

| Function | Line | What It Generates | Deterministic? |
|----------|------|-------------------|----------------|
| `hashStringToSeed` | 20-25 | FNV-1a hash → seed | Yes — deterministic hash |
| `mulberry32` | 27-34 | PRNG from seed | Yes — deterministic PRNG |
| `deriveHealthState` | 76-82 | Company `healthState` from ticker + narrativeKey | Yes — deterministic |
| `buildNarrative` | 84-123 | Narrative text from state + key | Yes — deterministic |
| `buildNews` | 131 | Returns `[]` (empty) | N/A — no data |
| `buildFinancialTelemetry` | 129 | Returns `[]` (empty) | N/A — telemetry array is always empty |
| `buildStrategicSummary` | 133 | Returns `"Data unavailable."` | Yes — hardcoded string |
| `buildFutureCapsules` | 135-160 | Future probability text from state + key | Yes — deterministic |
| `buildLeaders` | 127 | Returns `{ founders: [], leadership: [] }` | N/A — no data |
| `buildFoundingTimeline` | 125 | Returns `[]` (empty) | N/A — no data |

**Key finding:** `buildFinancialTelemetry` returns an empty array `[]`. This means `financialTelemetry.length` is always `0` for all callers, making the seed to `deriveDeterministicFinance` (`hashStringToSeed(\`${ticker}_${healthState}_${points.length}\`)`) always hash the same suffix `_0`. This further confirms all finance values are 100% synthetic with zero real data.

---

## Third-Party Deterministic Hash Functions (out of scope but noted)

These are in other files (charts, telemetry, holographic effects) and generate visual/display data that is NOT financial metrics. They are noted here for completeness but are outside the scope of TRACK-96A which targets Company Universe financial metrics specifically.

| File | Function | Purpose |
|------|----------|---------|
| `src/components/charts/chartData.ts` | `hashStringToSeed` | Chart data seeding |
| `src/components/commandCentre/InstitutionalActivityNetwork.tsx` | `hashStringToSeed` | Network visual layout |
| `src/components/companyUniverse/CompanyMarketStoryLayer.tsx` | `hashStringToSeed` | Market story visuals |
| `src/components/companyUniverse/useCompanyLiveTelemetry.ts` | `hashStringToSeed` | Live telemetry (price changes) |
| `src/components/telemetry/useHolographicTelemetryModel.ts` | `hashStringToSeed` | Holographic telemetry visuals |

---

## Audit Conclusion

1. **`deriveDeterministicFinance`** — Currently returns zeros/NaN. All 3 callers display `"Unavailable"`, `"—"`, or `"NaNx"`. The function, its export, and all imports/callers must be removed and replaced with real API data or proper "Unavailable" states.
2. **`hashStringToSeed` in `formatCompanyFinance.ts`** — Used as input seed for `deriveDeterministicFinance`. Must be removed if `deriveDeterministicFinance` is removed, unless other modules import it (they import their own local copies — verified in audit above).
3. **`companyUniverseEngine.ts`** — Broader deterministic engine (health state, narrative, etc.) is out of scope per task but `buildFinancialTelemetry` always returns `[]`, meaning all real financial data is missing.
4. **All finance metrics on CompanyUniversePage** currently resolve to `"Unavailable"`, `"—"`, or `"NaNx"`. The task requires replacing these with real data from `financial_snapshots` via `GET /api/company/{ticker}/financials`, or explicit "Financial data unavailable" messaging.

**Files requiring changes (Phase 2-4):**
- `src/components/companyUniverse/formatCompanyFinance.ts` — Remove `deriveDeterministicFinance`, `hashStringToSeed` (if no other callers in same file)
- `src/pages/CompanyUniversePage.tsx` — Remove `useHeroFinance` hook, remove imports of `deriveDeterministicFinance`/`hashStringToSeed`, replace with API fetch + loading/empty states
- `src/components/companyUniverse/CompanyProgressiveFinancialAnalysis.tsx` — Remove `deriveDeterministicFinance` usage, replace with API-fed props or "Unavailable"
- `src/components/infographics/MasterInfographicEngine.tsx` — Remove `deriveDeterministicFinance` usage, replace with API-fed context
- `src/backend/web/routes/` — Create new `GET /api/company/{ticker}/financials` endpoint reading `financial_snapshots`
