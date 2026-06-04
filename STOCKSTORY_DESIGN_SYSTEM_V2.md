# StockStory Design System V2

This document defines the visual layout rules, components, tokens, and style guidelines for the redesigned StockStory India platform.

## Typography

We transition to a clean, highly legible font scale using premium typefaces:
* **Headers & UI Titles:** `Inter Tight`, sans-serif (tracking `-0.02em` for tight, premium headlines).
* **Body & Explanatory Text:** `Inter`, sans-serif (line height `1.6` for optimal readability).
* **Data, Metrics, & Timestamps:** `JetBrains Mono`, monospace (for clean, aligned numbers).

---

## Colour Palette

We establish a harmonized, institutional palette matching `#05070A` backdrops with premium highlights:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Background (Void)** | `#05070A` | Default application body background. |
| **Surface (Card)** | `#0C0F15` | Default card background, with `rgba(255,255,255,0.01)` overlay. |
| **Primary (Highlight)** | `#00D4FF` | Accents, active selections, and core neon indicators. |
| **Secondary (Attention)** | `#7B61FF` | Factors, secondary highlights, and special category cards. |
| **Success (Gain)** | `#00FFB3` | Positives, margin growth, and undervalued status. |
| **Warning (Hold)** | `#FFB547` | Neutral changes, average valuations, and alerts. |
| **Danger (Loss)** | `#FF5A7A` | Risk factors, overvalued status, and negative drivers. |

---

## Component Style Standards

### 1. Glassmorphism Panels
* **Specs:** `bg-white/[0.01] border border-white/10 backdrop-blur-md hover:bg-white/[0.03] transition-all duration-300 hover:border-[#00D4FF]/30`
* **Glow:** Subtle box shadows rather than bright neon borders: `shadow-[0_4px_30px_rgba(0,0,0,0.5)]`.

### 2. Animated Charts & Heatmaps
* **Specs:** Use clean SVG paths or simple Canvas elements for charts. Transition curves must be smooth and linear (e.g. `cubic-bezier(0.16, 1, 0.3, 1)`).
* **Avoid:** Point animations that loop indefinitely. Only animate values during initial load or update transitions.

### 3. Radial Cards & Timelines
* **Specs:** Standardize margins to `p-6` on desktop, `p-4` on mobile. Timelines should use vertical track lines (`border-l border-white/10`) with small circles indicating key corporate actions.

---

## Guardrails (Do's & Don'ts)

* **DO:**
  - Keep information dense and structured in rows/columns.
  - Use exact numerical badges (e.g. `+1.84%`) in mono font.
  - Rely on visual grids to organize contents.
* **DON'T:**
  - Do NOT draw decorative green/cyan grid lines simulating radar sweeps.
  - Do NOT use floating particles or cyber-text loading screens.
  - Do NOT overlay decorative "telemetry channel status" overlays on top of charts.
