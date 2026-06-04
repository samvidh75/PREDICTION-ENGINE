# Page-by-Page Redesign Blueprint (StockStory India V3)

This blueprint documents the visual and UX audit of the StockStory India platform following the simplification of RC14. It outlines the current state and sets forth the future design specs for all 10 core pages.

---

## 1. About Page

### Current Audit
* **Purpose**: Explains StockStory's structural, noise-free investment philosophy.
* **Layout**: Large typographical hero layout, accompanied by neural synthesis previews and interactive previews of educational search concepts.
* **Weaknesses & Problems**:
  * *Visual*: Multiple orb overlays and holographic panels can cause visual distraction, violating the Notion-like minimalism principles.
  * *Content*: Explanations of neural synthesis contain slight fintech jargon.
  * *Navigation*: Lacks a direct, prominent sign-up/login action in the hero.

### V3 Design Blueprint
* **Vision**: A premium editorial publication landing page resembling Stripe or Apple News.
* **Layout Sections**:
  1. *Hero Block*: Centered headline explaining the platform's core thesis in under 15 seconds.
  2. *Product Features Grid*: A 3-column minimalist layout demonstrating what we track (Quality, Value, Ownership).
  3. *Call to Action*: Minimalist email field and button to direct users to `/signup`.
* **Animations**: Fade-in on load over 300ms.

---

## 2. Login Page

### Current Audit
* **Purpose**: Allows users to enter credentials or use OAuth to access their terminal workspace.
* **Layout**: A centered Cinematic Auth Gateway card overlaid on a dark space grid background.
* **Weaknesses & Problems**:
  * *Visual*: Auth cards contain a lot of nested layouts with high transparency which can be hard to read on legacy screens.
  * *Content*: Lacks a clear, welcoming kicker explaining user workspace security.
  * *Navigation*: Inconvenient exit links (e.g. back to overview triggers a full reload).

### V3 Design Blueprint
* **Vision**: A single-column secure authentication card centered on an ultra-dark background.
* **Layout Sections**:
  1. *Header*: Brand logo + Kicker ("SECURE CREDENTIAL VALIDATION").
  2. *Auth Card*: Encrypted inputs for Email & Password, unified OAuth buttons (Google, Apple).
* **Loading State**: Displays a circular infinite loader spinner when validating credentials.

---

## 3. Signup Page

### Current Audit
* **Purpose**: Premium account registration.
* **Layout**: Centered account creation overlay matching the login view.
* **Weaknesses & Problems**:
  * Same visual issues as the login page; high nested transparency causes slight visual clutter.

### V3 Design Blueprint
* **Vision**: Symmetric card matching the Login page.
* **Layout Sections**:
  1. *Header*: Brand logo + Kicker ("IDENTITY ESTABLISHMENT").
  2. *Registration Card*: Input fields for Name, Email, and Password with strict password strength bars.

---

## 4. Dashboard

### Current Audit
* **Purpose**: Unified market terminal overview answering "What deserves attention today?".
* **Layout**: Header greeting followed by index trackers, personal daily brief highlights, attention cards, and sector maps.
* **Weaknesses & Problems**:
  * *Visual*: Stacking multiple complex indexes, daily brief grids, and sector rotations on one viewport causes slight cognitive fatigue.
  * *Navigation*: Switching to the "My Workspace" tab is not visually distinct enough.

### V3 Design Blueprint
* **Vision**: A professional terminal workspace resembling Bloomberg.
* **Layout Sections**:
  1. *Daily Brief Ribbon*: Summary of market mood, portfolio health, and critical triggers.
  2. *Sector Map*: Multi-column tree view displaying indices and gains.
  3. *Five Attention Cards*: Core analytical insights constrained to under 40 words.

---

## 5. Discovery Page

### Current Audit
* **Purpose**: Helps users search and discover companies worth researching.
* **Layout**: Grid layout organizing companies into trending sectors and thematic groupings.
* **Weaknesses & Problems**:
  * *Visual*: Sector list lacks clear sorting tags.
  * *Content*: Needs faster highlight filters (e.g. FII Spikes, High Quality, Dividend compounders).

### V3 Design Blueprint
* **Vision**: A clean, tag-oriented discovery workspace.
* **Layout Sections**:
  1. *Search and Filter Bar*: High-performance real-time query inputs.
  2. *Factor Swings Grid*: Filtered columns showing stocks with high change momentum.

---

## 6. Company Intelligence Page

### Current Audit
* **Purpose**: Flagship equity intelligence detail page.
* **Layout**: Detailed corporate telemetry, DNA scores, news events, and narrative documentations.
* **Weaknesses & Problems**:
  * *Visual*: Rendering both price charts and factor score tables can clutter the desktop view.
  * *Mobile*: Telemetry tables do not fit well on narrow screens.

### V3 Design Blueprint
* **Vision**: A premium asset booklet.
* **Layout Sections**: Refer to `COMPANY_PAGE_V3_SPEC.md` for details.

---

## 7. Watchlist

### Current Audit
* **Purpose**: Tracks companies of interest to the user.
* **Layout**: List of monitored assets with quick delta indexes.
* **Weaknesses & Problems**:
  * *Visual*: Lacks clean interactive delete and reorder buttons.
  * *Navigation*: Navigating from watchlist to company details requires full reload.

### V3 Design Blueprint
* **Vision**: An active watchlist table.
* **Layout Sections**: Table headers containing Ticker, Sector, Current Price, 24h Change, and a quick "Remove" cross button.

---

## 8. Portfolio

### Current Audit
* **Purpose**: Portfolio performance tracking and capital metrics.
* **Layout**: Weight allocations, factor exposure, and assets checklist.
* **Weaknesses & Problems**:
  * *Visual*: Progress bars for factor exposures are basic.

### V3 Design Blueprint
* **Vision**: Pro-grade portfolio management panel.
* **Layout Sections**: Visual donut chart representing asset allocation, alongside key metrics cards (Diversification, Concentration Risk).

---

## 9. Alerts

### Current Audit
* **Purpose**: Monitor active market alerts and alerts configuration.
* **Layout**: Alerts list and priority filter buttons.
* **Weaknesses & Problems**:
  * *Visual*: Alerts list items are crowded.

### V3 Design Blueprint
* **Vision**: Dynamic notification center.
* **Layout Sections**: High-priority alert list sorted by timestamp, with interactive mark-as-read toggles.

---

## 10. Settings

### Current Audit
* **Purpose**: User preferences and profile configurations.
* **Layout**: Forms for updating password and personal details.
* **Weaknesses & Problems**:
  * *Visual*: Form inputs are generic.

### V3 Design Blueprint
* **Vision**: Notion-style layout configuration settings.
* **Layout Sections**: Grouped settings sheets (Account, Preferences, Factors).
