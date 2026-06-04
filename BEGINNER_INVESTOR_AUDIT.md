# StockStory — Beginner Investor Audit

This audit evaluates the platform's accessibility, usability, and educational value for an absolute beginner (first-time retail investor).

---

## Accessibility Evaluation

### 1. Can a beginner understand the page?
* **Verdict**: **Partially (Yes, with caveats)**.
* **Analysis**:
  * The dashboard and company pages feature a beautiful, high-contrast dark theme with glassmorphic cards that feel modern and premium.
  * The **Progressive Disclosure** architecture is a major success. By default, it collapses deep corporate history, leadership timelines, and advanced financial metrics, preventing the beginner from feeling overwhelmed.
  * *Cognitive Overload*: When the beginner expands the charts or accesses the main table view, they are confronted with a high-density matrix of numbers and abbreviations (e.g. RSI, ADX, ATR, PE, PEG, PB) that are not explained anywhere in the UI.

### 2. Can a beginner understand factor scores?
* **Verdict**: **No (Requires onboarding guides)**.
* **Analysis**:
  * StockStory evaluates companies using factor scores (Quality, Value, Growth, Momentum, and Risk) rated from 0 to 100.
  * While this scoring system makes mathematical sense, a beginner does not know what a score represents in practice. For instance, is a Value score of 45 good or bad? Does it mean the stock is cheap or expensive?
  * Without explaining that these scores are **relative rankings** compared to the rest of the market, a beginner might mistake a low Value score for a bad rating, rather than a sign that the stock is trading at a growth premium.

### 3. Can a beginner understand risk?
* **Verdict**: **Yes (Well-designed but lacks depth)**.
* **Analysis**:
  * Risk is presented clearly using simple text labels (Low Risk, Moderate, High Risk) that are color-coded (emerald, amber, rose).
  * The portfolio tool shows a clear "Diversification Status" that warns the user if they are heavily concentrated in a single sector.
  * *Missing Context*: While the label "High Risk" is clear, the system does not explain *why* the stock is risky (e.g., is it due to historical price volatility, debt levels, or sector instability?).

---

## Identified Friction Points & Jargon Audit

```
+------------------+-----------------------------+-------------------------------------------------------------+
| Jargon Term      | UI Location                 | Beginner Interpretation / Pain Point                        |
+------------------+-----------------------------+-------------------------------------------------------------+
| RSI (Relative    | Technical Charts & Drivers  | "Is this related to stress? What does 70 mean?"             |
| Strength Index)  |                             | Needs a simple label like "Overbought (Expensive)".         |
| ADX (Average     | Company Metrics             | "Is this an index?"                                         |
| Directional Index|                             | Needs to be translated to "Trend Strength".                 |
| Factor Score     | Outlook Grids               | "Is this a credit score? Is higher always better?"          |
|                  |                             | Needs a tooltip explaining relative ranking.                |
| NIM / NPA        | Financial Tables (Banking)  | "No idea what net interest margin or non-performing assets  |
|                  |                             | mean." Needs custom descriptions for bank financial cards.  |
+------------------+-----------------------------+-------------------------------------------------------------+
```

---

## Actionable Recommendations

### 1. Introduce "Beginner Mode" UI Filters
* Implement a global toggle in the navigation bar: `[Beginner Mode / Professional Mode]`.
* In **Beginner Mode**, replace technical terms with clear, everyday labels:
  * Replace "RSI: 72" with "Buying pressure is currently high (overbought)".
  * Replace "ADX: 28" with "Stock is in a strong trend".
  * Hide advanced indicators like ATR and Bollinger Width entirely.

### 2. Implement Interactive Glossaries (Hover Tooltips)
* Add a small question mark icon `(?)` next to every technical label (Quality, Value, Momentum, PE, PB, RSI, MACD).
* Hovering over the icon should display a brief card explaining:
  * What the term means in simple English.
  * Why it matters to their investment.
  * What a typical high vs. low value signifies.

### 3. Build a Methodology Onboarding Guide
* Add a simple 3-slide wizard when a new user enters the platform for the first time.
* Slide 1: *"Welcome to StockStory — We translate complex market numbers into clear business stories."*
* Slide 2: *"Understand the Moat: Quality represents the business strength, Value shows if the price is fair, and Momentum shows the current market speed."*
* Slide 3: *"Build Safely: Use the Portfolio tool to check if you have balanced exposure across different sectors."*
