# SQLite Retention paths audit inventory

| File | Table / State | Private? | Current Storage | Required Storage | Action |
|------|---------------|----------|-----------------|------------------|--------|
| [WatchlistService.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/retention/WatchlistService.ts) | `user_watchlists` | Yes | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
| [UserAlertEngine.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/retention/UserAlertEngine.ts) | `user_alerts` | Yes | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
| [DailyDigestGenerator.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/retention/DailyDigestGenerator.ts) | `daily_digests` | Yes | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
| [SharingService.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/retention/SharingService.ts) | `shared_predictions`, `referrals` | Yes | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
| [SubscriptionService.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/services/retention/SubscriptionService.ts) | `user_subscriptions`, `subscription_plans` | Yes (subs) / No (plans) | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
| [AttentionEngine.ts](file:///Users/samvidhmehta/Desktop/PREDICTION-ENGINE/src/intelligence/AttentionEngine.ts) | `prediction_registry`, watchlists, portfolio | Yes | `dbAdapter` (Postgres / SQLite) | `dbAdapter` | Converted to async using `dbAdapter.query()` with parameterized placeholders. |
