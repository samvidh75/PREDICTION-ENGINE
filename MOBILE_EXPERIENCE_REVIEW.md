# StockStory — Mobile Experience Review

This review audits the responsiveness, layout structure, and touch controls of the StockStory terminal on mobile viewports (simulating standard 375px to 428px widths).

---

## Page-by-Page Viewport Audits

### 1. Dashboard
* **Layout Responsiveness**: **B+**
  * The main grid re-flows into a single column. The glassmorphic cards scale down cleanly without clipping contents.
  * *Issue*: The scrolling stock ticker strip at the top consumes significant CPU cycles on low-end mobile devices, causing minor stuttering during page scroll.
* **Touch Targets**: **A**
  * Key navigation icons have a 48px padding boundary, preventing accidental misclicks.

### 2. Company Page (CompanySuperpage)
* **Layout Responsiveness**: **B**
  * The **Progressive Disclosure** steps re-flow vertically. The "Intelligence Outlook" scorecard wraps into a 2x3 or 1x5 grid, which keeps it readable.
  * *Clipping Issue*: The factor score radar charts and historical candle charts are squeezed horizontally. When viewing in portrait mode, the axis labels overlap.
* **Touch Targets**: **B+**
  * Timeframe selectors (1D, 1W, 1M, 1Y) are large enough to tap comfortably, but they are positioned too close to the main chart border, occasionally triggering chart crosshairs instead of changing timeframes.
* **Touch Gestures**: **B**
  * Dragging across the candle chart to view historic prices works, but it intercepts the vertical page scroll gesture, trapping the user's scroll inside the chart area.

### 3. Portfolio Page
* **Layout Responsiveness**: **B-**
  * Large tables showing position weights, acquisition prices, and current gains do not fit horizontally.
  * The layout attempts to re-flow the tables into cards, but the cards look cluttered, with text overlapping when company names are long (e.g. "Hindustan Aeronautics Limited").
* **Touch Targets**: **B**
  * Input fields for modifying stock weights are small (approx 32px height), which makes editing weights tedious on screen keyboards.

### 4. Search Page (Command Centre)
* **Layout Responsiveness**: **A**
  * The search overlay occupies the full screen, hiding background scrolling. This prevents accidental page jumps.
  * The native mobile keyboard triggers automatically and does not push key elements out of the viewport.
* **Touch Targets**: **A**
  * Autocomplete search suggestions have a large vertical spacing (54px), making it very easy to select the correct stock with a thumb.

### 5. Sector Explorer
* **Layout Responsiveness**: **A-**
  * The rotation ecosystem grid wraps into a clean vertical list.
  * *Minor Issue*: High-contrast colors (cyan, emerald, rose) can cause screen glare on OLED screens when brightness is high.
* **Touch Targets**: **A**
  * Sector filter tabs are large and easy to toggle with single taps.

---

## Mobile Usability Scorecard

```
+------------------------+---------------+----------------------+-------------------------------------------------+
| Surface                | Mobile Grade  | Usability Focus      | Key Friction Point                              |
+------------------------+---------------+----------------------+-------------------------------------------------+
| Dashboard              | B+            | Quick Overview       | Scrolling ticker stutters on older devices.      |
| Company Superpage      | B             | Dynamic Data Reading | Chart drag gesture traps vertical page scroll.  |
| Portfolio Page         | B-            | Asset Management     | Card reflow feels cluttered with long names.    |
| Search Overlay         | A             | Command Entry        | None. Autocomplete list is highly tapable.      |
| Sector Explorer        | A-            | Structural Analysis  | Grid wraps nicely but displays heavy density.   |
+------------------------+---------------+----------------------+-------------------------------------------------+
```

---

## Action Plan for Mobile Polish

1. **Chart Scroll Trapping Fix**: Configure the touch-action CSS property on the interactive chart containers (`touch-action: pan-y`) to ensure that dragging horizontally across the chart does not block vertical window scrolling.
2. **Text Wrapping for Long Names**: Apply CSS truncation (`text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`) to long company names on mobile portfolio cards.
3. **Optimize Ticker Animations**: Use hardware-accelerated CSS transforms (`translate3d`) for the ticker animation instead of Javascript-based interval updates to improve frame rates on mobile browsers.
