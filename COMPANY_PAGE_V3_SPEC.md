# StockStory Company Page V3 Specification (Corporate Equity Intelligence)

This document details the layout, data structure, visualization modules, and telemetry systems of the redesigned **Company Intelligence Page** (`?page=stock&id=SYMBOL`).

---

## 1. Page Hierarchy & Layout

The page utilizes a dense two-column dashboard structure on desktop, transforming into a prioritized single-column layout on mobile.

### Section 1: Hero Block (Header)
* **Kicker**: `text-[10px] font-mono tracking-widest text-cyan-400 uppercase` (e.g. "NSE EXCHANGE // SEGMENT: PRIVATE BANKS")
* **Title**: `text-4xl font-bold tracking-tight text-white` (e.g., "HDFC Bank Corp.")
* **Intraday Price Card**: Large price label with JetBrains Mono numbers, percentage change badges, and active data node status indicator.

### Section 2: Corporate DNA Profile
* **Visual Representation**: 5 horizontal cards (or grid columns) displaying factor scores:
  * *Business Quality*
  * *Growth Velocity*
  * *Stability Safety*
  * *Risk Outlook*
  * *Sentiment Index*
* **Metrics**: Displays score (e.g., "78%") and semantic status (e.g., "Strong", "Elevated Risk", "Stable") in matching color codes.

### Section 3: Telemetry Charts
* **Main Plot**: Pro-level chart displaying stock price movement aligned with overlay markers representing factor updates (e.g., dates when FII ownership spiked, or when margin expansion was reported).
* **Metrics Drawer**: Sidebar with details of:
  * PE ratios (Stock vs. Industry benchmark).
  * Market capitalization.
  * 52-week price channels.

### Section 4: Narrative Documentary (The Story)
* **Structure**: Clean markdown report covering the history, operational advantages, risks, and institutional history of the asset. Font is optimized for readability (wide lines, line-height 1.7).

---

## 2. Dynamic States & Telemetry

### Data Loading States
* Heavy cards display a glassmorphic shimmer overlay.
* Telemetry charts initialize with a smooth drawing animation path over 600ms (`stroke-dashoffset` CSS transitions).

### Mobile Ordering Sequence
To ensure optimal mobile UX, the layout enforces this exact sequence:
1. **Ticker Header & Price**: Core asset definition.
2. **Corporate DNA Summary**: Quick overall health check.
3. **Telemetry & Performance Infographic**: Key financial charts.
4. **Narrative Documentary**: Deep-dive reading text.
5. **Broker Actions & External Channels**: Outbound links.
