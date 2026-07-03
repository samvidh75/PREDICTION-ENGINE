# PHASE PROMPTS - ALL REMAINING PHASES

**Purpose**: Self-contained prompts for each phase that can be used in future sessions  
**Format**: Copy-paste ready for new sessions with fresh token budget  
**Total Phases**: 3, 4, 5, 6 (Phase 1-2 already complete)

---

## PHASE 3 PROMPT - Dashboard Integration & Core UI Wiring

**Session Start**: When Phase 2 is complete and you have 4-6 hours available  
**Token Budget**: 20-25k tokens  
**Success Criteria**: Dashboard fully wired with live stock data

---

### PHASE 3 DETAILED PROMPT

```
PROJECT CONTEXT:
You are continuing work on PREDICTION-ENGINE, a production-ready Indian stock 
research platform. Phases 1-2 are complete (real-time data from 3 providers, 
multi-provider fallback, IndexedDB caching). Now implementing Phase 3: wiring 
these capabilities into the main UI.

WHAT YOU HAVE READY:
- EnhancedScreener component (src/components/EnhancedScreener.tsx)
  Complete UI with live stock filtering, search, and live updates
- useQuote/useQuotes hooks (src/hooks/useQuote.ts)
  Auto-refresh stock quotes from 3 providers
- ProviderAggregator (src/clients/ProviderAggregator.ts)
  Multi-provider orchestration with intelligent fallback
- BrowserCache (src/clients/BrowserCache.ts)
  5-10ms cache hits, 5-min price TTL, 1-hr fundamental TTL

YOUR MISSION:
Implement 3 production UI features integrating the above:

TASK 1: Add EnhancedScreener to Dashboard (30 min)
────────────────────────────────────────────────────
FILE: src/pages/DashboardPage.tsx
CURRENT:
  export default function DashboardPage() {
    const session = useMemo(() => loadAuthSession(), []);
    const userId = session.status === "authenticated" && session.uid ? session.uid : "anonymous";
    const hasProTier = session.status === "authenticated";
    
    return (
      <div style={{maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: layout.pagePaddingDesktop}}>
        <StockExDashboard userId={userId} hasProTier={hasProTier} />
        <PersonalizedFeed />
      </div>
    );
  }

TO DO:
1. Import EnhancedScreener component
2. Add <EnhancedScreener /> between StockExDashboard and PersonalizedFeed
3. Test: Dashboard loads without errors, EnhancedScreener visible, can search stocks
4. Verify: Prices update every 5 seconds, filters work (sector, P/E, quality)

SUCCESS: Dashboard shows live stock screener with real-time data


TASK 2: Create Stock Detail Page (45 min)
──────────────────────────────────────────
FILE: Create src/pages/StockDetailPage.tsx
PURPOSE: Show detailed view of a single stock with live quote

REQUIREMENTS:
- URL: /stock/:symbol (e.g., /stock/RELIANCE)
- Components:
  * Stock symbol + company info (if available)
  * Current price in ₹ (₹3,521.45)
  * Change % with color coding (green for +, red for -)
  * Volume in millions (5.2M)
  * Bid-Ask spread (₹3,521.00 - ₹3,522.00)
  * Data source indicator (yfinance/nselib/screener)
  * "Cached" label if data is from cache
  * Refresh button
  * Auto-refresh every 5 seconds

IMPLEMENTATION:
- Use useQuote hook from src/hooks/useQuote.ts
- Handle loading state: Show "Loading quote..."
- Handle error state: Show error message + refresh button
- Handle null data: Show "No data available"
- Color scheme: Use colors from src/design/tokens.ts
- Styling: Inline styles or CSS modules (match existing style)

SUCCESS: Can navigate to /stock/RELIANCE and see live price updating


TASK 3: Create Watchlist Component (30 min)
────────────────────────────────────────────
FILE: Create src/components/Watchlist.tsx
PURPOSE: Persistent watchlist that auto-updates prices

REQUIREMENTS:
- Default symbols: ['RELIANCE', 'TCS', 'INFY', 'WIPRO', 'HDFC']
- Features:
  * Display all symbols with current price, change %, source
  * Add symbol button (prompt for symbol)
  * Remove symbol button (X for each symbol)
  * Auto-refresh prices every 5 seconds
  * Persist to localStorage under key 'prediction-engine:watchlist'
  * Load from localStorage on component mount

IMPLEMENTATION:
- Use useQuotes hook for batch quote fetching
- useState for symbols list
- useEffect for localStorage sync
- Grid/flex layout to display symbols
- Green/red text for positive/negative change %

SUCCESS: Can add/remove symbols, prices auto-update, watchlist persists


WIRING IN ROUTES:
FILE: src/app/routes.tsx
- Import StockDetailPage from "../pages/StockDetailPage"
- Add route: <Route path="/stock/:symbol" element={<WorkspaceRoute><StockDetailPage /></WorkspaceRoute>} />
- Verify routing works: Navigate to /stock/RELIANCE

INTEGRATION POINTS:
- Add Watchlist to dashboard sidebar or widget area
- Add link from EnhancedScreener to stock detail page
- Add breadcrumb navigation

TESTING CHECKLIST:
☐ Dashboard loads without errors
☐ EnhancedScreener visible and functional
☐ Can search stocks in screener
☐ Stock detail page accessible via /stock/SYMBOL
☐ Live quote updates every 5 seconds
☐ Bid-ask displays correctly
☐ Color coding works (green/red)
☐ Source indicator shows provider name
☐ Cached label shows when appropriate
☐ Watchlist displays, can add/remove
☐ Watchlist persists after reload
☐ No console errors
☐ TypeScript compiles without errors

PERFORMANCE TARGETS:
- Dashboard load: < 2 seconds (with cache)
- Stock detail load: < 500ms (with cache)
- Quote update: < 5s latency
- Watchlist render: < 100ms
- Cache hits: 5-10ms

CODE QUALITY:
- 100% TypeScript type safety
- Proper error handling
- Clean component structure
- Reusable hooks
- Follow existing code patterns
```

---

## PHASE 4 PROMPT - Advanced Data Features & Monitoring

**Session Start**: After Phase 3 completion  
**Token Budget**: 20-25k tokens  
**Success Criteria**: Network health monitoring + real-time trending + price validation

---

### PHASE 4 DETAILED PROMPT

```
CONTEXT:
Phase 3 complete: Dashboard, stock detail page, and watchlist are wired and working.
Now implementing Phase 4: Advanced features for robustness and user engagement.

YOUR MISSION:
Implement 4 advanced features:

FEATURE 1: Network Health Monitoring (4 hours)
──────────────────────────────────────────────
FILE: Create src/services/health/ProviderHealthMonitor.ts
PURPOSE: Track provider uptime, response times, and auto-deprioritize slow providers

REQUIREMENTS:
- Track metrics for each provider (yfinance, nselib, screener):
  * Success count, fail count, uptime %
  * Average response time (ms)
  * Last update timestamp
  * Current status (healthy/degraded/down)
  
- Logic:
  * Every successful fetch: increment success, record response time
  * Every failed fetch: increment fail, mark as degraded
  * Calculate uptime: successes / (successes + failures) * 100
  * Auto-deprioritize if uptime < 90% or avg response time > threshold
  
- Exposure:
  * Settings page: Show health dashboard
  * In dashboard: Small indicator showing provider status
  * Hoverable for details: uptime %, avg response time, last update
  
IMPLEMENTATION:
- Store metrics in localStorage (ProviderHealth[] array)
- Update metrics after every quote fetch
- Refresh view every 30 seconds
- Reset metrics daily at midnight

SUCCESS: Dashboard shows real-time provider health status


FEATURE 2: Multi-Provider Price Validation (3 hours)
───────────────────────────────────────────────────
FILE: Update src/clients/ProviderAggregator.ts
PURPOSE: Compare prices across providers and flag outliers

REQUIREMENTS:
- New method: validatePrice(symbol: string): Promise<PriceValidation>
- Returns: {price: number (median), providers: {yfinance, nselib, screener}, outliers: []}
- Logic:
  * Fetch from all 3 providers in parallel
  * Calculate median price
  * Flag prices > 1% away from median
  * Return median + provider breakdown + outlier list
  
- Example:
  Input: RELIANCE
  Output: {
    price: 3521.30 (median),
    providers: {
      yfinance: 3521.45,
      nselib: 3521.30,
      screener: 3520.99
    },
    outliers: []  // All within 1%
  }

IMPLEMENTATION:
- Use Promise.allSettled for parallel fetches
- Calculate median from successful results
- Validate against ±1% threshold
- Log any discrepancies for debugging

SUCCESS: Can validate prices across all providers, detects outliers


FEATURE 3: Real-Time WebSocket Trending (4 hours)
─────────────────────────────────────────────────
FILE: Create src/hooks/useTrendingStocks.ts (frontend)
FILE: Update backend to broadcast trending stocks (30 min)
PURPOSE: Show trending stocks with live updates

BACKEND SETUP (30 min):
- Endpoint: /api/ws/trending
- Broadcast every 30 seconds: Top 10 trending stocks
- Payload: [{symbol, change%, volume, inMinutesUp}]
- Criteria: Highest volume + price change in last hour

FRONTEND (useTrendingStocks hook, 2 hours):
- Connect to WebSocket
- Handle connection/disconnect
- Auto-reconnect on failure
- Unsubscribe on unmount
- Return {trending: Stock[], loading: boolean, error: Error | null}

USAGE:
const { trending } = useTrendingStocks();
return trending.map(t => <TrendingItem stock={t} />)

SUCCESS: Dashboard shows trending stocks updating live


FEATURE 4: Cross-Tab Cache Sync (2 hours)
──────────────────────────────────────────
FILE: Update src/clients/BrowserCache.ts
PURPOSE: Sync cache across browser tabs

REQUIREMENTS:
- When one tab updates cache: notify all other tabs
- Mechanism: localStorage events
- All tabs show identical cache state

IMPLEMENTATION:
- On cache.set(): dispatch localStorage event
- Listen for storage events from other tabs
- On event: update local IndexedDB if newer
- Prevent infinite loops (track version)

SUCCESS: Update watchlist in Tab 1, Tab 2 sees it instantly
```

---

## PHASE 5 PROMPT - Screener.in Advanced Features

**Session Start**: After Phase 4 completion  
**Token Budget**: 25-30k tokens  
**Success Criteria**: Advanced screener with filters, formulas, and charting

---

### PHASE 5 DETAILED PROMPT

```
CONTEXT:
Phases 1-4 complete. Now building feature parity with screener.in.

YOUR MISSION:
Implement advanced screener features:

FEATURE 1: Advanced Filtering (4 hours)
──────────────────────────────────────
- Current: Basic filters (sector, P/E, quality)
- Add: P/B ratio, ROE, dividend yield, debt-to-equity, growth rate
- UI: Filter builder with AND/OR logic
- Save: Allow users to save filter presets
- Performance: Filter 8,500 stocks in < 500ms

FILE: src/components/AdvancedFilterBuilder.tsx
FILE: Update DataWarehouseService with new dimension queries


FEATURE 2: Formula Editor (3 hours)
────────────────────────────────
- Allow custom scoring formula
- Example: (ROE * 10) - (P/E / 20) + momentum
- Visual formula builder with autocomplete
- Backtest formula against historical data
- Show which stocks would have been winners using this formula

FILE: src/components/FormulaEditor.tsx
FILE: Create src/services/FormulaExecutor.ts


FEATURE 3: Technical Charting (4 hours)
──────────────────────────────────────
- Candlestick charts for price history
- Technical indicators: RSI, MACD, Bollinger Bands
- 1D, 5D, 1M, 3M, 1Y timeframes
- Interactive: hover for values, click to zoom, pan controls

LIBRARY: candlestick.js or recharts
FILE: src/components/PriceChart.tsx
FILE: Create src/services/ChartDataProvider.ts


FEATURE 4: Filter Templates (2 hours)
─────────────────────────────────────
- Pre-built filter templates:
  * "Value Stocks": Low P/E, high dividend yield
  * "Growth Stocks": High revenue growth, high momentum
  * "Quality Stocks": High ROE, low debt
  * "Emerging Stocks": Small cap, momentum
- Load from localStorage
- Create/edit/delete templates
- Share with community (optional)
```

---

## PHASE 6 PROMPT - Zerodha Integration & Portfolio Linking

**Session Start**: After Phase 5 completion  
**Token Budget**: 30-35k tokens  
**Success Criteria**: Real broker integration with live portfolio tracking

---

### PHASE 6 DETAILED PROMPT

```
CONTEXT:
All screener/data features complete. Now integrating with real brokers.

YOUR MISSION:
Implement real broker integration (Zerodha primary, Upstox fallback):

FEATURE 1: Zerodha OAuth Integration (5 hours)
──────────────────────────────────────────────
- Use Zerodha Connect OAuth flow
- Authenticate user without storing credentials
- Get access token for portfolio API calls

IMPLEMENTATION:
FILE: Create src/services/brokers/ZerodhaAuthService.ts
- OAuth callback URL: /auth/zerodha/callback
- Store access token in secure httpOnly cookie
- Token refresh logic

SUCCESS: User can click "Connect Zerodha", authenticate, and authorize


FEATURE 2: Real Portfolio Tracking (4 hours)
──────────────────────────────────────────────
- Fetch holdings from Zerodha API
- Display in Portfolio page with real data
- Show: Symbol, quantity, entry price, current price, P&L

FILE: Create src/services/brokers/ZerodhaPortfolioService.ts
API: GET /portfolio/holdings
Returns: [{symbol, quantity, entryPrice, currentPrice, pnl, pnlPercent}]

SUCCESS: Portfolio page shows real holdings from Zerodha


FEATURE 3: Live P&L Dashboard (3 hours)
──────────────────────────────────────
- Total portfolio value (updated every 5s)
- Total P&L in ₹ and %
- Daily P&L (today's gains/losses)
- Holdings breakdown by sector
- Interactive: click holdings for detail view

FILE: Update src/pages/PortfolioPage.tsx


FEATURE 4: Risk Metrics Dashboard (3 hours)
──────────────────────────────────────────
- Portfolio volatility
- Sharpe ratio
- Beta
- Correlation matrix
- Value at Risk (VaR)
- Max drawdown

FILE: Create src/components/RiskMetrics.tsx
Calculation: Use existing PortfolioOptimizationService


FEATURE 5: Upstox Fallback (3 hours)
────────────────────────────────────
- If Zerodha not connected: offer Upstox
- Same OAuth flow as Zerodha
- Same portfolio API interface

FILE: Create src/services/brokers/UpstoxPortfolioService.ts
Abstraction: BrokerService interface with Zerodha and Upstox implementations
```

---

## PHASE 7+ PROMPTS - Future Expansions

### Mobile App (Estimated 40-50 hours)
```
Technology: React Native
Scope: iOS + Android
Features: Same as web (screener, watchlist, portfolio, live quotes)
Server: Reuse backend APIs
```

### Community Features (Estimated 20-30 hours)
```
Features:
- User profiles & following
- Idea sharing & discussion
- Leaderboard (best traders)
- Live trading room
- Performance tracking (compare portfolios)
```

### Advanced Backtesting (Estimated 15-20 hours)
```
Features:
- Visual strategy builder
- Parameter optimization
- Walk-forward analysis
- Monte Carlo confidence intervals
- Sharpe/Sortino optimization
```

---

## MASTER PHASE TIMELINE

```
Phase 1: Browser API Offload     ✅ COMPLETE (20 hours)
Phase 2: Multi-Provider          ✅ COMPLETE (8 hours)
Phase 3: Dashboard Integration   ⏳ 2-3 hours remaining
Phase 4: Advanced Features       📋 4-6 hours
Phase 5: Advanced Screener       📋 6-8 hours
Phase 6: Broker Integration      📋 10-12 hours
Phase 7+: Mobile/Community       📋 40-100 hours

Total to "Feature Complete": ~32-45 hours
Total to "Production Ready": ~50-60 hours
Total to "Market Leader": ~100-150 hours
```

---

## HOW TO USE THESE PROMPTS

**For Phase 3** (Next Session):
```
Copy the PHASE 3 DETAILED PROMPT section above
Create new session with token budget: 20-25k
Start session with the prompt
You'll get implementation immediately
```

**For Phase 4, 5, 6**:
```
Follow same approach
Each phase is self-contained
Can be done in parallel or sequence
```

**Customization**:
- Adjust time estimates based on your speed
- Modify features based on user feedback
- Reorder phases if priorities change
- Skip phases if time is constrained

---

**Ready for Phase 3?** Copy the prompt and use in a fresh session!

