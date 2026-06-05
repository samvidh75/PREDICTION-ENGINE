# Upstox Integration Plan — TRACK-7H

**Generated:** 2026-06-05T15:21:29.469Z

---

## Executive Summary

This document outlines the architecture for integrating Upstox broker connectivity into StockStory as a read-only portfolio intelligence source. StockStory already has a portfolio module (manual holdings) — this integration will add automated portfolio ingestion from Upstox via OAuth.

**Critical constraint:** This is strictly read-only. No order placement, buy/sell execution, trade routing, or broker actions. Only portfolio ingestion and StockStory analysis.

---

## 1. Current Architecture Review

### 1.1 Provider Layer

StockStory's provider layer follows a chain-of-responsibility pattern through `ProviderCoordinator`:

| Provider | Category | Status |
|:---------|:---------|:-------|
| YahooProvider | Price, Metadata, Historical | ✅ Active (v8 chart API) |
| FinnhubProvider | Metadata, Financials, News | ✅ Active (API key required) |
| IndianMarketProvider | Price, Historical | ✅ Active |
| AlphaVantageProvider | Price, Historical | ⚠️ Optional (API key) |
| GoogleNewsRssProvider | News | ✅ Active |

**Key insight:** All existing providers are market-data focused. A new provider type — **BrokerProvider** — is needed for portfolio data ingestion.

### 1.2 Authentication Layer

StockStory uses Firebase Authentication (Google sign-in) via `AuthContext.tsx`:

- `AuthProvider` wraps the app
- `onAuthStateChanged` listener manages session
- `sessionStore.ts` persists auth to localStorage
- `AuthStateLogger.ts` provides structured auth diagnostics

**Key insight:** The existing auth is **user identity** (who you are). Upstox requires **delegated authorization** (what StockStory can access on your behalf). These are complementary — Firebase for StockStory login, Upstox OAuth for broker access.

### 1.3 Portfolio Module

Existing portfolio infrastructure:

| File | Purpose | Maturity |
|:-----|:--------|:---------|
| `PortfolioEngine.ts` | CRUD for manual holdings, localStorage persistence | Production |
| `PortfolioHealthEngine.ts` | Basic health scoring (concentration + vol + drawdown) | Production |
| `PortfolioRiskEngine.ts` | Risk analysis (weakest holding, concentration) | Production |
| `PortfolioSnapshotFactory.ts` | Aggregate portfolio view factory | Production |
| `PortfolioAnalyticsEngine.ts` | Sector weight calculation | Production |
| `PortfolioPerformanceEngine.ts` | Performance evaluation | Production |
| `PortfolioPage.tsx` | Manual add/edit/CSV import UI | Production |

**Key insight:** The portfolio module is well-structured for manual holdings. The broker integration needs to bridge broker-imported data into this existing model.

### 1.4 Gap Analysis

| Capability | Current State | Required for TRACK-7H |
|:-----------|:--------------|:----------------------|
| Broker OAuth | ❌ None — only Firebase Google sign-in | ✅ Upstox OAuth 2.0 Authorization Code flow |
| Token management | ❌ None | ✅ Access token + refresh token + expiry tracking |
| Portfolio import | ❌ Manual entry only | ✅ Automated fetch from Upstox API |
| Position normalization | ❌ Manual sectors | ✅ NSE/BSE symbol mapping + ISIN resolution |
| Broker abstraction | ❌ None | ✅ BrokerProvider interface + UpstoxProvider |
| Portfolio intelligence | ⚠️ Basic health/risk | ✅ Weighted health score + sector concentration + diversification |

---

## 2. Architecture Design

### 2.1 New Module Structure

```
src/services/brokers/
  BrokerProvider.ts          ← Interface (abstraction layer)
  UpstoxProvider.ts           ← Upstox implementation
  UpstoxOAuth.ts              ← OAuth flow + token management
  TokenStore.ts               ← Secure token persistence
  PortfolioIngestionEngine.ts ← Converts broker data → PortfolioSnapshot

src/services/portfolio/
  PortfolioIntelligenceEngine.ts  ← NEW: Weighted health, risk, diversification
  PortfolioExplanationEngine.ts   ← NEW: Explainability layer
```

### 2.2 Data Flow

```
User clicks "Connect Upstox"
    ↓
UpstoxOAuth.initiate() → Redirect to Upstox authorization page
    ↓
User authorizes → Upstox redirects back with auth code
    ↓
UpstoxOAuth.exchangeCode(code) → accessToken + refreshToken
    ↓
TokenStore.save(tokens) → Secure localStorage
    ↓
UpstoxProvider.getPortfolio(tokens) → Upstox API: holdings + positions + funds
    ↓
PortfolioIngestionEngine.normalize(upstoxData) → PortfolioPosition[], PortfolioSnapshot
    ↓
PortfolioIntelligenceEngine.evaluate(snapshot) → Health Score, Risk Score, etc.
    ↓
PortfolioExplanationEngine.explain(scores) → Natural language insights
```

### 2.3 Upstox API Endpoints Used

| Endpoint | Method | Purpose | Read-Only? |
|:---------|:-------|:--------|:-----------|
| `/v2/user/profile` | GET | User profile + KYC status | ✅ Read |
| `/v2/portfolio/short-term-positions` | GET | Current positions | ✅ Read |
| `/v2/portfolio/long-term-holdings` | GET | Delivery holdings | ✅ Read |
| `/v2/portfolio/positions` | GET | Combined positions | ✅ Read |
| `/v2/user/funds-and-margin` | GET | Available balance | ✅ Read |
| `/v2/order/history` | GET | Past orders (optional) | ✅ Read |

**NO write endpoints.** No `/v2/order/place`, `/v2/order/modify`, or `/v2/order/cancel`.

### 2.4 OAuth Configuration

| Parameter | Value | Notes |
|:----------|:------|:------|
| Grant type | Authorization Code | Standard OAuth 2.0 |
| Authorization URL | `https://api.upstox.com/v2/login/authorization/dialog` | |
| Token URL | `https://api.upstox.com/v2/login/authorization/token` | |
| Redirect URI | `https://stockstory.in/broker/upstox/callback` | Must be registered in Upstox developer console |
| Scopes | `read_portfolio`, `read_user_profile` | Minimal permissions |
| Client ID | From Upstox developer dashboard | Stored in env vars |
| Client Secret | From Upstox developer dashboard | NEVER exposed client-side → proxy through backend |

### 2.5 Security Architecture

| Concern | Solution |
|:--------|:---------|
| Client Secret exposure | Proxy token exchange through StockStory backend endpoint `/api/upstox/token` |
| Token storage | Encrypted localStorage with auth-bound key |
| Token refresh | Automatic refresh before expiry; silent failure → re-auth prompt |
| CSRF protection | State parameter in OAuth flow; validated on callback |
| Session binding | Broker tokens tied to Firebase UID; cleared on logout |

---

## 3. Provider Comparison (Future Scalability)

| Feature | Upstox | Zerodha Kite | Angel One | Dhan |
|:--------|:-------|:-------------|:----------|:-----|
| OAuth 2.0 | ✅ Authorization Code | ✅ Request Token flow | ✅ OAuth 2.0 | ✅ OAuth 2.0 |
| Portfolio API | ✅ Holdings + Positions | ✅ Holdings + Positions | ✅ | ✅ |
| Historical orders | ✅ | ✅ | ✅ | ✅ |
| Live quotes | ✅ WebSocket | ✅ WebSocket | ✅ | ✅ |
| API rate limits | 10/sec | 10/sec | — | — |
| Indian market focus | ✅ NSE, BSE, MCX | ✅ NSE, BSE, MCX | ✅ | ✅ |

All major Indian brokers expose similar portfolio data. The `BrokerProvider` interface is designed to be generic enough to support any of these with provider-specific implementations.

---

## 4. Implementation Phases

| Phase | Deliverable | Dependencies |
|:------|:------------|:-------------|
| 1 | Connectivity Audit + Integration Plan | None (this document) |
| 2 | Upstox OAuth Implementation | Firebase Auth |
| 3 | Portfolio Import Engine | OAuth tokens |
| 4 | Portfolio Normalization | MasterCompanyRegistry |
| 5 | Portfolio Health Engine | Portfolio Import |
| 6 | Portfolio Explainability | Health Engine |
| 7 | Broker Abstraction Layer | UpstoxProvider |
| 8 | Validation + Final Report | All preceding phases |

---

## 5. Success Metrics

| Metric | Target |
|:-------|:-------|
| OAuth connection success rate | > 95% |
| Portfolio import time (100 holdings) | < 5 seconds |
| Symbol resolution accuracy | > 98% |
| Health score differentiation (σ) | > 8 points across users |
| Risk score differentiation (σ) | > 10 points across users |
| No broken OAuth states | Zero state corruption |
| No sensitive data in logs | Zero keys/secrets printed |

