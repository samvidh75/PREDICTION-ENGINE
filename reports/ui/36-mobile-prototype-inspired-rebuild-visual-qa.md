# Mobile Prototype-Inspired Rebuild Visual QA

Date: 2026-06-18

## QA Checklist

- Mobile shell uses the SSI identity, compact search, notification/settings affordances, and five-tab bottom navigation.
- Main pages use fixed-format app cards and horizontal rails instead of large marketing sections.
- Cards, buttons, rails, and score rings have stable dimensions and avoid text overlap.
- Portfolio content is explicitly user-entered/practice research state.
- Scanner cards show available leaderboard data only; missing values remain labelled.
- Trust Centre masks internal provider identifiers and keeps provider health source-backed.
- Company detail has a redesigned app wrapper, horizon controls, and source audit context.
- No Pro/paywall/trading CTAs are visible.

## Automated Coverage

The upgraded `npm run audit:responsive-ui` script captures mobile and desktop screenshots for:

- Landing
- Dashboard
- Rankings / Research Scanner
- Trust Centre
- Watchlist
- Portfolio

It also checks responsive overflow, nav/floating action overlap, raw data tokens, secret names, forbidden trading/pro copy, and core app-shell primitives.

## Manual Notes

The supplied screenshots were treated as interaction and composition inspiration, not data inspiration. Prototype-only elements such as AI picks, Strong Buy labels, Buy Stock CTAs, Pro plans, fake holdings, and fake market values were intentionally excluded.

