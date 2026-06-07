# REPORT 9: RiskMatrix — TRACK-36A Refactor Risk Classification

**Status:** DISCOVERY — NO CODE CHANGES
**Date:** 2025
**Source:** Agent track36a-agents-9-10
**Evidence Base:** Agent 1-8 findings summarized below

---

## Evidence Summary from Prior Agents

| Fact # | Finding | Source |
|--------|---------|--------|
| F1 | Ranking engines are ALREADY provider-independent — take `EngineInputs`, no provider imports | Agent 3-4 |
| F2 | ProviderCoordinator imports all providers directly (Yahoo, Finnhub, Upstox, GoogleNewsRss, Screener) | Agent 1-2 |
| F3 | Upstox is wrapped in try/catch blocks — already ISOLATED | Agent 5-6 |
| F4 | SQLiteAdapter.ts has ESM/CJS bug (uses `require` in ESM context) | Agent 3-4 |
| F5 | No investment advice language found anywhere in engines or routes | Agent 7-8 |
| F6 | TradingView is frontend widget only, no server-side API integration | Agent 1-2 |
| F7 | UpstoxProvider is used in both broker chain AND by ProviderCoordinator (dual role) | Agent 5-6 |
| F8 | 6 broker files exist in src/services/brokers/ | Agent 5-6 |
| F9 | Circuit breakers present on all providers in ProviderCoordinator | Agent 1-2 |
| F10 | Financial merge uses Upstox primary, Screener enrichment, Finnhub/Yahoo fallback | Agent 1-2 |

---

## Risk Classification Matrix

Each change is evaluated across four risk dimensions:
- **FUNC** — Risk to existing functionality (breaking existing features)
- **DATA** — Risk to data integrity (corruption, loss, inconsistency)
- **UX** — Risk to user experience (downtime, degraded responses)
- **DEPLOY** — Risk to deployment (config changes, env vars, rollback difficulty)

Risk Levels: **LOW** · **MEDIUM** · **HIGH** · **CATASTROPHIC**

---

### Change #1: Create Compliance Boundary Engine
> New code, adds guardrails. No existing code modified.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **LOW** | Greenfield code. Gate logic wraps existing flows — existing paths remain intact. No modification to routes/engines. |
| DATA | **LOW** | Reads data, doesn't mutate. Guardrails are additive filters. |
| UX | **MEDIUM** | If guardrails block legitimate requests, users may see false rejections. Tuning required post-deploy. |
| DEPLOY | **LOW** | New module. Feature-flag gated. Easy rollback via flag disable. |

**OVERALL: LOW** — Safest type of change. Additive only. Evidence F5 confirms no existing advice language to conflict with.

---

### Change #2: Create Market Data Isolation Layer
> Refactors ProviderCoordinator. HIGH risk per evidence.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **HIGH** | ProviderCoordinator is the backbone of all data flow. Evidence F2: it imports all providers directly. Any abstraction layer inserted between callers and providers risks breaking the failover chain. Circuit breakers (F9) must be preserved exactly. |
| DATA | **HIGH** | Financial merge logic (F10) runs inside ProviderCoordinator. If isolation layer changes merge order (Upstox→Screener→Finnhub→Yahoo), data composition breaks silently. |
| UX | **HIGH** | Every ranking, prediction, and intelligence endpoint depends on this chain. Degradation here is user-visible across the entire platform. |
| DEPLOY | **HIGH** | Cannot be feature-flagged easily — this is core infrastructure. Requires full regression suite. Rollback means reverting the central data pipe. |

**OVERALL: HIGH** — Central nervous system of the app. Must be surgically precise. Evidence F2, F9, F10 all point to tight coupling.

---

### Change #3: Remove direct provider deps from ranking engines
> Engines already DON'T use providers (use EngineInputs).

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **LOW** | NO-OP. Evidence F1 confirms engines take EngineInputs with zero provider imports. Nothing to remove. |
| DATA | **LOW** | No data path changes. |
| UX | **LOW** | No user-facing change. |
| DEPLOY | **LOW** | No deployment needed. This is a documentation correction. |

**OVERALL: LOW (NO-OP)** — This change is already implemented. The proposal is acknowledging existing architecture. No code to write, no risk.

---

### Change #4: Screener as primary fundamental source
> Changes provider priority ordering.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **MEDIUM** | Evidence F10: Screener is already in the enrichment slot. Moving it to primary changes merge behavior. If Screener fails (no circuit breaker confirmed for Screener specifically), the fallback chain must still work. |
| DATA | **HIGH** | Priority flip changes which data "wins" on conflicts. Screener data may have different field names, null handling, or update frequency than Upstox. Silent data shape changes possible. |
| UX | **MEDIUM** | Users may see different fundamental values (different EPS, P/E calculations) after switch. Requires communication or gradual rollout. |
| DEPLOY | **MEDIUM** | Configuration change — low mechanical risk, but needs monitoring for data quality regression. |

**OVERALL: MEDIUM** — Configuration change, not code change. But data integrity risk is real. Must A/B compare Screener vs Upstox output across all tickers before flipping.

---

### Change #5: Migrate Yahoo to yfinance
> Replacement of one provider with another.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **HIGH** | Evidence F4: SQLiteAdapter has ESM/CJS bug (`require` in ESM). yfinance is Python-based library — likely requires a bridge process or REST wrapper. New network dependency, new failure modes. Yahoo is a direct HTTP provider. Migration is not a drop-in replacement. |
| DATA | **HIGH** | Yahoo and yfinance may return different data schemas, different field coverage, different update cadences. Backfill data consistency unknown. |
| UX | **HIGH** | If yfinance bridge has latency, all Yahoo-dependent endpoints slow down. Yahoo is in the failover chain (F10) — slow failover means degraded UX under any provider outage. |
| DEPLOY | **HIGH** | New dependency (Python runtime or bridge service). New environment config. yfinance rate limits differ from Yahoo API. Infrastructure change with unknown operational characteristics. |

**OVERALL: HIGH** — This is the riskiest single change. New language dependency (Python), new network topology, and the SQLiteAdapter bug (F4) must be fixed first as a prerequisite. Evidence suggests this is a major undertaking, not a simple swap.

---

### Change #6: Broker Integration Layer
> New code, isolates broker tokens.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **MEDIUM** | Evidence F7: UpstoxProvider is used in BOTH broker chain AND ProviderCoordinator. Any isolation layer must handle this dual role. 6 broker files exist (F8) — abstraction must cover all. |
| DATA | **HIGH** | Broker tokens are sensitive. If isolation layer mishandles token refresh or session management, trading connectivity breaks. Token leakage risk if abstraction is leaky. |
| UX | **MEDIUM** | Trading features go down if broker isolation fails. Non-trading features unaffected (Upstox data path separate). |
| DEPLOY | **MEDIUM** | New module. Token config migration required. Must test against all 6 broker implementations. |

**OVERALL: MEDIUM** — Additive abstraction, but Upstox dual-role (F7) is a trap. Must not break either path.

---

### Change #7: TradingView embed strategy
> No API, widget only.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **LOW** | NO-OP. Evidence F6 confirms TradingView is already a frontend widget with no server-side integration. Nothing to change. |
| DATA | **LOW** | No data path. Widget loads client-side from TradingView CDN. |
| UX | **LOW** | Already deployed. No change. |
| DEPLOY | **LOW** | No deployment. |

**OVERALL: LOW (NO-OP)** — Already exists as described. Proposal is documentation of current state.

---

### Change #8: Data Survivability Engine
> New code, tests outage scenarios.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **LOW** | Greenfield testing/observability code. Runs alongside, not inline. Does not modify data paths. |
| DATA | **LOW** | Read-only simulation. No production data mutation. |
| UX | **LOW** | Non-user-facing. Operations tool. |
| DEPLOY | **LOW** | Separate module. Can be deployed independently. No dependency from production paths. |

**OVERALL: LOW** — Pure additive observability. Safest type of change alongside #1.

---

### Change #9: Prediction Evidence Platform upgrade
> Enhances existing.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **MEDIUM** | "Enhances existing" — modifies code that ranking engines and intelligence routes depend on. Evidence F1: engines use EngineInputs. If interface changes, all 8 engines need update. |
| DATA | **MEDIUM** | Evidence platform likely stores prediction outputs. Schema migration risk if storage format changes. |
| UX | **MEDIUM** | Users see prediction changes. Backward compatibility of old predictions during migration unclear. |
| DEPLOY | **MEDIUM** | Depends on scope of "upgrade." If it's additive fields, LOW. If it restructures, MEDIUM-HIGH. |

**OVERALL: MEDIUM** — "Upgrade" is vague. Risk scales with scope. Minimum: keep EngineInputs interface backward compatible to avoid cascading engine changes.

---

### Change #10: Architecture Audit & Runtime Enforcement
> New code, detects violations.

| Dimension | Risk | Rationale |
|-----------|------|-----------|
| FUNC | **MEDIUM** | Runtime enforcement can block deployments or fail CI if rules are too strict. False positives block legitimate work. |
| DATA | **LOW** | Static analysis. No production data touched. |
| UX | **LOW** | Developer-facing only. Not user-facing. |
| DEPLOY | **LOW** | CI-integrated. Separate from production deploy. |

**OVERALL: LOW** — Additive developer tooling. Risk is only to developer velocity if enforcement is overly aggressive (false positives). Mitigate with warning-only mode initially.

---

## Risk Heatmap

```
                        FUNC    DATA     UX    DEPLOY   OVERALL
Change #1  Compliance   LOW     LOW     MED    LOW      LOW
Change #2  Mkt Data Iso HIGH    HIGH    HIGH   HIGH     HIGH
Change #3  Rank De-Coup LOW     LOW     LOW    LOW      LOW (NO-OP)
Change #4  Screener Pri MED     HIGH    MED    MED      MED
Change #5  Yahoo→yfin   HIGH    HIGH    HIGH   HIGH     HIGH
Change #6  Broker Iso   MED     HIGH    MED    MED      MED
Change #7  TradingView  LOW     LOW     LOW    LOW      LOW (NO-OP)
Change #8  SurvivabilityLOW     LOW     LOW    LOW      LOW
Change #9  Pred Platform MED    MED     MED    MED      MED
Change #10 Arch Audit   MED     LOW     LOW    LOW      LOW
```

## Critical Findings

### NO-OP Changes (No Work Required)
- **#3 (Ranking Engine De-Coupling):** Already implemented. Engines use EngineInputs, zero provider imports.
- **#7 (TradingView Embed):** Already a frontend widget. No server integration exists or needed.

### Highest Risk Changes (Require Deep Planning)
- **#2 (Market Data Isolation):** Touches the central data pipe. Every endpoint depends on it.
- **#5 (Yahoo→yfinance):** New language dependency. SQLiteAdapter bug is prerequisite fix. Not a drop-in replacement.

### Prerequisite Chain
```
Fix SQLiteAdapter.ts (F4)
    ↓
├── Unblocks Change #5 (yfinance depends on stable DB)
└── Required before any DB-dependent testing
```

### Upstox Dual-Role Trap (Changes #2 + #6)
Evidence F7: UpstoxProvider serves both ProviderCoordinator (data) AND broker chain (trading). Any isolation layer (#2 data, #6 broker) MUST account for this split personality or risk breaking one path while fixing the other.

---

## Recommendations

1. **Group NO-OPs** (#3, #7): Close these proposals. Document current state. Zero work.
2. **Start with LOW risk** (#1, #8, #10): Build momentum with safe additive changes.
3. **Fix prerequisites first** (#5 prerequisite: fix SQLiteAdapter.ts ESM/CJS bug).
4. **#2 and #6 coordinate**: Both touch UpstoxProvider. Plan together, not in isolation.
5. **#4 requires A/B testing**: Before flipping Screener to primary, run parallel comparison against Upstox for all tickers over 2 weeks.
6. **#5 is a project, not a task**: yfinance migration needs its own discovery phase. Bridge architecture, schema mapping, rate limit analysis all unknown.