# Quick Start: Phase 3 Implementation

**Status**: Phase 2 complete ✅ | Phase 3 ready to implement | ~10k tokens remaining (need fresh 200k session)

---

## TL;DR for Next Session

### What Works Now (Phase 2)
```typescript
// Import these — they work with all 3 data providers
import { useQuote, useQuotes } from '@/hooks/useQuote';
import { EnhancedScreener } from '@/components/EnhancedScreener';

// Live quotes with auto-refresh
const { quote } = useQuote('RELIANCE', 5000); // ₹3,521.45, +2.15%, cached

// Batch quotes (10 symbols in parallel)
const { quotes } = useQuotes(['RELIANCE', 'TCS', 'INFY'], 5000);

// Demo component (copy to dashboard)
<EnhancedScreener /> // Full screener UI with filters + live table
```

### What to Build (Phase 3 - 3 Tasks)

**Task 1: Dashboard Integration** (30 min)
```typescript
// src/pages/DashboardPage.tsx
import { EnhancedScreener } from '@/components/EnhancedScreener';

export function DashboardPage() {
  return (
    <>
      {/* existing content */}
      <EnhancedScreener />
    </>
  );
}
```

**Task 2: Stock Detail Page** (45 min)
```typescript
// src/pages/StockDetailPage.tsx (new file)
import { useQuote } from '@/hooks/useQuote';

export function StockDetailPage({ symbol }: { symbol: string }) {
  const { quote, loading, error, refresh } = useQuote(symbol, 5000);
  
  if (!quote) return <LoadingState />;
  
  return (
    <div>
      <h1>{quote.symbol}</h1>
      <p>Price: ₹{quote.price.toFixed(2)}</p>
      <p style={{ color: quote.changePercent >= 0 ? 'green' : 'red' }}>
        {quote.changePercent.toFixed(2)}%
      </p>
      <p>Volume: {(quote.volume / 1e6).toFixed(1)}M</p>
      <p>Source: {quote.source} {quote.cached && '(cached)'}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

**Task 3: Watchlist** (30 min)
```typescript
// src/components/Watchlist.tsx (new file)
import { useState, useEffect } from 'react';
import { useQuotes } from '@/hooks/useQuote';

export function Watchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('prediction-engine:watchlist');
    return saved ? JSON.parse(saved) : ['RELIANCE', 'TCS', 'INFY'];
  });
  
  const { quotes } = useQuotes(symbols, 5000);
  
  useEffect(() => {
    localStorage.setItem('prediction-engine:watchlist', JSON.stringify(symbols));
  }, [symbols]);
  
  return (
    <div>
      <h3>Watchlist</h3>
      {Array.from(quotes.values()).map(q => (
        <div key={q.symbol}>
          {q.symbol}: ₹{q.price} ({q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%)
        </div>
      ))}
    </div>
  );
}
```

---

## Data Provider Configuration

### YFinance ✅ (Ready)
- Public CORS endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- No setup needed
- No API key required
- Supports: US (NASDAQ/NYSE) + Indian stocks (.NS suffix)

### NSE/jugasad (⏳ Optional Setup)
- Public endpoint: `https://api.jugasad.io/nse/quote/{symbol}`
- Works out of the box (no setup)
- Custom proxy: set `REACT_APP_NSE_PROXY_URL` env var if deploying own
- Example .env:
  ```
  REACT_APP_NSE_PROXY_URL=http://localhost:5000/nse
  ```

### Screener.in ✅ (Ready)
- No API key, no setup
- HTML scraping via lightweight fetch + regex
- Provides P/E, ROE, dividend yield

---

## Provider Fallback Chain

```
Request for RELIANCE
├─ Check IndexedDB cache (5-10ms if hit)
├─ Try YFinance (200-500ms)
│  └─ SUCCESS → return price + volume
│  └─ TIMEOUT → try next
├─ Try NSE (300-800ms)
│  └─ SUCCESS → return price + bid/ask
│  └─ TIMEOUT → try next
└─ Try Screener.in (1-2s)
   └─ SUCCESS → return price + fundamentals
   └─ FAILURE → return null, component shows "unavailable"
```

First provider to return within 5s timeout wins.

---

## Performance Targets (Phase 2 Baseline)

| Scenario | Measured | Target |
|----------|----------|--------|
| Single quote (cache) | 5-10ms | ✅ |
| Single quote (live) | 200-500ms | ✅ |
| 10 quotes (cached) | 50-100ms | ✅ |
| 10 quotes (live) | 500-800ms | ✅ |
| Auto-refresh (5s) | responsive | ✅ |

---

## File Structure (After Phase 3)

```
src/
├─ clients/
│  ├─ YFinanceClient.ts (existing ✅)
│  ├─ NSEClient.ts (existing ✅)
│  ├─ ScreenerClient.ts (existing ✅)
│  ├─ ProviderAggregator.ts (existing ✅)
│  └─ BrowserCache.ts (existing ✅)
├─ hooks/
│  └─ useQuote.ts (existing ✅)
├─ components/
│  ├─ EnhancedScreener.tsx (existing ✅)
│  └─ Watchlist.tsx (NEW - Task 3)
└─ pages/
   ├─ DashboardPage.tsx (UPDATE - Task 1)
   └─ StockDetailPage.tsx (NEW - Task 2)
```

---

## Build & Test

```bash
# Verify build (Phase 2)
npm run build
# → Should complete in ~840ms with zero errors

# Start dev server
npm run dev
# → Frontend runs on port 5174

# Test EnhancedScreener
# → Visit http://localhost:5174/quote-demo
# → Should show RELIANCE/TCS/INFY with live prices
# → Prices update every 5 seconds
```

---

## Remaining Features (Advanced, Phase 3B)

If token budget allows after Tasks 1-3:

1. **Price Validation**: Fetch from all 3 providers, compute median, flag outliers
2. **Health Monitoring**: Track provider uptime, response times, auto-deprioritize slow ones
3. **WebSocket Trending**: Real-time trending stocks broadcast from backend
4. **Cache Sync**: Sync IndexedDB across browser tabs via `localStorage` events

See PHASE_3_ROADMAP.md for detailed implementation guides.

---

## Troubleshooting

### Quote shows null
- Check browser console for errors
- Verify at least one provider is reachable (try manually: `curl https://api.jugasad.io/nse/quote/RELIANCE`)
- Check ENVs: `REACT_APP_NSE_PROXY_URL` if using custom endpoint

### Cache not persisting
- Check browser IndexedDB in DevTools
- Verify localStorage is enabled
- QuoteDemo & EnhancedScreener should show "(cached)" label after first fetch

### Slow performance
- Check network tab for provider latency
- 500-800ms for 5 quotes is normal (parallel fetches)
- First fetch slower (no cache), subsequent refreshes faster

---

## Next Session Checklist

- [ ] Read PHASE_3_ROADMAP.md for detailed implementation
- [ ] Import context from PHASE_2_COMPLETE.md
- [ ] Implement Task 1 (Dashboard integration)
- [ ] Implement Task 2 (Stock detail page)
- [ ] Implement Task 3 (Watchlist)
- [ ] Test each task manually
- [ ] Commit progress after each task
- [ ] If tokens remain: implement advanced features

---

**Status**: 🚀 Ready to ship Phase 3  
**Docs**: See PHASE_2_COMPLETE.md, PHASE_3_ROADMAP.md, API_CLIENT_ARCHITECTURE.md  
**Budget**: 10k tokens remaining in this session (Phase 3 needs 200k new session)
