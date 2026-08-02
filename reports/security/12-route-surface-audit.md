# Route Surface Audit — Part 12

## Frontend Routes

| Route | Component | Public/Internal | Auth Required | Risk | Action |
|-------|-----------|----------------|---------------|------|--------|
| `/` | HomePage | Public product | No | Low | Already safe |
| `/scanner` | ScannerPage | Public product | No | Low | Already safe |
| `/watchlist` | WatchlistPage | Public product | No | Low | Add loading state (no crash if empty) |
| `/compare` | PlaceholderPage("Compare") | Public product | No | Low | Placeholder safe |
| `/pricing` | PricingPage | Public product | No | Low | Sanitize copy |
| `/stock/:symbol/*` | StockPage | Public product | No | Low | Sanitize error states |
| `*` → `/` | Redirect | — | No | Low | Safe redirect |

## Backend Routes

| Route | Method | Type | Auth Required | Risk | Action |
|-------|--------|------|---------------|------|--------|
| `/healthz` | GET | Health | No | Low | Already safe — returns `{ok: true}` |
| `/readyz` | GET | Health | No | Low | Already safe — returns structured status |
| `/api/stock` | GET | Public product | No | Low | Already safe |
| `/api/search` | GET | Public product | No | Low | Already safe |
| `/api/intelligence/financial` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/technical` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/risk` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/earnings` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/events` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/valuation` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/news` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/sector` | GET | Public product | No | Medium | Sanitize errors |
| `/api/intelligence/rag` | GET | Public product | No | Medium | Bounded context, sanitize errors |
| `/api/intelligence/stock` | GET | Public product | No | Medium | Large response — paginate if needed |
| `/api/research-profile` | GET/PUT | User product | No (local) | Low | No PII stored |
| `/api/alerts` | GET/POST | User product | No (local) | Low | Store only symbol + preferences |
| `/api/alerts/:id` | PUT | User product | No (local) | Low | Safe |
| `/api/digest` | GET | User product | No (local) | Low | Safe |
| `/api/digest/weekly` | GET | User product | No (local) | Low | Safe |
| `/api/scanner-presets` | GET/POST | User product | No (local) | Low | Safe |
| `/api/scanner-presets/:id` | PUT/DELETE | User product | No (local) | Low | Safe |
| `/api/thesis-history/:symbol` | GET | User product | No (local) | Low | Safe |
| `/api/thesis-history` | POST | User product | No (local) | Low | Safe |
| `/api/actions` | POST | User product | No (local) | Low | Safe |
| `/api/actions/recent` | GET | User product | No (local) | Low | Safe |
| `/api/research-suggestions` | GET | User product | No (local) | Low | Safe |
| `/api/watchlist-intelligence` | GET | User product | No (local) | Low | Safe |
| `/api/notification-snapshot` | GET | User product | No (local) | Low | Safe |
| `/api/notifications/acknowledge-all` | POST | User product | No (local) | Low | Safe |

## Compliance Status

- ✅ **No internal/admin routes** linked in normal navigation
- ✅ **No job/diagnostic routes** publicly accessible
- ✅ **No payment webhook routes** exposed (payments disabled)
- ✅ **No broker credential collection** paths exist
- ✅ **Public routes return structured JSON** — no raw stack traces observed
- ✅ **No backend/provider/API/cache/job wording** in normal user-facing UI (verified in Phase 23 safety greps)

## Actions Required

1. Add global error handler to sanitize unexpected errors in `/api/intelligence/*` routes
2. Ensure all routes have try/catch with sanitized responses
3. Verify rate limiting (Phase 7) on search and intelligence routes
