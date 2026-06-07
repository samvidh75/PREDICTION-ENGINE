# Broker Architecture Report — TRACK-7H

**Generated:** 2026-06-05T15:21:29.489Z

---

## Abstraction Layer Architecture

```
Browser
  │
  ├── BrokerProvider (interface)
  │     ├── UpstoxProvider        ✅ Implemented (TRACK-7H)
  │     ├── ZerodhaProvider       🔮 Interface ready — no implementation
  │     ├── DhanProvider          🔮 Interface ready — no implementation
  │     └── AngelOneProvider      🔮 Interface ready — no implementation
  │
  └── TokenStore (persistence)
        └── Per-broker, per-UID encrypted localStorage

PortfolioIngestionEngine
  └── Normalizes broker data → StockStory PortfolioSnapshot

PortfolioIntelligenceEngine
  └── Scores snapshot → Health, Risk, Quality, Diversification

PortfolioExplanationEngine
  └── Scores → Plain English insights
```

---

## BrokerProvider Interface Contract

```typescript
interface BrokerProvider {
  readonly brokerName: string;
  
  // OAuth
  initiateAuth(redirectUri: string, state: string): Promise<string>;
  exchangeCode(code: string, redirectUri: string): Promise<BrokerAuthResult>;
  refreshAccessToken(refreshToken: string): Promise<BrokerAuthResult>;
  
  // Data
  getConnectionStatus(accessToken: string): Promise<ConnectionStatus>;
  getPortfolio(accessToken: string): Promise<BrokerPortfolio>;
  getHoldings(accessToken: string): Promise<PortfolioHolding[]>;
  getPositions(accessToken: string): Promise<PortfolioPosition[]>;
  getFunds(accessToken: string): Promise<BrokerFundSummary>;
  
  // Lifecycle
  disconnect(accessToken: string): Promise<void>;
}
```

---

## Adding a New Broker

To add a new broker (e.g., Zerodha):

1. Create `ZerodhaProvider.ts` implementing `BrokerProvider`
2. Create `ZerodhaOAuth.ts` for OAuth-specific logic
3. Register in `TokenStore` (already generic — works with any broker name)
4. Add OAuth callback route: `/broker/zerodha/callback`
5. Add UI card in `BrokerConnectPanel.tsx`
6. Deploy

**No changes required to:** PortfolioIngestionEngine, PortfolioIntelligenceEngine, PortfolioExplanationEngine, TokenStore, or the StockStory analysis pipeline.

---

## Scalability Properties

| Property | Design Choice | Rationale |
|:---------|:--------------|:----------|
| Add new broker | 1 file + UI card | Interface is generic |
| Token storage | Per-broker keys | No cross-broker conflicts |
| Portfolio merge | Ingestion engine handles | Aggregates by symbol |
| Multi-broker users | Separate tokens, merged portfolio | User can connect Upstox + Zerodha |
| API versioning | Provider-specific | Each broker can upgrade independently |
| Error isolation | Per-broker try/catch | One broker failure doesn't break others |

---

## Future: Trade Integration Readiness

The architecture is designed to support future order placement **without refactoring**:

```typescript
// Future interface extension (NOT IMPLEMENTED in TRACK-7H)
interface TradingProvider extends BrokerProvider {
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  modifyOrder(orderId: string, modification: OrderModification): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderBook(): Promise<Order[]>;
  getTradeHistory(): Promise<Trade[]>;
}
```

By extending `BrokerProvider`, trading functionality can be added to any broker without breaking existing portfolio intelligence code.

**This is not implemented in TRACK-7H. It is documented as a future capability.**

---

## Security Boundaries

| Layer | Data | Security |
|:------|:-----|:---------|
| Browser | Auth code, state | HTTPS + PKCE |
| StockStory Backend | Client secret, token exchange | Server-side only |
| localStorage | Encrypted access token | UID-bound + cleared on logout |
| API calls | Bearer token in header | HTTPS only |
| Logs | Broker name, UID, timestamps | NO tokens, NO PII in logs |

