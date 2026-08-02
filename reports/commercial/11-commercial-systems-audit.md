# Phase 11 — Commercial Systems Audit

## System-by-System Audit

| System | Existing files | Current capability | Risk | Required action |
|--------|---------------|-------------------|------|-----------------|
| **Pricing page** | None | No pricing page, components, or routes | Missing product tier display | Create pages + components |
| **Subscription models** | `src/db/migrations/010_create_retention_tables.sql` | DB schema exists with 4 plans (free/investor/pro/professional) but no runtime code uses it | Untested schema; plans don't match current product tiers | Align plans to Free/Research Plus/Research Pro; build runtime entitlement |
| **Entitlement checks** | None | No feature gating by subscription | All features free; no monetization path | Build EntitlementService |
| **Payment providers** | None in package.json | No payment integration | Can't collect payments | Create provider strategy + registry; stub flows |
| **Broker handoff** | `src/services/brokers/` | Upstox OAuth read-only portfolio; no order placement | False sense of broker readiness | Build BrokerRegistry + BrokerHandoffService; harden UX |
| **Invest/review flow** | StockPage.tsx line 183 | Placeholder "Invest via broker" button | Not compliant | Build review sheet + checklist flow |
| **Compliance disclaimers** | `src/compliance/` | SEBI banner on all pages; forbidden copy audit | Basic coverage exists | Add research-only notice, broker disclosure, scenario caveats |
| **Methodology page** | None | No dedicated methodology route | Users can't understand scoring | Create Methodology.tsx page |
| **Recommendation language** | `src/lib/compliance/` | Forbidden copy audit exists; scanner policy in place | Good baseline | Verify no forbidden language in new code |
| **Broker logos/copy** | None | No broker logos or marketing copy | Clean | Keep clean; only show when real |
| **Feature gates** | `src/config/feature-flags.ts` | Env-var gated features (not subscription) | No user-specific gating | Build FeatureGate + useEntitlements |
| **User plan state** | None | No runtime plan state | Can't check user entitlements | Build EntitlementStore + plan state |
| **Tests** | `src/__tests__/part-ar-forbidden-copy-audit.test.tsx` | Forbidden copy audit test exists | No commercial/payment/broker tests | Add full test suite |

## Summary

The codebase has:
- ✅ Good compliance foundation (SEBI banners, forbidden copy audit)
- ⚠️ Subscription DB schema exists but is disconnected from runtime
- ❌ No pricing page, no payment integration, no feature gating, no broker handoff UX

**Action priority:** Build entitlement system → Pricing page → Brokers → Compliance hardening
