import crypto from 'node:crypto';
import { UpstoxConfig } from './UpstoxConfig';
import { UpstoxTokenStore } from './UpstoxTokenStore';
import { UpstoxAuthError, sanitizeErrorMessage } from './UpstoxErrors';
import type { UpstoxConfigSummary } from './UpstoxTypes';

const AUTH_DIALOG_URL = 'https://api.upstox.com/v2/login/authorization/dialog';
const TOKEN_URL = 'https://api.upstox.com/v2/login/authorization/token';

export interface AuthUrlResult {
  authUrl: string;
  state: string;
}

export interface CallbackResult {
  status: 'accepted' | 'rejected';
  message: string;
  receivedAt: string;
}

function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export class UpstoxOAuthService {
  private config: UpstoxConfig;
  private tokenStore: UpstoxTokenStore;

  constructor(config?: UpstoxConfig, tokenStore?: UpstoxTokenStore) {
    this.config = config ?? UpstoxConfig.getInstance();
    this.tokenStore = tokenStore ?? UpstoxTokenStore.getInstance();
  }

  buildAuthorizationUrl(): AuthUrlResult {
    const apiKey = this.config.apiKey;
    const redirectUri = this.config.getRedirectUri();
    if (!apiKey) throw new UpstoxAuthError('UPSTOX_API_KEY not configured', 'missing_api_key');
    if (!redirectUri) throw new UpstoxAuthError('UPSTOX_REDIRECT_URI not configured', 'missing_redirect_uri');

    const state = generateState();
    const params = new URLSearchParams({
      client_id: apiKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });
    const authUrl = `${AUTH_DIALOG_URL}?${params.toString()}`;
    return { authUrl, state };
  }

  async exchangeCodeForToken(code: string, expectedState?: string): Promise<CallbackResult> {
    if (!code) {
      return { status: 'rejected', message: 'Missing authorization code', receivedAt: new Date().toISOString() };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const apiKey = this.config.apiKey;
      const clientSecret = this.config.clientSecret;
      const redirectUri = this.config.getRedirectUri();
      if (!apiKey || !clientSecret || !redirectUri) {
        return { status: 'rejected', message: 'Upstox client credentials not configured', receivedAt: new Date().toISOString() };
      }
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: apiKey,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.access_token) {
        this.tokenStore.setLiveToken(data.access_token, {
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
          userId: data.user_id,
        });
        return {
          status: 'accepted',
          message: 'Access token received and accepted',
          receivedAt: new Date().toISOString(),
        };
      }

      const safeError = sanitizeErrorMessage(data.message || data.error || `HTTP ${response.status}`);
      return {
        status: 'rejected',
        message: `Token exchange failed: ${safeError}`,
        receivedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { status: 'rejected', message: 'Token exchange timed out', receivedAt: new Date().toISOString() };
      }
      const safeError = sanitizeErrorMessage(err?.message || String(err));
      return { status: 'rejected', message: `Token exchange error: ${safeError}`, receivedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }

  getConfigSummary(): UpstoxConfigSummary {
    return this.config.getSummary();
  }

  getStatus(): {
    configured: boolean;
    tokenPresent: boolean;
    tokenExpiry: string | null;
    sandboxEnabled: boolean;
    sandboxTokenPresent: boolean;
    marketDataEnabled: boolean;
    orderSandboxEnabled: boolean;
  } {
    const summary = this.config.getSummary();
    const tokenStatus = this.tokenStore.getTokenStatus();
    return {
      configured: summary.hasApiKey && summary.hasClientSecret,
      tokenPresent: tokenStatus.live.present,
      tokenExpiry: tokenStatus.live.expiresAt ? new Date(tokenStatus.live.expiresAt).toISOString() : null,
      sandboxEnabled: summary.sandboxEnabled,
      sandboxTokenPresent: tokenStatus.sandbox.present,
      marketDataEnabled: summary.marketDataEnabled,
      orderSandboxEnabled: summary.orderSandboxEnabled,
    };
  }
}
