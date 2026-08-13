# Frontend Design System Rules for PSE Stock Platform

## Core Principle
Build a high-density financial trading terminal, NOT a generic SaaS landing page. Traders need to see maximum data at a glance with professional trust.

## Visual Constraints
- NEVER use generic dark-purple SaaS gradients, rounded cards, or glassmorphism
- Use high-density layouts with compact padding (8px–12px for data sections)
- Use monospace fonts (JetBrains Mono, SF Mono, Roboto Mono) for all financial numbers and stock tickers to ensure strict vertical alignment
- Replace all large spacing (gap: 24) with compact spacing (gap: 8–12)
- Remove all floating card designs; use clean borderless data tables with subtle divider lines

## Professional Color Palette
- **Primary Background**: Deep institutional navy blue (#0F1419 or #1A1F2E) or dark slate
- **Secondary Background**: Slightly lighter navy for cards/panels (#151B27)
- **Text Primary**: Clean off-white (#E8EAED or #F0F2F5)
- **Text Secondary**: Institutional gray (#9CA3AF)
- **Success/Gain**: Sharp emerald green (#00B060 or #10B981)
- **Danger/Loss**: Clean institutional red (#EF4444 or #DC2626)
- **Neutral/Volume**: Muted slate (#64748B)
- **Accent**: Professional teal or steel-blue (#0891B2)

## Typography
- **Body/Data Numbers**: Monospace (JetBrains Mono, 12–13px) for perfect vertical alignment
- **Headers/Titles**: Geometric sans (Plus Jakarta Sans, Clash Display, or SF Pro Display), 14–16px, font-weight 600–700
- **Metadata**: Monospace (12px), muted color for volume, timestamps

## Component Rules
- NEVER use emojis as icons. Use Lucide React icons exclusively
- All stock data must be in dense, borderless data tables with:
  - Columns: Ticker, Company Name, Last Price, Change (%), Change ($), Volume, 7-Day Trend
  - Row height: 32–36px (not 60px+ like cards)
  - Subtle horizontal divider lines (border-bottom: 1px solid rgba(255,255,255,0.05))
- Implement mini Sparkline charts (width: 48–60px, height: 20px) for trends instead of massive line graphs
- Use 1px or 2px borders, not 8px rounded cards
- Market data always right-aligned in monospace for clean column scanning

## Layout Rules
- Hero section: Remove large padding (p-8). Use p-3 or p-4 for dense layouts
- Search bar: 36–40px height (not 44px), compact margins
- Data sections: max-width 1400px, single column on mobile, 2–3 column grids on desktop
- Horizontal scrollable data tables on mobile, not stacked cards

## Spacing System
- Minimum gap between sections: 12px
- Padding inside containers: 8–12px (not 16–24px)
- Card spacing: 8px grid (no oversized margins)
- Mobile: respect safe area insets, but keep data dense

## Components to Build/Replace
1. **Ticker Tape** (Top of page): Continuous marquee showing $PSEi, $SM, $BDO, $ALI with live prices
2. **Data Grid** (Main dashboard): Professional stock table with sortable columns
3. **Price Card** (Stock detail): Compact, numbers-first design with mini charts
4. **Market Status**: Clean 1-line header showing: Market Status | Time | PSEi Level
5. **Quick Links**: Replace emoji buttons with Lucide icons in a tight button row

## Fonts
- Data/Ticker: `font-family: "SF Mono", "JetBrains Mono", "Roboto Mono", monospace; font-size: 12px; font-weight: 500`
- Headers: `font-family: "Plus Jakarta Sans", "Clash Display", "SF Pro Display", sans-serif; font-size: 16px; font-weight: 700`

## NO
- Gradients (except subtle angle overlays)
- Drop shadows (use borders instead)
- Blur effects (glassmorphism is dead in finance)
- Emojis anywhere
- Generic card layouts
- Large padding
- Oversized buttons

## YES
- Dense data tables with monospace alignment
- Clean 1–2px borders
- Professional serif/monospace typography
- Compact, scannable layouts
- Direct, numeric CTAs
- Institutional color palette
