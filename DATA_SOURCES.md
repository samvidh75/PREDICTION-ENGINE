# PSE Data Sources Integration

## Overview
The application integrates multiple free data sources for Philippine Stock Exchange (PSE) stock data with real-time WebSocket updates and fallbacks.

## Data Providers

### 1. **yfinance** (Primary)
- **Coverage**: Supports PSE stocks with `.PSE` suffix (e.g., `BDO.PSE`)
- **Rate Limit**: None for basic usage
- **Data**: Real-time quotes, historical OHLC
- **Reliability**: High
- **API Endpoint**: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/`

### 2. **Finnhub** (Fallback)
- **Coverage**: Global stocks including PSE
- **Rate Limit**: 60 API calls/minute (free tier)
- **Data**: Real-time quotes, fundamentals
- **API Token**: `c9b2bzqr01qu8b9fcch0` (public demo, rate-limited)
- **API Endpoint**: `https://finnhub.io/api/v1/quote`

### 3. **Mock Data** (Offline Fallback)
- Generated realistic OHLC data when online sources unavailable
- Deterministic based on symbol seed

## Real-Time Updates

### WebSocket Service
```typescript
import { webSocketService } from '@/services/data/WebSocketService';

// Connect to WebSocket server
await webSocketService.connect('ws://localhost:8080');

// Subscribe to price updates
const unsubscribe = webSocketService.subscribe('BDO', (update) => {
  console.log(`${update.symbol}: $${update.price} (${update.changePercent}%)`);
});

// Unsubscribe when done
unsubscribe();
```

## React Integration

### usePSERealtimeData Hook
```typescript
import { usePSERealtimeData } from '@/hooks/usePSERealtimeData';

function StockCard({ symbol }) {
  const { stock, loading, error } = usePSERealtimeData(symbol);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>{stock?.symbol}</h2>
      <p>Price: ${stock?.price}</p>
      <p>Change: {stock?.changePercent}%</p>
    </div>
  );
}
```

### usePSEMultipleRealtimeData Hook
```typescript
function StockList() {
  const { stocks, loading } = usePSEMultipleRealtimeData(['BDO', 'JFC', 'MER']);

  return (
    <div>
      {stocks.map(stock => (
        <div key={stock.symbol}>
          {stock.symbol}: ${stock.price}
        </div>
      ))}
    </div>
  );
}
```

## Supported PSE Tickers

```
BDO, JFC, MER, SM, AEV, PAL, TEL, GLOBE, SMC, AC, ALI, SMPH, RLC, SECB, BPI, UBP, PNB, UCPB
```

## Historical Data

### OHLC Data
```typescript
import { pseDataProvider } from '@/services/data/PSEDataProvider';

// Get 30 days of OHLC data
const ohlcData = await pseDataProvider.getHistoricalData('BDO', 30);

// Use with TradingView Lightweight Charts
<StockChart symbol="BDO" ohlcData={ohlcData} />
```

## Setup Instructions

### Backend WebSocket Server (Optional - for real-time data)

The production WebSocket server is already implemented in `server/websocket-server.js`. To run it:

1. **Install dependencies** (if not already done):
```bash
npm install
```

2. **Start the WebSocket server**:
```bash
npm run dev:websocket
```

Or manually:
```bash
PORT=8080 node server/websocket-server.js
```

3. **Connect from frontend** (automatic):
The React app automatically attempts to connect to `ws://localhost:8080` on startup.
If connection fails, the app falls back to REST API only.

### Server Configuration

The WebSocket server:
- Listens on port 8080 (configurable via `PORT` environment variable)
- Provides REST API endpoints for quotes and health checks
- Fetches stock data every 30 seconds
- Caches data for 5 minutes to reduce API calls
- Uses yfinance as primary provider, falls back to Finnhub

### Browser-side Integration

The app automatically:
1. Fetches initial stock data via REST API
2. Attempts WebSocket connection on load
3. Subscribes to real-time updates for viewed stocks
4. Falls back to REST API if WebSocket unavailable

No additional configuration needed on the frontend!

## Charts Integration

The application uses **TradingView Lightweight Charts** via the `StockChart` component:

```typescript
<StockChart
  symbol="BDO"
  ohlcData={ohlcData}
  timeframe="1M"
  showIndicators={true}
/>
```

## Rate Limiting & Caching

- **REST API**: 1-minute cache per symbol
- **WebSocket**: Real-time (no rate limit for receive)
- **Finnhub**: 60 calls/min (automatic fallback if exceeded)
- **yfinance**: No rate limit

## Free Data Source Alternatives

### Python-based (for backend enhancement):
```bash
pip install yfinance pandas-ta ta
```

### Free APIs:
- **IEX Cloud** (free tier: 100 messages/month)
- **Alpha Vantage** (free tier: 5 calls/min)
- **Twelve Data** (free tier: 800 calls/day)

## Troubleshooting

**WebSocket connection fails?**
- The app automatically falls back to REST API
- Check browser console for connection errors
- Ensure backend WebSocket server is running (if used)

**Stock data not updating?**
- Check browser network tab for failed API requests
- Verify PSE ticker format (e.g., `BDO`, not `BDO.PSE` in search)
- Check rate limits if using Finnhub

**Old data in cache?**
- Cache expires after 1 minute
- Hard refresh browser to clear JavaScript cache

## Performance Notes

- Initial load uses REST API (fast)
- WebSocket provides real-time updates (if connected)
- Multiple components can subscribe to same symbol (deduplicated)
- Historical data cached for 24 hours

## Future Enhancements

- [ ] Add Twelve Data integration
- [ ] Implement Redis caching for production
- [ ] Add data aggregation layer
- [ ] Support more PSE stocks beyond top 18
- [ ] Add options/derivatives data
