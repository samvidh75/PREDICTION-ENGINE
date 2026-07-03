# Phase 3: Dashboard Integration & Advanced Features

## Current Status
- ✅ Phase 2 Complete: All 3 data providers (yfinance, NSE, screener.in) ready
- ✅ Build Verified: TypeScript compilation successful, zero errors
- ⏳ Phase 3: Integration & Advanced Features (next)

---

## Phase 3 Timeline & Priority

### Quick Wins (1-2 hours, High Impact)
These should be done first to make Phase 2 visible in the app.

**Task 1: Add EnhancedScreener to Dashboard** (30 min)
- Location: `src/pages/DashboardPage.tsx`
- Action: Import `EnhancedScreener` and add to dashboard grid
- Impact: Users see live stock screener with real prices
- Code:
  ```typescript
  import { EnhancedScreener } from '@/components/EnhancedScreener';
  
  export function DashboardPage() {
    return (
      <div>
        {/* existing dashboard content */}
        <EnhancedScreener />
      </div>
    );
  }
  ```

**Task 2: Create Stock Detail Page** (45 min)
- Location: `src/pages/StockDetailPage.tsx` (new)
- Action: Create page that shows live quote for a symbol
- Hook: `useQuote(symbol, 5000)` auto-refreshes every 5 seconds
- Display:
  - Company name + logo
  - Current price (₹)
  - Change % (green/red)
  - Volume (M)
  - 52-week high/low
  - Data source indicator
  - Refresh button
- Code Template:
  ```typescript
  import { useQuote } from '@/hooks/useQuote';
  
  export function StockDetailPage({ symbol }: { symbol: string }) {
    const { quote, loading, error, refresh } = useQuote(symbol, 5000);
    
    if (!quote) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    
    return (
      <div>
        <h1>{quote.symbol}</h1>
        <p>Price: ₹{quote.price.toFixed(2)}</p>
        <p style={{ color: quote.changePercent >= 0 ? 'green' : 'red' }}>
          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
        </p>
        <p>Volume: {(quote.volume / 1e6).toFixed(1)}M</p>
        <p>Source: {quote.source} {quote.cached && '(cached)'}</p>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }
  ```

**Task 3: Create Watchlist Component** (30 min)
- Location: `src/components/Watchlist.tsx` (new)
- Action: useQuotes hook + localStorage persistence
- Features:
  - Show top 5 symbols with live prices
  - Add/remove symbols
  - localStorage.getItem('watchlist') on mount
  - localStorage.setItem('watchlist', symbols) on change
- Storage key: `'prediction-engine:watchlist'`
- Code Template:
  ```typescript
  import { useState, useEffect } from 'react';
  import { useQuotes } from '@/hooks/useQuote';
  
  export function Watchlist() {
    const [symbols, setSymbols] = useState<string[]>(() => {
      const saved = localStorage.getItem('prediction-engine:watchlist');
      return saved ? JSON.parse(saved) : ['RELIANCE', 'TCS', 'INFY', 'WIPRO', 'HDFC'];
    });
    
    const { quotes } = useQuotes(symbols, 5000);
    
    useEffect(() => {
      localStorage.setItem('prediction-engine:watchlist', JSON.stringify(symbols));
    }, [symbols]);
    
    return (
      <div>
        {Array.from(quotes.values()).map(q => (
          <WatchlistItem key={q.symbol} quote={q} onRemove={() => ...} />
        ))}
      </div>
    );
  }
  ```

---

## Advanced Features (Phase 3B, 2-3 hours)
After integration tasks, tackle these for robustness.

**Feature 1: Multi-Provider Price Validation**
- Track prices from all 3 providers simultaneously
- Compute median price
- Flag outliers (>1% deviation)
- Location: `src/clients/ProviderAggregator.ts`, method `validateAndMedianPrice()`
- Implementation:
  ```typescript
  async validateAndMedianPrice(symbols: string[]): Promise<ValidationResult> {
    // Fetch from all 3 providers concurrently
    // Return { prices, outliers: [{symbol, yfinance, nselib, screener}] }
  }
  ```

**Feature 2: Network Health Monitoring**
- Track provider uptime + response times
- Auto-deprioritize slow providers
- Display in dashboard diagnostics
- Metrics to track:
  - YFinance: avg response time, uptime %
  - NSE: avg response time, endpoint availability
  - Screener: avg response time, parse success %
- Implementation:
  ```typescript
  interface ProviderHealth {
    name: string;
    uptime: number;
    avgResponseTime: number;
    lastChecked: number;
  }
  ```

**Feature 3: Real-Time WebSocket (Trending Stocks)**
- Backend: broadcast trending stocks every 30 seconds
- Client: subscribe to WebSocket, update UI
- Location: `src/hooks/useTrendingStocks.ts` (new)
- Hook usage:
  ```typescript
  const { trending, loading } = useTrendingStocks();
  // Returns: [{symbol, change%, volume}]
  ```

**Feature 4: Cache Sync Across Browser Tabs**
- Use `localStorage` events to sync IndexedDB changes
- When one tab updates cache, all tabs get notification
- Location: `src/clients/BrowserCache.ts`, method `enableCrossTabSync()`
- Implementation:
  ```typescript
  window.addEventListener('storage', (e) => {
    if (e.key === 'prediction-engine:quote-updated') {
      // Refresh cache for symbol from IndexedDB
    }
  });
  ```

---

## Integration Points

### 1. Dashboard (DashboardPage.tsx)
```
Header
├─ Portfolio Overview
├─ EnhancedScreener (NEW - from Phase 2)
├─ Watchlist Widget (NEW - Task 3)
└─ Market Alerts
```

### 2. Stock Detail Route
```
/stocks/:symbol → StockDetailPage (NEW - Task 2)
├─ Live quote (useQuote hook)
├─ 52-week chart
├─ Technical indicators
├─ News feed
└─ Related stocks
```

### 3. Sidebar Navigation
```
Market
├─ Screener
├─ Stock Detail ← NEW route
├─ Watchlist ← NEW sidebar widget
├─ Trending (WebSocket-powered)
└─ Portfolio
```

---

## Implementation Order (Recommended)

1. **Day 1 Morning**: Task 1 (Dashboard integration) + Task 2 (Stock detail) — **1 hour**
2. **Day 1 Afternoon**: Task 3 (Watchlist) + wire routing — **45 min**
3. **Day 2**: Advanced features (health monitoring, WebSocket) — **2 hours**
4. **Day 3**: Performance tuning + final testing — **1 hour**

**Total**: ~5 hours to Phase 3 complete

---

## File Dependencies

```
src/
├─ hooks/
│  ├─ useQuote.ts (existing) ← use in detail page & watchlist
│  └─ useTrendingStocks.ts (new - advanced feature)
├─ clients/
│  ├─ ProviderAggregator.ts (existing) ← update validateAndMedianPrice
│  └─ HealthMonitor.ts (new - advanced feature)
├─ components/
│  ├─ EnhancedScreener.tsx (existing from Phase 2)
│  ├─ Watchlist.tsx (new - Task 3)
│  └─ ProviderHealthIndicator.tsx (new - advanced feature)
└─ pages/
   ├─ DashboardPage.tsx (update - Task 1)
   └─ StockDetailPage.tsx (new - Task 2)
```

---

## Testing Checklist

### Task 1: Dashboard Integration
- [ ] EnhancedScreener renders on dashboard
- [ ] Live prices update every 5 seconds
- [ ] Cache restores on page reload
- [ ] Add/remove symbols works
- [ ] Filters work (sector, P/E, quality)

### Task 2: Stock Detail Page
- [ ] Navigate to `/stocks/RELIANCE`
- [ ] Quote displays correctly
- [ ] Price auto-refreshes every 5s
- [ ] Change % shows correct color (green/red)
- [ ] Source indicator shows provider name
- [ ] Manual refresh button works
- [ ] Back button returns to dashboard

### Task 3: Watchlist
- [ ] Default 5 symbols load
- [ ] Prices update live
- [ ] Add symbol via prompt
- [ ] Remove symbol via button
- [ ] localStorage persists on reload
- [ ] Refresh all button works

### Advanced Features
- [ ] Multi-provider prices match (within 1%)
- [ ] Health dashboard shows provider stats
- [ ] WebSocket receives trending updates
- [ ] Cache syncs across multiple browser tabs

---

## Token Budget for Phase 3

| Task | Estimated Tokens | Status |
|------|-------------------|--------|
| Task 1: Dashboard integration | 3k | Ready to implement |
| Task 2: Stock detail page | 4k | Ready to implement |
| Task 3: Watchlist component | 3k | Ready to implement |
| Feature 1: Price validation | 2k | Ready to implement |
| Feature 2: Health monitoring | 3k | Ready to implement |
| Feature 3: WebSocket trending | 4k | Ready to implement |
| Feature 4: Cache sync tabs | 2k | Ready to implement |
| **Total Phase 3** | **~21k** | ⏳ Needs new session |
| Current budget remaining | ~10k | ❌ Insufficient |

### Recommendation
Phase 3 requires a fresh 200k-token session to complete Tasks 1-3 + Advanced Features. Current budget (~10k) covers only the first integration task.

---

## What's Production-Ready NOW (Phase 2)

✅ **EnhancedScreener** — Full screener UI with live quotes
✅ **useQuote hooks** — Single + batch quote fetching
✅ **ProviderAggregator** — Multi-provider with fallback
✅ **All 3 data providers** — YFinance, NSE, Screener.in
✅ **IndexedDB caching** — TTL-based with browser persistence
✅ **TypeScript types** — 100% type-safe

### Ready to Ship
```typescript
// Use in any component:
import { useQuotes } from '@/hooks/useQuote';

const { quotes } = useQuotes(['RELIANCE', 'TCS'], 5000);
quotes.forEach(q => console.log(q.symbol, q.price));
```

---

## Next Session Action Items

When starting a fresh Phase 3 session:

1. Import PHASE_2_COMPLETE.md for context
2. Start with Task 1 (Dashboard integration) — highest impact
3. Follow implementation order above
4. Verify each task with manual testing
5. Commit after each major task

---

## Success Metrics (Phase 3 Complete)

- [ ] Users can see live stock quotes on dashboard
- [ ] Click any symbol → see detailed live price
- [ ] Watchlist persists across sessions
- [ ] All 3 data providers working (with fallback)
- [ ] <5% cache miss rate
- [ ] <500ms p95 latency for quote fetches
- [ ] Zero production errors in console

---

**Phase 2 Status**: ✅ COMPLETE  
**Phase 3 Status**: 📋 READY TO IMPLEMENT  
**Estimated Phase 3 Time**: 5 hours (with 200k tokens)

---

Next: Request new session with 200k tokens to implement Phase 3 (Dashboard → Stock Detail → Watchlist → Advanced Features)
