# REPORT 10: RefactorBlueprint — TRACK-36A Phased Implementation Plan

**Status:** DISCOVERY — NO CODE CHANGES
**Date:** 2025
**Source:** Agent track36a-agents-9-10
**Evidence Base:** Agent 1-8 findings + RiskMatrix (Report 9)

---

## Executive Summary

This blueprint orders TRACK-36A refactor work into 5 phases, sequenced by risk and dependency. Two proposals (#3 Ranking De-Coupling, #7 TradingView Embed) are confirmed NO-OPs — already implemented as described. They are excluded from implementation and should be closed as documentation-only items.

**Phasing Principle:** Ship safe changes first to build confidence, unblock prerequisites, then tackle the high-risk core transformations with full test coverage in place.

---

## Phase 0: NO-OP Closures (Zero Work)

| Proposal | Status | Evidence |
|----------|--------|----------|
| #3 Remove direct provider deps from ranking engines | **ALREADY DONE** | Engines use `EngineInputs` interface. Zero provider imports. Agent 3-4 confirmation. |
| #7 TradingView embed strategy | **ALREADY DONE** | Frontend widget only. No server-side API. Agent 1-2 confirmation. |

**Action:** Document current architecture. Close proposals. Move to Phase 1.

---

## Phase 1: SAFE FIXES

| Risk Level | **LOW** |
|------------|---------|
| Dependencies | None |
| Can deploy independently | Yes |
| Rollback difficulty | Trivial |

### What Changes

#### 1.1 Fix SQLiteAdapter.ts ESM/CJS Bug

| Field | Detail |
|-------|--------|
| **Exact files** | `PREDICTION-ENGINE/src/db/SQLiteAdapter.ts` |
| **Change** | Replace `require()` calls with ES module `import` statements |
| **Evidence** | Agent 3-4 confirmed: SQLiteAdapter has `require` in ESM context — currently broken |
| **Callers affected** | `PREDICTION-ENGINE/src/db/index.ts` (PostgreSQL primary with SQLite fallback) |
| **Why Phase 1** | Blocks Change #5 (yfinance migration needs working DB). Blocks any local development without PostgreSQL. |

#### 1.2 Fix Any Circular Dependencies

| Field | Detail |
|-------|--------|
| **Exact files** | Discover via `madge` or `dpdm` on the full codebase. Likely candidates: ProviderCoordinator ↔ providers, db ↔ adapters, intelligence routes ↔ cache |
| **Change** | Extract shared types to separate files, use dependency inversion where cycles exist |
| **Why Phase 1** | Circular deps cause subtle import order bugs and make later refactoring (Phase 2, 3) unpredictable |

### Test Requirements
- [ ] `tsc --noEmit` passes on full project
- [ ] SQLiteAdapter loads without runtime error when `DATABASE_URL` is unset
- [ ] `madge --circular` returns zero cycles
- [ ] Existing test suite passes (if any)

### Success Criteria
- Fresh clone works with only SQLite (no PostgreSQL required for local dev)
- Zero circular imports detected by static analysis
- All existing functionality unchanged

---

## Phase 2: PROVIDER ABSTRACTION

| Risk Level | **HIGH** |
|------------|----------|
| Dependencies | Phase 1 complete |
| Can deploy independently | No — touches core data pipe |
| Rollback difficulty | Hard — central infrastructure |

### What Changes

#### 2.1 Create MarketDataGateway

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/services/gateway/MarketDataGateway.ts` |
| **New files** | `PREDICTION-ENGINE/src/services/gateway/types.ts` (shared gateway interfaces) |
| **New files** | `PREDICTION-ENGINE/src/services/gateway/__tests__/MarketDataGateway.test.ts` |
| **Modified files** | `PREDICTION-ENGINE/src/services/ProviderCoordinator.ts` — moved behind gateway |
| **All callers** | Any file importing ProviderCoordinator directly must switch to gateway |

#### 2.2 Gateway Interface Contract

```typescript
// Proposed interface (implementation determined by actual ProviderCoordinator shape)
interface MarketDataGateway {
  getQuote(symbol: string): Promise<Quote>;
  getHistorical(symbol: string, range: DateRange): Promise<HistoricalData[]>;
  getFundamentals(symbol: string): Promise<Fundamentals>;
  getNews(symbol: string): Promise<NewsItem[]>;
}
```

#### 2.3 Move ProviderCoordinator Behind Gateway

| Field | Detail |
|-------|--------|
| **Evidence** | Agent 1-2: ProviderCoordinator imports all providers directly (Yahoo, Finnhub, Upstox, GoogleNewsRss, Screener) |
| **Implementation** | Gateway delegates to ProviderCoordinator internally. External callers never import providers or coordinator directly. |
| **Critical constraint** | Preserve failover chain order exactly: Upstox→Screener→Finnhub→Yahoo. Preserve all circuit breakers (F9). |

#### 2.4 Upstox Dual-Role Handling

| Field | Detail |
|-------|--------|
| **Evidence** | Agent 5-6: UpstoxProvider used in BOTH ProviderCoordinator (data) AND broker chain (trading). |
| **Constraint** | Gateway must NOT break the broker path. UpstoxProvider remains accessible to broker chain via separate import path or the gateway exposes a `getProvider()` escape hatch for broker use only. |

#### 2.5 Tests

| Field | Detail |
|-------|--------|
| **Gateway unit tests** | Mock all providers. Test failover order. Test circuit breaker behavior. |
| **Integration tests** | Real (sandbox) calls to each provider through gateway. |
| **Regression tests** | All intelligence endpoints return identical data before/after gateway insertion. |

### Test Requirements
- [ ] Gateway unit tests: 100% coverage of failover paths
- [ ] Gateway integration tests: each provider responds through gateway
- [ ] Ranking engine tests: same output with gateway as without
- [ ] Intelligence route tests: all 10+ endpoints return 200 with expected shape
- [ ] Broker tests: UpstoxProvider still reachable for trading flows

### Success Criteria
- Zero files import ProviderCoordinator directly (except gateway itself)
- All existing endpoints return identical responses (snapshot comparison)
- Failover works identically: kill provider → next in chain responds
- Circuit breakers fire and reset correctly through gateway
- Upstox dual-role intact: data and broker paths both functional

---

## Phase 3: DATA MIGRATION

| Risk Level | **MEDIUM-HIGH** (per change) |
|------------|------------------------------|
| Dependencies | Phase 2 complete (gateway in place) |
| Can deploy independently | Per change |
| Rollback difficulty | Screener: Easy (config flip). yfinance: Hard (new infra). |

### What Changes

#### 3.1 Screener as Primary Fundamental Source

| Field | Detail |
|-------|--------|
| **Modified files** | `PREDICTION-ENGINE/src/services/ProviderCoordinator.ts` (or gateway config) |
| **Evidence** | Agent 1-2: Current merge order is Upstox primary → Screener enrichment → Finnhub/Yahoo fallback |
| **Change** | Swap: Screener primary → Upstox enrichment → Finnhub/Yahoo fallback |
| **Mechanism** | Configuration change in gateway priority array. No code logic change. |
| **Prerequisite** | Run 2-week A/B comparison (Screener vs Upstox output for all tickers) to validate data quality parity |

#### 3.2 YFinance Migration (Conditional)

| Field | Detail |
|-------|--------|
| **Modified files** | `PREDICTION-ENGINE/src/services/providers/YahooProvider.ts` (deprecate) |
| **New files** | `PREDICTION-ENGINE/src/services/providers/YFinanceProvider.ts` (or bridge) |
| **New files** | `PREDICTION-ENGINE/src/services/bridge/yfinance-bridge/` (if Python bridge needed) |
| **Evidence** | Agent 1-2: Yahoo is in failover chain. Agent 3-4: SQLiteAdapter bug must be fixed first (Phase 1). |
| **Architecture decision** | yfinance is Python. Options: (A) Python subprocess bridge via child_process, (B) microservice HTTP wrapper, (C) find a TypeScript-native alternative (e.g., yahoo-finance2 npm). Evaluate before committing. |
| **Prerequisite** | Phase 1 (SQLiteAdapter fix) + architecture decision on bridge approach |

### Test Requirements

**Screener flip:**
- [ ] Snapshot comparison: Screener vs Upstox fundamentals for 100+ tickers
- [ ] Gateway integration tests with new priority order
- [ ] Circuit breaker test: kill Screener → Upstox takes over

**yfinance migration:**
- [ ] Bridge unit tests (mock Python subprocess)
- [ ] Schema mapping tests: Yahoo output schema → yfinance output schema
- [ ] Rate limit characterization: how many calls/minute does yfinance allow?
- [ ] Latency benchmark: yfinance bridge vs direct Yahoo HTTP
- [ ] All gateway tests pass with YFinance in one provider slot

### Success Criteria

**Screener flip:**
- Identical or better data quality vs Upstox primary (measured over 2-week parallel run)
- No increase in error rate from Screener provider
- Failover to Upstox works when Screener is down

**yfinance migration:**
- Schema-compatible output (gateway consumers see no difference)
- Latency within 2x of Yahoo HTTP
- No new runtime dependencies that can't be installed via standard tooling

---

## Phase 4: COMPLIANCE

| Risk Level | **LOW-MEDIUM** |
|------------|-----------------|
| Dependencies | Phase 2 (gateway exists as stable foundation) |
| Can deploy independently | Yes — additive modules |
| Rollback difficulty | Easy — feature flags |

### What Changes

#### 4.1 SEBI Compliance Layer

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/compliance/SEBIGuard.ts` |
| **New files** | `PREDICTION-ENGINE/src/compliance/rules.ts` (SEBI rule definitions) |
| **New files** | `PREDICTION-ENGINE/src/compliance/__tests__/SEBIGuard.test.ts` |
| **Modified files** | `PREDICTION-ENGINE/src/routes/intelligence.ts` — wrap responses with compliance check |
| **Evidence** | Agent 7-8: No investment advice language found. This is greenfield. |

#### 4.2 Data Classification Engine

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/compliance/DataClassifier.ts` |
| **New files** | `PREDICTION-ENGINE/src/compliance/classification-rules.json` |
| **Change** | Tags all data fields: PUBLIC, INTERNAL, SENSITIVE, RESTRICTED |
| **Integration** | Gateway responses pass through classifier before reaching routes |

#### 4.3 Guest User Restrictions

| Field | Detail |
|-------|--------|
| **Modified files** | `PREDICTION-ENGINE/src/routes/intelligence.ts` (or middleware layer) |
| **New files** | `PREDICTION-ENGINE/src/middleware/guestGuard.ts` |
| **Change** | Guest users get limited data (classification-filtered). Logged-in get full access. |

### Test Requirements
- [ ] SEBIGuard: Verify no prediction response contains "buy", "sell", "recommend", or equivalent in any Indian language
- [ ] DataClassifier: All gateway output fields tagged with correct classification
- [ ] GuestGuard: Guest requests return filtered data; premium requests return full data
- [ ] Feature flag: disable compliance layer — everything works as before

### Success Criteria
- SEBI audit: automated scan finds zero advisory language in API responses
- Data classification: 100% of fields tagged
- Guest mode: zero sensitive data leaked to unauthenticated users
- Performance: compliance checks add <50ms to response time

---

## Phase 5: HARDENING

| Risk Level | **LOW** |
|------------|---------|
| Dependencies | Phase 2 (gateway), Phase 4 (compliance for broker isolation) |
| Can deploy independently | Yes — observability and isolation tools |
| Rollback difficulty | Easy — separate modules |

### What Changes

#### 5.1 Broker Isolation Layer

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/services/brokers/BrokerGateway.ts` |
| **Modified files** | `PREDICTION-ENGINE/src/services/brokers/UpstoxProvider.ts` — dual-role refactor |
| **Evidence** | Agent 5-6: 6 broker files. UpstoxProvider used by both ProviderCoordinator and broker chain. |
| **Change** | Separate UpstoxProvider into two concerns: `UpstoxDataProvider` (for gateway) and `UpstoxBrokerProvider` (for trading). BrokerGateway abstracts all 6 brokers behind single interface. Tokens isolated behind BrokerGateway — never exposed to data layer. |
| **Constraint** | Must coordinate with Phase 2 Upstox dual-role handling. |

#### 5.2 Outage Simulation Engine (Data Survivability)

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/survivability/OutageSimulator.ts` |
| **New files** | `PREDICTION-ENGINE/src/survivability/scenarios/` (provider-down, db-down, rate-limit, partial-failure) |
| **Change** | Non-production tool that injects failures into gateway to verify resilience. |
| **Integration** | Uses gateway's provider interface to inject fault probes. |

#### 5.3 Architecture Audit & Runtime Enforcement

| Field | Detail |
|-------|--------|
| **New files** | `PREDICTION-ENGINE/src/audit/ArchGuard.ts` |
| **New files** | `PREDICTION-ENGINE/.archguard-rules.json` |
| **Change** | CI-integrated tool that verifies: no direct provider imports outside gateway, no broker token leaks, no circular deps, compliance layer present on all routes. |
| **CI integration** | GitHub Action or pre-commit hook. Warning mode initially → error mode after stabilization. |

### Test Requirements

**Broker isolation:**
- [ ] BrokerGateway unit tests with mocked broker providers
- [ ] Token isolation test: data layer cannot access broker tokens
- [ ] All 6 broker providers functional through gateway
- [ ] Upstox dual-role split: both data and trading paths work

**Outage simulation:**
- [ ] All scenarios run against staging environment
- [ ] System recovers within SLA for each scenario
- [ ] No data corruption from any simulated outage

**Architecture audit:**
- [ ] ArchGuard passes on clean codebase
- [ ] ArchGuard catches intentional violations in test fixtures
- [ ] Zero false positives on known-good code patterns

### Success Criteria
- BrokerGateway: zero token references in non-broker code
- OutageSimulator: all scenarios pass → system degrades gracefully, recovers automatically
- ArchGuard: CI pipeline blocks architecture violations before merge
- Zero performance regression from any hardening module

---

## Dependency Graph

```
Phase 0 (NO-OP Closures)
    │
    ▼
Phase 1 (SAFE FIXES)
    │ SQLiteAdapter fix, circular dep fix
    ▼
Phase 2 (PROVIDER ABSTRACTION) ──► Unblocks: Phase 3, Phase 4, Phase 5
    │ Gateway + ProviderCoordinator refactor
    ├────────────┬────────────┐
    ▼            ▼            ▼
Phase 3        Phase 4      Phase 5
DATA MIGR.     COMPLIANCE   HARDENING
(Screener,     (SEBI,       (Broker, Outage,
 yfinance)     Classifier,   Audit)
               GuestGuard)
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
          ALL PHASES COMPLETE
```

### Phase 2 is the Critical Path

Everything depends on Phase 2. If the gateway abstraction fails or introduces bugs, all subsequent phases are blocked. Therefore:

- **Phase 2 gets the most testing budget** — full regression suite, snapshot comparisons, staging deployment
- **Phase 2 can absorb #2 and #6 from the risk matrix** — design gateway to accommodate both data isolation AND broker isolation
- **No Phase 3/4/5 work starts until Phase 2 is stable in production for 1 week**

---

## Risk Summary by Phase

| Phase | Risk | Blast Radius | Rollback | Key Constraint |
|-------|------|-------------|----------|----------------|
| 0 | NONE | Nothing | N/A | None |
| 1 | LOW | DB fallback only | Trivial | Must fix before Phase 3 |
| 2 | HIGH | Entire platform | Hard | Preserve ProviderCoordinator behavior exactly |
| 3 | MED-HIGH | Data quality | Per-change | A/B test Screener first; yfinance architecture TBD |
| 4 | LOW-MED | Response content | Feature flag | Additive only |
| 5 | LOW | Observability | Separate module | Upstox dual-role must be clean |

---

## Timeline Estimate (Rough Order)

| Phase | Effort | Confidence |
|-------|--------|------------|
| Phase 1 | 1-2 days | High — known fixes |
| Phase 2 | 1-2 weeks | Medium — core refactor, needs deep testing |
| Phase 3 (Screener) | 2 weeks A/B + 1 day flip | High — config change only |
| Phase 3 (yfinance) | 2-4 weeks | Low — unknown bridge complexity |
| Phase 4 | 1-2 weeks | High — additive greenfield |
| Phase 5 | 1-2 weeks | Medium — Upstox split is nuanced |

**Total estimated:** 5-10 weeks (excluding yfinance if complex bridge needed)

---

## Decisions Made (in absence of complete information)

1. **Phase 2 is mandatory gateway, not optional abstraction** — RiskMatrix Report 9 rated Change #2 as HIGH risk. The gateway is necessary infrastructure. Skipping it means accepting direct provider coupling forever.

2. **yfinance is conditional** — If bridge complexity is high (Python subprocess management, rate limit differences, schema incompatibility), consider TypeScript-native alternatives (yahoo-finance2 npm) instead of forcing yfinance.

3. **Upstox split is deferred to Phase 5, not Phase 2** — Phase 2 creates the data gateway and preserves the dual-role as-is. Phase 5 splits it cleanly once the gateway pattern is proven.

4. **Compliance is additive middleware, not inline code** — SEBI checks, data classification, and guest restrictions wrap existing routes rather than modifying them. This preserves existing behavior when flags are off.

5. **Architecture audit starts in warn-only mode** — Prevents developer friction. Moves to error mode after 2 weeks of zero false positives.