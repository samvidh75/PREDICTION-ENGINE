# Portfolio UI Design Report — RC-UPSTOX-001

**Generated:** 2026-06-05T15:44:28.897Z

---

## UI Components Required

### 1. Connect Upstox Button
- **Location:** Portfolio page header, Settings page
- **States:** Not Connected → Connecting → Connected → Error
- **Interaction:** Opens OAuth popup/redirect → on return, shows "✅ Connected"

### 2. Connection Status Widget
- Shows: broker name, connection status, last sync timestamp
- States: Connected (green), Connecting (amber), Disconnected (grey), Error (red)
- Actions: Sync Now, Disconnect

### 3. Portfolio Overview Page
- **Summary Cards:** Total value, unrealized P&L, number of holdings, funds available
- **Holdings Table:** Symbol, quantity, avg price, last price, P&L%, sector
- **Sector Exposure Chart:** Doughnut chart — % allocation per sector
- **Health Gauge:** 0-100 health score with classification badge
- **Risk Radar:** Concentration, diversification, single-stock risk indicators

### 4. Portfolio Health Dashboard
- Health Score (large, 0-100)
- Sub-scores: Quality, Risk, Diversification
- Top 3 strongest / weakest holdings
- Largest position warning (>25% of portfolio)
- Sector concentration warnings
- Natural language explanation

---

## Design Constraints

| Rule | Enforcement |
|:-----|:------------|
| READ-ONLY | No Buy/Sell buttons, no order forms, no trade routing |
| Research-only language | "Analysis", "Health", "Insights" — never "Trade", "Execute", "Place Order" |
| No broker actions | Disconnect is the ONLY broker action |
| Clear data provenance | Every card shows source: "From Upstox" or "Manual entry" |

---

## Component Architecture

```
PortfolioPage.tsx
├── BrokerConnectionCard
│   ├── ConnectUpstoxButton
│   ├── ConnectionStatusBadge
│   └── LastSyncTimestamp
├── PortfolioSummaryCards
│   ├── TotalValueCard
│   ├── UnrealizedPnLCard
│   └── AvailableFundsCard
├── HoldingsTable
│   ├── HoldingRow (symbol, quantity, price, PnL, sector)
│   └── SortableHeader
├── SectorExposureChart
│   └── DoughnutChart
├── PortfolioHealthDashboard
│   ├── HealthScoreGauge
│   ├── SubScoreIndicators
│   └── ExplanationPanel
└── RiskAlerts
    ├── ConcentrationWarning
    ├── SectorWarning
    └── DiversificationTip
```

---

## User Flow

```
1. User visits Portfolio page
2. Sees "Connect Upstox" button (if not connected)
3. Clicks Connect → Upstox OAuth popup
4. Grants permission → redirected back
5. Shows "✅ Upstox Connected — syncing portfolio..."
6. Portfolio data loads → cards + table populate
7. Health dashboard updates with real data
8. User can click "Sync Now" to refresh
```

---

## States Covered

| State | UI |
|:------|:---|
| Not connected | "Connect Upstox" button + "Import your portfolio to get StockStory analysis" |
| Connecting | Spinner + "Connecting to Upstox..." |
| Connected, loading | Skeleton cards + "Syncing portfolio data..." |
| Connected, loaded | Full dashboard with real data |
| Token expired | "Reconnect Upstox" + refresh token auto-attempt |
| Error | Red banner with error message + retry button |
| Empty portfolio | "Your portfolio is empty — add holdings in Upstox" |
| Rate limited | "Syncing... (Upstox rate limit reached, retrying)" |

