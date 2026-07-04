/**
 * Zerodha OAuth2 Integration for portfolio tracking
 */

export interface ZerodhaConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

export interface ZerodhaAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  requestToken?: string;
}

export interface ZerodhaHolding {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  value: number;
  sector?: string;
}

export interface ZerodhaPortfolio {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdings: ZerodhaHolding[];
  cash: number;
  updatedAt: number;
}

export interface PortfolioMetrics {
  volatility: number;
  sharpeRatio: number;
  beta: number;
  maxDrawdown: number;
  valueAtRisk: number; // VaR 95%
  cumulativeReturns: number;
}

export class ZerodhaService {
  private config: ZerodhaConfig | null = null;
  private authToken: ZerodhaAuthToken | null = null;
  private readonly STORAGE_KEY_TOKEN = 'prediction-engine:zerodha-token';
  private readonly STORAGE_KEY_CONFIG = 'prediction-engine:zerodha-config';
  private readonly API_BASE = 'https://api.kite.trade';

  constructor(config?: ZerodhaConfig) {
    if (config) {
      this.config = config;
      this.persistConfig();
    } else {
      this.loadConfig();
    }
    this.loadToken();
  }

  /**
   * Initialize OAuth flow
   * Redirect user to Zerodha login
   */
  initiateOAuth(): string {
    if (!this.config) {
      throw new Error('Zerodha config not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUrl,
      response_type: 'code',
      state: this.generateState(),
    });

    return `https://kite.zerodha.com/connect/login?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and get access token
   */
  async handleOAuthCallback(code: string): Promise<boolean> {
    if (!this.config) {
      throw new Error('Zerodha config not initialized');
    }

    try {
      const response = await fetch(`${this.API_BASE}/session/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_key: this.config.clientId,
          request_token: code,
          checksum: this.generateChecksum(code, this.config.clientSecret),
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.statusText}`);
      }

      const data = await response.json() as { data?: { access_token: string } };
      if (data.data?.access_token) {
        this.authToken = {
          accessToken: data.data.access_token,
          expiresAt: Date.now() + 86400000, // 24 hours
          requestToken: code,
        };
        this.persistToken();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ZerodhaService] OAuth callback failed:', error);
      return false;
    }
  }

  /**
   * Fetch portfolio holdings from Zerodha
   */
  async getPortfolio(): Promise<ZerodhaPortfolio | null> {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.API_BASE}/portfolio/holdings`, {
        headers: { Authorization: `Bearer ${this.authToken.accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
        }
        return null;
      }

      const data = await response.json() as { data?: any[] };
      if (!data.data) return null;

      const holdings: ZerodhaHolding[] = data.data.map((h: any) => ({
        symbol: h.tradingsymbol,
        quantity: h.quantity,
        entryPrice: h.average_price,
        currentPrice: h.last_price,
        pnl: (h.last_price - h.average_price) * h.quantity,
        pnlPercent: ((h.last_price - h.average_price) / h.average_price) * 100,
        value: h.last_price * h.quantity,
      }));

      const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
      const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
      const totalPnlPercent = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;

      return {
        totalValue,
        totalPnl,
        totalPnlPercent,
        holdings,
        cash: 0,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error('[ZerodhaService] Failed to fetch portfolio:', error);
      return null;
    }
  }

  /**
   * Calculate portfolio risk metrics
   */
  calculateMetrics(portfolio: ZerodhaPortfolio): PortfolioMetrics {
    const holdings = portfolio.holdings;

    // Volatility (simple implementation using price variance)
    const volatility = this.calculateVolatility(holdings);

    // Sharpe Ratio (simplified: return / volatility)
    const sharpeRatio = volatility > 0 ? (portfolio.totalPnlPercent / 100) / volatility : 0;

    // Beta (simplified: sector correlation)
    const beta = 1.0; // TODO: Calculate from historical data

    // Max Drawdown (simplified)
    const maxDrawdown = Math.min(...holdings.map(h => -h.pnlPercent)) / 100;

    // Value at Risk (95% confidence)
    const var95 = portfolio.totalValue * 0.05;

    return {
      volatility,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      beta,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      valueAtRisk: Math.round(var95),
      cumulativeReturns: portfolio.totalPnlPercent,
    };
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.authToken && this.authToken.expiresAt > Date.now());
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.authToken = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY_TOKEN);
    } catch (error) {
      console.error('[ZerodhaService] Failed to clear auth:', error);
    }
  }

  /**
   * Generate random state for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate checksum for OAuth
   */
  private generateChecksum(requestToken: string, secret: string): string {
    // Simplified checksum - should use proper SHA256 in production
    const combined = `${requestToken}${secret}`;
    return btoa(combined); // Use btoa instead of Buffer for browser compatibility
  }

  /**
   * Calculate portfolio volatility
   */
  private calculateVolatility(holdings: ZerodhaHolding[]): number {
    if (holdings.length === 0) return 0;

    const pnlPercents = holdings.map(h => h.pnlPercent);
    const mean = pnlPercents.reduce((a, b) => a + b, 0) / pnlPercents.length;
    const variance = pnlPercents.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / pnlPercents.length;

    return Math.sqrt(variance) / 100;
  }

  /**
   * Persist token to localStorage
   */
  private persistToken() {
    try {
      if (this.authToken) {
        localStorage.setItem(this.STORAGE_KEY_TOKEN, JSON.stringify(this.authToken));
      }
    } catch (error) {
      console.error('[ZerodhaService] Failed to persist token:', error);
    }
  }

  /**
   * Load token from localStorage
   */
  private loadToken() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_TOKEN);
      if (stored) {
        const token = JSON.parse(stored) as ZerodhaAuthToken;
        if (token.expiresAt > Date.now()) {
          this.authToken = token;
        } else {
          localStorage.removeItem(this.STORAGE_KEY_TOKEN);
        }
      }
    } catch (error) {
      console.error('[ZerodhaService] Failed to load token:', error);
    }
  }

  /**
   * Persist config to localStorage
   */
  private persistConfig() {
    try {
      if (this.config) {
        localStorage.setItem(this.STORAGE_KEY_CONFIG, JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('[ZerodhaService] Failed to persist config:', error);
    }
  }

  /**
   * Load config from localStorage
   */
  private loadConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CONFIG);
      if (stored) {
        this.config = JSON.parse(stored) as ZerodhaConfig;
      }
    } catch (error) {
      console.error('[ZerodhaService] Failed to load config:', error);
    }
  }
}

export const zerodhaService = new ZerodhaService();
