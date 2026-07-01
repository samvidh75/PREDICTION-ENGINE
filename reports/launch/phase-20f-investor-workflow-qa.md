# Phase 20F — Investor Workflow QA

**Baseline commit:** `ef9623f4`
**Date:** 2026-07-01

---

## Step | Route/component | Expected user value | Data source | AI behavior | Empty state | Risk

### 1. Discover (HomePage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Browse featured stocks, market overview, discover new ideas |
| **Data source** | Deterministic engine scores cached in snapshots |
| **AI behavior** | No AI on HomePage |
| **Empty state** | Graceful fallback when universe empty |
| **Risk** | Low — static discovery content |

### 2. Scanner (ScannerPage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Filter/sort stocks by preset criteria, select stock → AI explanation |
| **Data source** | Precomputed scanner snapshots (Phase 20B). No per-row provider calls. |
| **AI behavior** | `ResearchAiExplanationPanel` renders deterministic context after user selects a stock. No auto-load on route visit. |
| **Empty state** | ResearchDataState safe states if scanner data missing |
| **Risk** | Medium — must not call providers per row; AI must not mutate order |

### 3. Rankings / RelativeStrength (RelativeStrength.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | View ranked stocks by relative strength, select → AI explanation |
| **Data source** | Precomputed ranking snapshots (price-sorted) |
| **AI behavior** | `ResearchAiExplanationPanel` at bottom of rankings. Explains selected stock only. |
| **Empty state** | Graceful fallback when rankings empty |
| **Risk** | Medium — rankings order must not be mutated by AI/refresh |

### 4. Stock Detail (StockPage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Company overview, Healthometer, financials, research context, broker handoff |
| **Data source** | Cached EOD data + precomputed Healthometer snapshots |
| **AI behavior** | Two `ResearchAiExplanationPanel` instances (Healthometer + research context). Deterministic evidence only. |
| **Empty state** | ResearchDataState partial/empty; no fake prices |
| **Risk** | High — partial data must not cause hallucination; broker handoff must be review-first |

### 5. Compare (ComparePage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Side-by-side stock comparison |
| **Data source** | Cached EOD data for selected symbols |
| **AI behavior** | `ResearchAiExplanationPanel` renders comparison context. Does not decide for user. |
| **Empty state** | Graceful handling when comparison data missing |
| **Risk** | Medium — must not imply recommendation |

### 6. Watchlist (WatchlistPage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Track watched stocks, view thesis changes, research alerts |
| **Data source** | Watchlist thesis snapshots (Phase 20B). Research alerts from precomputed events. |
| **AI behavior** | `ResearchAiExplanationPanel` uses watchlist AI context. No fake thesis history. |
| **Empty state** | Empty watchlist CTA; proper loading states |
| **Risk** | Medium — AI must not create fake alerts/thesis history |

### 7. Alerts / Important Changes
| Field | Assessment |
|---|---|
| **Expected value** | Research alerts panel showing significant changes |
| **Data source** | Precomputed event evidence snapshots (news counts, filings, corporate actions) |
| **AI behavior** | Alerts panel explains evidences. Deterministic only. |
| **Empty state** | "No recent significant changes" — no fake alerts |
| **Risk** | Low — precomputed, deterministic |

### 8. Portfolio / Thesis Tracking (PortfolioPage.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Manual portfolio entry, thesis tracking, review important changes |
| **Data source** | User-entered holdings + precomputed thesis snapshots |
| **AI behavior** | `ResearchAiExplanationPanel` with portfolio context. No broker sync/P&L. |
| **Empty state** | Full empty state with CTA buttons + "Not a broker account" disclaimer |
| **Risk** | High — must not imply live P&L, broker integration, or fake holdings |

### 9. Broker Handoff (BrokerHandoffModal.tsx)
| Field | Assessment |
|---|---|
| **Expected value** | Review research → open broker in new tab. NOT execution. |
| **Data source** | Broker registry (static config) |
| **AI behavior** | No AI in broker handoff |
| **Empty state** | "Broker not available" error message |
| **Risk** | Critical — must be review-first only, no execution, no fake broker state |

---

## Summary

| # | Route | AI | Empty State | Provider Calls | Risk |
|---|---|---|---|---|---|
| 1 | Discover | None | Graceful | None | Low |
| 2 | Scanner | Explanation on select | ResearchDataState | Precomputed snapshots | Medium |
| 3 | Rankings | Explanation at bottom | Graceful | Precomputed snapshots | Medium |
| 4 | Stock Detail | 2x Explanation panels | ResearchDataState | Cached EOD | High |
| 5 | Compare | Explanation | Graceful | Cached EOD | Medium |
| 6 | Watchlist | Explanation | Empty CTA | Precomputed snapshots | Medium |
| 7 | Alerts | Deterministic only | "No changes" | Precomputed | Low |
| 8 | Portfolio | Explanation | Full CTA + disclaimer | Precomputed snapshots | High |
| 9 | Broker Handoff | None | Error state | None | Critical |

All routes verified: no provider calls per row, no fake data, no public internal wording, AI only on explicit context.
