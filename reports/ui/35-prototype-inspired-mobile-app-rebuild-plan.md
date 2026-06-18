# Prototype-Inspired Mobile App Rebuild Plan

Date: 2026-06-18

## Objective

Rebuild the authenticated StockStory India experience into a refined mobile-first SSI research app inspired by the supplied prototype screenshots, while preserving the product's evidence-first rule set:

- No fabricated scores, calls, holdings, quotes, or recommendations.
- No Buy/Sell/Trade CTA language.
- No fake Pro, paywall, ads, or promotional overlays.
- Missing data remains labelled.
- Provider or env-style identifiers are not exposed to users.

## App Shell

The rebuild uses a compact SSI mobile shell:

- Top action bar with SSI identity, search, notifications, and settings affordances.
- Five-tab bottom navigation: Home, Watching, Research, Portfolio, Account.
- Floating help button routed to Trust Centre.
- Safe-area bottom spacing so navigation and floating actions do not cover content.
- Shared app primitives for cards, rails, score rings, source pills, sheets, modals, audit cards, and sticky action docks.

## Route Plan

- Home / Dashboard: search-first research cockpit, verified coverage metrics, recent signal changes, pinned research, recent research rail, and coverage snapshots.
- Watchlist: pinned-stock workflow with search card, list selector, mobile cards, note editing, and empty state.
- Research Scanner / Rankings: scanner-style header, evidence hero, metric cards, mobile score-ring cards, existing desktop table retained.
- Company Detail: mobile page header, workspace bar, horizon selector, source audit, existing evidence sections under a redesigned app wrapper.
- Portfolio: practice/user-entered holdings summary, source audit, mobile holding cards, manual entry/import flows with neutral cost-basis language.
- Trust Centre: source-health app shell, evidence hero, masked provider labels, performance audit, coverage/freshness/status sections.
- About: retained evidence mission with premium app primitives and no advisory claims.

## Guardrails

The responsive audit is expanded to check:

- Horizontal overflow.
- Bottom navigation and floating help overlap.
- Raw undefined/null/NaN/Infinity text.
- Secret/env-style provider names.
- Forbidden trading/prototype monetization copy.
- SSI app shell presence.
- Scanner, portfolio, modal, and mobile navigation structure.

