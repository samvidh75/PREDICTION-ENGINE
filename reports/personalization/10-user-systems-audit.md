# Part 10 — Pre-existing User/Personal Systems Audit

## Audit Date: 2026-06-28
## Commitment: f07b49ad

---

## 1. Auth System
| Component | Status | File |
|-----------|--------|------|
| Firebase Bearer Token Provider | ✅ Production | `src/services/auth/authenticatedFetch.ts` |
| Auth Session Store | ✅ Production | `src/services/auth/sessionStore.ts` |
| `registerTokenProvider` | ✅ Production | authenticatedFetch.ts |
| `authenticatedFetch` (all endpoints) | ✅ Production | authenticatedFetch.ts |
| `authenticatedFetchOnlyIfSignedIn` (graceful signed-out) | ✅ Production | authenticatedFetch.ts |
| `authenticatedPost` | ✅ Production | authenticatedFetch.ts |

**Verdict**: Firebase auth is production-ready. No auth work needed in Part 10.

## 2. User Profile / Preferences
| Component | Status | Location |
|-----------|--------|----------|
| `user_profiles` table | ✅ Referenced in FK constraints | migrations 003, 010 |
| `dashboard_preferences` JSONB column | ✅ Schema only | `investor_state` |
| `UserResearchProfile` type | ❌ Not found | Needs creation |
| Research preferences (sector, horizon, risk) | ❌ Not found | Needs creation |
| Experience level tracking | ❌ Not found | Needs creation |
| Onboarding preferences | ❌ Not found | Needs creation |
| `PersonalisationEngine` | ✅ Basic (sector suggestions only) | `src/services/personalization/` |

**Verdict**: Profile table exists but has no research-specific preference fields. Basic personalisation engine exists.

## 3. Watchlist System (3 layers found)
### Layer 1: Frontend Store
| Component | Status | File |
|-----------|--------|------|
| Multi-watchlist localStorage | ✅ Production | `src/services/portfolio/watchlistStore.ts` |
| Watchlist CRUD (create, rename, archive, favourite) | ✅ Production | watchlistStore.ts |
| Add/Remove tickers | ✅ Production | watchlistStore.ts |
| Reorder watchlists | ✅ Production | watchlistStore.ts |
| Remote sync to `/api/watchlists` | ✅ Production | watchlistStore.ts |
| Remote sync to `/api/investor-state` | ✅ Production | watchlistStore.ts |
| Watchlist change events | ✅ Production | watchlistStore.ts |
| Legacy `getWatchlist` / `getWatchlistTickers` / `isTickerInWatchlist` | ✅ Production | watchlistStore.ts |

### Layer 2: Smart Watchlists
| Component | Status | File |
|-----------|--------|------|
| SmartWatchlistEngine | ✅ Production | `src/services/portfolio/SmartWatchlistEngine.ts` |
| High Health, Improving, Momentum, Sector Leaders, Turnarounds | ✅ 5 presets | SmartWatchlistEngine.ts |

### Layer 3: Research Thesis Tracking
| Component | Status | File |
|-----------|--------|------|
| `trackThesis()` | ✅ Production | `src/research/watchlist/watchlistEngine.ts` |
| Thesis status: Strengthening, Stable, Weakening, Needs review, Tracking begins now | ✅ | watchlistEngine.ts |
| Intelligence WatchlistEngine (rules + alerts) | ✅ Production | `src/stockstory/intelligence/watchlist/WatchlistEngine.ts` |

### UI
| Route | Component | Status |
|-------|-----------|--------|
| `/watchlist` | `PlaceholderPage` | ❌ Shell only — needs real UI |

**Verdict**: Watchlist backend is robust. Frontend route is a placeholder.

## 4. Alert System
### Alert Generation
| Component | Status | File |
|-----------|--------|------|
| `generateAlerts()` | ✅ Production | `src/research/alerts/alertsEngine.ts` |
| Alert types: thesis_change, risk_change, watchlist_review, price_move, peer_change, event | ✅ 6 types | alertsEngine.ts |
| Alert deduplication | ❌ Not found | Needs `AlertDeduper` |
| Alert storage/persistence | ❌ In-memory only | Needs DB write |
| Scheduled alert evaluation job | ✅ Intelligence pipeline only | `src/stockstory/jobs/GenerateWatchlistAlertsJob.ts` |

### DB Schema
| Table | Status | File |
|-------|--------|------|
| `user_alerts` (normalized) | ✅ Schema only | `010_create_retention_tables.sql` |
| Alert types: health_change, prediction_upgrade, prediction_downgrade, confidence_change, new_opportunity, price_target_update | ✅ 6 types | 010 migration |
| Read/unread tracking | ✅ `is_read` column | 010 migration |

### Intelligence Layer
| Component | Status | File |
|-----------|--------|------|
| Watchlist audit CLI | ✅ Production | `scripts/intelligence/audit-watchlist.ts` |
| Alert rules (pledge, profit decline, earnings proximity, SMA cross) | ✅ Production | Intelligence WatchlistEngine |
| Batch alert summary + report | ✅ Production | audit-watchlist.ts |
| Acknowledge/unacknowledge tracking | ✅ Production | audit-watchlist Alert type |

### UI
| Route | Component | Status |
|-------|-----------|--------|
| `/alerts` | Not routed | ❌ Needs notification center |

**Verdict**: Alert generation exists but is in-memory only. DB schema exists but not wired. No notification center UI.

## 5. Portfolio/Thesis Tracker
| Component | Status | File |
|-----------|--------|------|
| `monitorPortfolio()` | ✅ Production | `src/research/portfolio/portfolioEngine.ts` |
| InvestReviewContextView generation | ✅ Production | portfolioEngine.ts |
| Review priority sorting | ✅ Production | portfolioEngine.ts |
| Portfolio summary generation | ✅ Production | portfolioEngine.ts |
| NoteEngine | ✅ Production | `src/services/portfolio/NoteEngine.ts` |
| ShareEngine | ✅ Production | `src/services/portfolio/ShareEngine.ts` |
| InvestorMemoryEngine | ✅ Production | `src/services/portfolio/InvestorMemoryEngine.ts` |
| ExportEngine | ✅ Production | `src/services/portfolio/ExportEngine.ts` |

### UI
| Route | Component | Status |
|-------|-----------|--------|
| `/portfolio` | Not routed | ❌ Needs thesis monitor |

**Verdict**: Backend portfolio monitoring exists. No UI route.

## 6. Daily Digest / Weekly Review
| Component | Status | File |
|-----------|--------|------|
| `daily_digests` table | ✅ Schema only | `010_create_retention_tables.sql` |
| Email tracking (`email_sent`) | ✅ Schema only | 010 migration |
| Digest generation logic | ❌ Not found | Needs implementation |
| Cron/scheduled job | ❌ Not found | Needs implementation |

## 7. Scanner Presets
| Component | Status | File |
|-----------|--------|------|
| SCANNER_PRESETS | ✅ Hardcoded in scanner engine | `src/research/scanner/scannerEngine.ts` |
| Personal scanner presets | ❌ Not found | Needs user-saved presets |

## 8. Scenario Integration
| Component | Status | File |
|-----------|--------|------|
| ScenarioOrchestrator (Part 9) | ✅ Production | `src/stockstory/intelligence/scenario/` |
| Personal research integration | ❌ Not found | Needs saved-company scenario runner |

## 9. Research Memory
| Component | Status | File |
|-----------|--------|------|
| MemoryEngine (research artifacts) | ✅ Production | `src/stockstory/intelligence/memory/MemoryEngine.ts` |
| InvestorMemoryEngine (user actions) | ✅ Production | `src/services/portfolio/InvestorMemoryEngine.ts` |
| CopilotMemory | ✅ Production | `src/services/copilot/CopilotMemory.ts` |
| Research history timeline UI | ❌ Not found | Needs implementation |

## 10. Subscriptions / Monetization
| Component | Status | File |
|-----------|--------|------|
| `subscription_plans` table (4 tiers) | ✅ Schema only | `010_create_retention_tables.sql` |
| `user_subscriptions` table | ✅ Schema only | `010_create_retention_tables.sql` |
| Feature gating by tier | ❌ Not found | Needs implementation |

## 11. Privacy / Data Minimization
| Component | Status |
|-----------|--------|
| No PII in watchlist storage | ✅ Ticker-only |
| No portfolio holdings (shares/P&L) | ✅ By design |
| CompliancePolicy (no advice) | ✅ Production |
| Local-first with optional remote | ✅ watchlistStore.ts |
| Data deletion/export | ❌ Not found |

## Summary: What Part 10 Must Build vs. What Exists

| Feature | Pre-existing | Part 10 Work |
|---------|-------------|--------------|
| Auth | ✅ Firebase auth | None |
| User Research Profile + Prefs | ❌ | Create UserResearchProfile type, preference store, preferences UI |
| Watchlist Backend | ✅ 3-layer system | Wire UI, add thesis context to each ticker |
| Watchlist Frontend | ❌ Placeholder | Build full watchlist research workspace |
| Alert Generation | ✅ In-memory | Add persistence, dedup, notification center |
| Alert UI | ❌ Not routed | Build notification center |
| Portfolio/Thesis Monitor Backend | ✅ Production | Minimal — wire to thesis tracking |
| Portfolio/Thesis UI | ❌ Not routed | Build thesis monitor page |
| Daily Digest | ❌ Schema only | Build digest generator + scheduled job |
| Personal Scanner Presets | ❌ | Build preset save/load |
| Scenario Integration | ❌ | Build saved-company scenario runner |
| Personal API Routes | ❌ Some exist (/api/watchlists, /api/investor-state) | Add /api/alerts, /api/digest, /api/preferences |
| Dashboard UI | ❌ Not routed | Build personal research dashboard |
| Onboarding | ❌ | Integrate preference collection |
| Privacy Audit | ❌ | Conduct full audit |
| Tests | ❌ None personal-specific | Full test suite |

**Key insight**: Much more pre-existing infrastructure than the Phase 1 baseline suggested. Part 10 is primarily about wiring existing systems together with UI, persistence, and scheduled jobs — not building from scratch.
