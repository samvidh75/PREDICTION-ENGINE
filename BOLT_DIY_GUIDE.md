# Bolt.diy Integration Guide - PSE Trading Terminal

## Overview
This project is configured to work with **Bolt.diy**, an open-source AI code generation web IDE. Bolt.diy allows you to design, develop, and iterate on the project using AI-assisted code generation and real-time preview.

## Setup Instructions

### Option 1: Use Bolt.diy Cloud (Recommended)
1. Visit [Bolt.diy](https://bolt.diy) in your browser
2. Click "Open Repository" or "Clone from Git"
3. Enter: `https://github.com/samvidh75/PREDICTION-ENGINE.git`
4. Bolt.diy will automatically detect the project configuration
5. Start coding with AI assistance!

### Option 2: Local Bolt.diy Setup
```bash
# Clone Bolt.diy repository
git clone https://github.com/stackblitz-labs/bolt.diy.git
cd bolt.diy

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
# Then open this project
```

### Option 3: Integrate with Your Development Workflow
```bash
# Install project dependencies
npm install

# Run development server
npm run dev

# In another terminal, open the project directory in Bolt.diy
# This allows you to use Bolt.diy's AI features while developing locally
```

## Project Configuration

The `.boltdiy` configuration file includes:
- **Build Command**: `npm run build` - Builds frontend + backend
- **Dev Command**: `npm run dev` - Starts local development server
- **Test Command**: `npm run test` - Runs the test suite
- **Framework**: React + TypeScript
- **Design System**: Professional Trading Terminal (Navy #0F1419, Teal #0891B2)

## Using Bolt.diy for PSE Terminal Design

### 1. Component Development
Use Bolt.diy's AI features to:
- **Generate components** following CLAUDE.md design rules
- **Refactor pages** for professional trading terminal aesthetic
- **Add responsive layouts** with monospace financial data
- **Create data tables** with borderless styling

### 2. Design System Consistency
Bolt.diy can help maintain:
- Color palette consistency (#0F1419, #0891B2, #10B981, #EF4444)
- Monospace font usage for all financial data
- Compact spacing (max 12px gaps)
- Lucide icon standardization

### 3. AI-Assisted Prompts for Bolt.diy
Try these prompts in Bolt.diy:

```
"Redesign HomePage to professional trading terminal:
- Compact 32px status bar with monospace time
- 36px search input with Lucide icons
- Professional color palette (#0F1419 navy, #0891B2 teal)
- No gradients, no shadows, borderless design"

"Create a dense stock data table for Scanner:
- Columns: Ticker (monospace) | Name | Price (monospace) | Change % (colored)
- Borderless with 1px dividers
- Color-coded (green gains, red losses)
- Sortable columns"

"Convert StockPage to numbers-first layout:
- Large monospace price display (42px)
- Compact fundamentals grid (P/E | P/B | ROE | D/E)
- Professional color scheme per CLAUDE.md
- Remove all shadows and effects"
```

## Key Design System Rules for Bolt.diy

When using Bolt.diy to generate or modify components, ensure:

✅ **DO:**
- Use monospace fonts (`--font-mono`) for all financial data
- Apply professional color palette from `src/design/tokens.ts`
- Keep spacing compact (gap: 8-12px, padding: 8-12px max)
- Use Lucide React icons exclusively
- Implement borderless tables with 1px dividers
- Color-code values (green #10B981 for gains, red #EF4444 for losses)

❌ **DON'T:**
- Add gradients or drop shadows
- Use large rounded corners (max 4px)
- Use emoji or generic UI icon sets
- Create floating card layouts (use tables instead)
- Add glassmorphism or blur effects
- Use non-monospace fonts for numbers

## Real-Time Preview
When using Bolt.diy:
1. Edit components in the IDE
2. See live preview instantly
3. Test with real PSE stock data from `/api/stock/*`
4. Verify professional design consistency
5. Commit changes back to GitHub

## Integration with Existing Backend
The project includes:
- **Real PSE Data API**: `/api/stock/:symbol` returns live prices with cache fallback
- **Stock Search**: `/api/search?q=BDO` for ticker lookup
- **Market Status**: Automatic market hours detection
- **WebSocket Support**: Real-time price updates (optional)

Example API call in Bolt.diy components:
```typescript
const response = await fetch(`/api/stock/${symbol}`);
const data = await response.json();
// data.price.current - Stock price in monospace
// data.price.changePercent - Color-coded change %
// data.symbol - Ticker symbol (monospace in UI)
```

## Deploying Changes

After developing with Bolt.diy:
```bash
# Push changes to GitHub
git add .
git commit -m "Redesign component via Bolt.diy"
git push origin main

# Deploy to VPS
ssh root@103.211.56.127 "cd /opt/stockex && git pull origin main && npm run build"
```

## Troubleshooting

**Issue**: Bolt.diy can't find modules
- **Solution**: Ensure `tsconfig.json` and `tsconfig.base.json` are correct (they are)

**Issue**: Real-time preview doesn't show stock data
- **Solution**: Ensure `/api/stock/*` endpoint is running on VPS

**Issue**: Design doesn't match professional terminal
- **Solution**: Reference CLAUDE.md and `src/design/tokens.ts` for color/spacing values

## Resources

- **Bolt.diy Docs**: https://github.com/stackblitz-labs/bolt.diy
- **Design System**: See `CLAUDE.md` in project root
- **Color Tokens**: `src/design/tokens.ts`
- **CSS Variables**: `src/styles/tokens.css`
- **Live API**: http://103.211.56.127:4001

## Next Steps

1. ✅ TypeScript errors fixed
2. ✅ Bolt.diy configuration added
3. 🚀 **Start using Bolt.diy to:**
   - Design remaining pages (StockPage, Scanner, Portfolio)
   - Add professional trading terminal components
   - Test with real PSE data
   - Deploy to VPS with Git integration

Happy designing! 🎨
