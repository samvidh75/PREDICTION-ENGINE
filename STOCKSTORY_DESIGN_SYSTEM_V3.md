# StockStory Design System V3 (Premium Equity Intelligence Specification)

This design system establishes a high-fidelity, high-contrast, yet minimalist aesthetic system. It is designed to feel like **Bloomberg** (institutional depth) × **Apple** (pixel perfection, premium finish) × **Stripe** (flawless typography, grid alignments, micro-interaction state curves) × **Notion** (uncluttered, clean utility).

---

## 1. Color System (Dark & Light Harmony)

We implement a sophisticated dual-layered semantic color system designed to minimize cognitive load while ensuring visual depth.

### Core Neutral Palette
* **Deep Space Black (`#020304`)**: The absolute background foundation. Provides infinite depth.
* **Elevated Charcoal (`#0B0D11`)**: Used for background cards, layout modules, and panels.
* **Border Charcoal (`#161A22` / `rgba(255,255,255,0.06)`)**: The default border style for modular layout elements.
* **Secondary Border (`#222936` / `rgba(255,255,255,0.12)`)**: Highlight border for active or hovered components.
* **Primary Text (`#F3F4F6` / `rgba(255,255,255,0.95)`)**: Main headings and body text.
* **Secondary Text (`#9CA3AF` / `rgba(255,255,255,0.60)`)**: Captions, kicker lines, and metadata.
* **Muted Text (`#4B5563` / `rgba(255,255,255,0.30)`)**: Subtitle labels and inactive tabs.

### High-Fidelity Accent System
Our accent colors are highly saturated yet sophisticated (no generic primary colors).
* **Cyan Glow (`#06B6D4` / `rgba(6, 182, 212, 1)`)**: Representing growth, technology, and navigation highlights.
* **Emerald Green (`#00D17A` / `rgba(0, 209, 122, 1)`)**: Representing bullish sentiment, positive factor swings, and stability.
* **Amber Yellow (`#F59E0B` / `rgba(245, 158, 11, 1)`)**: Representing risk assessment, alerts, and warning factors.
* **Rose Red (`#FF5B6E` / `rgba(255, 91, 110, 1)`)**: Representing bearish movements, critical alerts, and metrics failure.
* **Orchid Magenta (`#D946EF` / `rgba(217, 70, 239, 1)`)**: Representing institutional ownership changes and special factor metrics.

---

## 2. Typography & Text Hierarchy

We abandon generic sans-serif fallbacks and enforce clean, proportional font spacing.

* **Primary Font family**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
* **Mono Font family**: `JetBrains Mono`, `Fira Code`, `monospace` (for tickers, delta percentages, numeric values).

### Hierarchy Tokens:
* **Display Level 1**: `text-5xl` to `text-7xl` (48px - 72px), font-weight: `800` (tracking: `tightest / -0.04em`). Used for landing page hero headlines.
* **Section Title**: `text-2xl` to `text-3xl` (24px - 30px), font-weight: `700` (tracking: `-0.02em`). Used for core widget headings.
* **Card Header**: `text-sm` (14px), font-weight: `600` (tracking: `wide / 0.05em`), uppercase. Used for labels and ticker kickers.
* **Body / Reading**: `text-xs` to `text-sm` (12px - 14px), font-weight: `400` (line-height: `1.6`), color: `rgba(255,255,255,0.85)`. Optimized for dense financial reporting.
* **Muted Caption**: `text-[10px]` to `text-xs` (10px - 12px), font-weight: `500` (tracking: `widest / 0.1em`), uppercase, color: `rgba(255,255,255,0.5)`.

---

## 3. Layout Grid & Panel Philosophy

* **Symmetry**: All pages conform to a precise grid alignment (12-column system on desktop, 4-column system on mobile).
* **Borders & Radii**:
  * Large Container / Card Radius: `rounded-2xl` (`16px`).
  * Button / Input Radius: `rounded-lg` (`8px`) or `rounded-full` (`999px`) for pill tags.
  * Border Stroke: `1px solid rgba(255,255,255,0.06)`.
* **Glow & Depth (Glassmorphism)**:
  * Cards use a semi-transparent background: `bg-white/[0.01] backdrop-blur-md`.
  * Subtle hover transitions using pure CSS: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 4. Interaction Curve Guidelines

* **Button States**:
  * Default: `border-white/5 bg-white/5 text-white/90`
  * Hover: `border-white/20 bg-white/10 text-white scale-[1.01]`
  * Active / Pressed: `scale-[0.98] bg-white/[0.08]`
* **Micro-Animations**:
  * All layout transitions must use a composed cubic-bezier curve (`cubic-bezier(0.16, 1, 0.3, 1)`) rather than linear or bouncy springs, giving it an elite iOS-like response.
