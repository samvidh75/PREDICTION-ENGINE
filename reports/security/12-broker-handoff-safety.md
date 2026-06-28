# Broker Handoff Safety — Part 12

## Current Implementation

- **BrokerRegistry** (`src/commercial/BrokerRegistry.ts`): Singleton registry with only Upstox registered.
- **BrokerHandoffService** (`src/commercial/BrokerHandoffService.ts`): Generates handoff payload with SEBI disclaimer, research summary, and broker URL.
- **BrokerHandoffModal** (`src/components/BrokerHandoffModal.tsx`): Compliance modal with 4-step UX (review → disclaimer → acknowledge → redirect).
- **Wired in:** `StockPage.tsx` with "Continue with broker" button.

## Safety Checks

| Concern | Status | Detail |
|---------|--------|--------|
| Fake broker entries | ✅ None | Only Upstox (real, connected broker) |
| Credential collection | ✅ None | Handoff is URL-only deep link — no credential fields |
| SEBI compliance | ✅ Present | Clear disclaimer: "not a SEBI-registered investment advisor" |
| Button copy | ✅ Safe | "Continue with broker" (not "Invest" / "Trade") |
| Research-focused | ✅ Safe | "Research and informational purposes only" |
| No order placement | ✅ Yes | StockStory India does NOT place trades |
| No transaction fees | ✅ Yes | No fee collection in code |
| No SEBI registration claim | ✅ Yes | Explicitly disclaims SEBI registration for brokerage |

## Recommendations

1. ✅ Add broker handoff server-side audit trail (log when handoff URL is generated) — **future**
2. Add rate limiting to handoff requests (prevent abuse)
3. Verify broker URLs are HTTPS-only (Upstox URLs should be)
4. Consider adding referrer tracking for analytics
