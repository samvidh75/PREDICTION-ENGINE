# Premium Visual Acceptance Criteria

Non-negotiable rules for every route in the product. These rules are the
ground truth for "premium, planned, full-width, Apple-level restraint,
OpenAI-level calm, finance-grade clarity".

## Desktop rules (>= 1024px)

- **Full viewport width.** Content must use the full available width.
  Public pages render directly via `PremiumPage` (full viewport). Auth
  pages render through `IntelligenceOSShell` which has a 56px left rail
  (so on 1440px viewport the content area is 1384px; on 1920px it is
  1864px).
- **No narrow column.** No `max-w-md`, `max-w-2xl`, `max-w-3xl`,
  `max-w-4xl` wrappers around the main page content. Reading-width
  discipline applies only inside prose blocks, never to the page
  composition itself.
- **No mobile-shell-on-desktop.** The `IntelligenceOSShell` mobile
  bottom dock is gated by `md:hidden` and must never appear on desktop.
  The same applies to any mobile-only floating action button.
- **No card wall.** Avoid `lg:grid-cols-3` / `lg:grid-cols-4` of
  equally-sized cards stacked across the page. A maximum of 2 columns is
  the upper bound; prefer a single rich row or a left/right
  composition.
- **Calm colour palette.** Background `#0B0F14` / `#0D1117`. Borders
  `white/[0.04]`–`white/[0.08]`. Body text `#E6EDF3`. Secondary text
  `#8B949E`. One primary accent (`#2962FF`) used sparingly.
- **Single primary accent.** No gradient brand walls, no rainbow pills,
  no multi-colour chip rails.
- **Typography restraint.** Display weight is `font-semibold` (not
  `font-bold`/`font-black`/`font-extrabold`). Body is `text-sm` /
  `text-[11px]`. Letter-spacing is `-tracking-tight` for display,
  `tracking-wider` for uppercase eyebrows only. No
  `tracking-[0.08em]` hero brand text.
- **No backdrop-filter glass walls.** Inline `backdrop-filter: blur(...)`
  for nav bars is banned; nav must be opaque or solid-bg with a 1px
  border.

## Mobile rules (< 1024px)

- **Bottom dock present.** The mobile dock nav is shown on
  `< md` viewports, hidden on desktop.
- **Compact header.** Top header collapses to a single row: brand +
  command button (or single primary CTA). No multi-row nav.
- **Readable text.** Body min `text-sm`. Display min `text-3xl`.
- **Single-column composition.** No two-column desktop layouts bleed
  through. Stack every section.
- **Pill rails wrap or scroll.** A row of pills may wrap, but never
  push other content off-screen horizontally.

## General rules (every viewport)

- **No raw undefined / null / NaN.** All rendered fields go through a
  formatter that yields `"—"` or `0` for missing values.
- **No fake/sample data.** Empty states render an explicit
  `DataUnavailableState` with a calm copy message. No placeholder
  names, no fictional scores, no synthetic watchlists.
- **No advisory language.** No "Try Pro", "Unlock Pro", "Strong Buy",
  "Buy", "Sell", "Top picks", "AI picks", "Hot now", "Must-have". Use
  neutral verbs: explore, inspect, track, audit.
- **Honest data labels.** Status values are one of: `fresh`,
  `stale`, `degraded`, `unavailable`, `archived`, `source-backed`.
  Confidence labels are one of: `high`, `medium`, `low`. Anything else
  is a bug.
- **Monospace for symbols, code, numeric IDs.** UI text uses
  `font-sans`. Symbols (e.g. `RELIANCE`) and numeric IDs (e.g.
  `v2-factors-2026-06-19`) use `font-mono`.

## Per-route intent

| Route | One-line intent |
| --- | --- |
| Landing | Evidence-first product page with live coverage counts, no advice, no fake numbers. |
| Rankings | Compact table of all scored symbols, filterable by sector, source-backed. |
| Signals / Predictions | List of recent classification changes with severity, source-backed, no buy/sell. |
| Trust Centre | Methodology, provider status, data lineage. Long-form text with restrained typography. |
| About | Mission and team. Calm prose, restrained. |
| Dashboard | Authenticated command centre. Coverage + signals + watchlist + freshness in one row. |
| Search | Compact input + slim results list. Empty state has top ranked rail. |
| Compare | Two/three companies side by side with a comparison matrix below. |
| Watchlist | Saved companies in a single full-width card. |
| Portfolio | Manual holdings tracking, no live P&L. |
| Company detail | Score panel + factor breakdown + source trace + provider freshness. |

## What "premium" means here

Premium is not loud. Premium is:
- **Restraint** — only one accent colour, no rainbow pills.
- **Composition** — every section earns its width; nothing feels like a
  stack of disconnected cards.
- **Honesty** — every number has a source; every gap is labelled.
- **Calm** — no pulsing badges, no urgency timers, no fake live data.
- **Finance-grade clarity** — numbers and dates in monospace, units
  always shown, deltas in basis points rather than percentages where
  applicable.

## Acceptance scoring

| Score | Meaning |
| --- | --- |
| 9–10 | Premium, intentional composition, full-width, restraint, calm |
| 7–8 | Strong, minor density or polish opportunities remain |
| 5–6 | Functional, but feels generic SaaS / card wall / oversized |
| 3–4 | Bulky blocks, narrow column, mobile shell on desktop |
| 1–2 | Broken layout, no layout, raw tokens visible |

Routes scoring below 7 must be re-polished before sign-off.
