# Payment and Billing Safety — Part 12

## Current State

| Concern | Status | Detail |
|---------|--------|--------|
| Payment provider | ⚠️ Exists but disabled | Stripe/Razorpay code in `src/commercial/paymentProvider.ts` |
| `PAYMENTS_ENABLED` | ✅ `false` | Default — no payment endpoints are active |
| Active subscriptions | ✅ None | No subscription records in DB |
| Stripe secrets configured | ❌ Not configured | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` not in env |
| Pricing page | ✅ UI-only | `/pricing` shows plans, no checkout button wired |
| Checkout API | ✅ Gated | `src/commercial/api/checkoutApi.ts` exists but not called |
| Entitlements | ✅ In-memory only | `EntitlementService.ts` uses default free tier |
| Usage limits | ✅ Enforced | `UsageLimits.ts` tracks API calls per hour, searches per day |

## Safety Verification

- ❌ No Stripe/Razorpay secrets deployed → no payment processing possible
- ❌ No active subscriptions → no recurring charges
- ❌ No checkout buttons active in UI
- ✅ Pricing page is informational only
- ✅ Usage limits prevent abuse of free tier

## Recommendations

1. Keep `PAYMENTS_ENABLED=false` until payment provider is fully integrated and tested
2. Never commit Stripe/Razorpay secrets to `.env.prod` — use Vercel dashboard
3. Add webhook signature verification before enabling payment webhooks
4. Add idempotency keys to checkout creation
