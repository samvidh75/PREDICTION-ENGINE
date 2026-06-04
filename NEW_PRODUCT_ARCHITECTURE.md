# New Product Architecture

This document defines the streamlined navigation flow and router design for the redesigned StockStory India application.

## Master User Flow

```
   [ About / Homepage ] (/)
            │
            ▼
     [ Authentication ] (/login  or  /signup)
            │
            ▼
      [ Dashboard ] (/dashboard)  <───> [ Search Hub ]
            │
      ┌─────┼─────────────────────────┐
      ▼     ▼                         ▼
 [Discovery] (/discovery)    [Company Intelligence] (/stock/:symbol)    [Watchlist & Portfolio]
                                      │
                                      ▼
                             [Watchlist / Alerts]
```

## Route Definitions & URL Structure

We will transition the routing system from query parameters to a clean, declarative layout structure:

### 1. Public Routes
* `/` (or `page=about`): **About Page**. The primary landing page explaining what StockStory is, why it exists, and how it works.
* `/login` (or `page=login`): **Login Page**. A minimal email/password credentials box with Google Sign-in.
* `/signup` (or `page=signup`): **Signup Page**. Quick user registration without preference question guides.

### 2. Private (Authenticated) Routes
* `/dashboard` (or `page=dashboard`): **Market Terminal**. Answers *"What deserves my attention today?"* with consolidated market signals.
* `/discovery` (or `page=discovery`): **Opportunity Finder**. Displays trending, quality, ownership, and valuation grids.
* `/stock/:id` (or `page=stock&id=...`): **Company Intelligence Page**. The flagship analysis dashboard for a single equity.
* `/portfolio` (or `page=portfolio`): **Portfolio Hub**. Track capital distribution, margin structure, and weights.
* `/watchlist` (or `page=watchlist`): **Watchlist**. Live metrics and updates for pinned assets.
* `/alerts` (or `page=alerts`): **Alert Centre**. Configures thresholds and displays system logs.
* `/settings` (or `page=settings`): **User Settings**. Manage account credentials and base preference parameters.
