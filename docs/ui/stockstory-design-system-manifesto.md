# SSI Research OS — Design System Manifesto

This document defines the central design tokens, typography rules, depth systems, and navigation parameters for the StockStory India "Research OS" interface.

---

## 1. Visual Manifesto
StockStory India is not a trading app, nor is it a casual stock tips portal. It is an **Indian equity research operating system** built for deep, evidence-first financial analysis. The visual tone must be:
*   **Calm & Academic**: Zero blinking lights or noisy neon charts.
*   **Tactile but Restrained**: Clean borders, gentle elevations, and readable metrics.
*   **Highly Trustworthy**: Absolute data integrity; no fake recommendations.

---

## 2. Color System
The color palette represents authority, trust, and clarity:

*   **Neutral Canvas**: Warm Off-White / Pearl (`#F9FAF9`, `#F0F4F2`). Linear gradients between these tones.
*   **Primary Accent**: Deep Emerald (`#087F69`) for positive status, scored state, and key brand marks.
*   **Secondary/Info**: Steel Blue / Navy (`#2C6B9E`, `#1E293B`) for secondary badges and system-level actions.
*   **Attention/Warning**: Soft Gold (`#B7791F`) for partial coverage or data gaps.
*   **Danger/Alert**: Muted Red (`#B42318`) for degraded or blocked services.
*   **Elevated Surfaces**: Pure White (`#FFFFFF`) with a subtle translucency layer, rather than heavy outlines.
*   **Dark Surfaces**: Deep Graphite (`#111827`) used only in focused hero cards or overlays.

---

## 3. Typography System
A single, consistent typography system centered on readibility and high-quality tabular data layout.
*   **Primary Font**: Inter (sans-serif) for all headers, labels, and paragraph copy.
*   **Secondary Font**: JetBrains Mono (monospace) for technical codes, dates, and small tags.
*   **Numerals**: Tabular numerals (`tnum`, `lnum`) enforced on every financial table, ticker, and score index.
*   **Spacing**: Normal, relaxed letter spacing. Avoid excessive letter spacing except for tiny sub-headings or eyebrows.

---

## 4. Depth & Elevation
Only three elevation levels are permitted:
1.  **Base Card**: Gentle background panels using translucent surfaces with light borders (`rgba(15, 23, 42, 0.08)`).
2.  **Raised Card**: Soft elevation state for active elements using custom soft shadows.
3.  **Floating Sheets / Modals**: Centered overlays with subtle dark backdrops (`rgba(0, 0, 0, 0.12)`) and background blurs.

---

## 5. Navigation Architecture
*   **Desktop Layout**: 
    *   Left side rail (compact and clean, branding at top, primary navigation grouped, trust page highlight, account actions at bottom).
    *   Top search and status bar (compact search, freshness indicator, user profile button).
*   **Mobile Layout**:
    *   Top brand bar (brand name, settings/alerts toggle).
    *   Bottom navigation bar (Home, Search, Rankings, Watchlist, Research/Trust). Bottom nav must respect safe areas.
    *   No floating buttons overlapping content.
