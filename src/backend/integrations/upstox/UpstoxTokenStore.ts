import type { TokenRecord, UpstoxMode } from './UpstoxTypes';
import { UpstoxTokenError, maskToken } from './UpstoxErrors';
import { UpstoxConfig } from './UpstoxConfig';

type TokenListener = (mode: UpstoxMode, status: 'stored' | 'cleared') => void;

export class UpstoxTokenStore {
  private static instance: UpstoxTokenStore;
  private liveToken: TokenRecord | null = null;
  private sandboxToken: TokenRecord | null = null;
  private listeners: TokenListener[] = [];

  static getInstance(): UpstoxTokenStore {
    if (!this.instance) {
      this.instance = new UpstoxTokenStore();
    }
    return this.instance;
  }

  static reset(): void {
    (this as any).instance = undefined;
  }

  onTokenChange(listener: TokenListener): void {
    this.listeners.push(listener);
  }

  private notify(mode: UpstoxMode, status: 'stored' | 'cleared'): void {
    for (const listener of this.listeners) {
      try { listener(mode, status); } catch { /* noop */ }
    }
  }

  getLiveToken(): string | null {
    return this.liveToken?.accessToken ?? null;
  }

  getLiveTokenRecord(): TokenRecord | null {
    return this.liveToken;
  }

  setLiveToken(token: string, options?: { refreshToken?: string; expiresAt?: number; userId?: string }): void {
    if (!token || token.length < 10) {
      throw new UpstoxTokenError('Invalid live token');
    }
    this.liveToken = {
      accessToken: token,
      refreshToken: options?.refreshToken,
      expiresAt: options?.expiresAt,
      mode: 'live',
      receivedAt: new Date().toISOString(),
      userId: options?.userId,
    };
    this.notify('live', 'stored');
  }

  getSandboxToken(): string | null {
    return this.sandboxToken?.accessToken ?? null;
  }

  setSandboxToken(token: string): void {
    if (!token || token.length < 10) {
      throw new UpstoxTokenError('Invalid sandbox token');
    }
    this.sandboxToken = {
      accessToken: token,
      mode: 'sandbox',
      receivedAt: new Date().toISOString(),
    };
    this.notify('sandbox', 'stored');
  }

  loadFromEnv(): void {
    const config = UpstoxConfig.getInstance();
    const liveToken = config.getLiveAccessToken();
    if (liveToken) {
      this.liveToken = {
        accessToken: liveToken,
        mode: 'live',
        receivedAt: new Date().toISOString(),
      };
    }
    const sandboxToken = config.getSandboxAccessToken();
    if (sandboxToken) {
      this.sandboxToken = {
        accessToken: sandboxToken,
        mode: 'sandbox',
        receivedAt: new Date().toISOString(),
      };
    }
  }

  getActiveToken(): string | null {
    const config = UpstoxConfig.getInstance();
    if (config.getSandboxEnabled()) {
      return this.getSandboxToken();
    }
    return this.getLiveToken();
  }

  getTokenStatus(): { live: { present: boolean; receivedAt: string | null; expiresAt: number | null }; sandbox: { present: boolean; receivedAt: string | null } } {
    return {
      live: {
        present: !!this.liveToken,
        receivedAt: this.liveToken?.receivedAt ?? null,
        expiresAt: this.liveToken?.expiresAt ?? null,
      },
      sandbox: {
        present: !!this.sandboxToken,
        receivedAt: this.sandboxToken?.receivedAt ?? null,
      },
    };
  }

  clearToken(mode?: UpstoxMode): void {
    if (!mode || mode === 'live') {
      this.liveToken = null;
      this.notify('live', 'cleared');
    }
    if (!mode || mode === 'sandbox') {
      this.sandboxToken = null;
      this.notify('sandbox', 'cleared');
    }
  }

  getMaskedInfo(): { live: string | null; sandbox: string | null } {
    return {
      live: this.liveToken ? maskToken(this.liveToken.accessToken) : null,
      sandbox: this.sandboxToken ? maskToken(this.sandboxToken.accessToken) : null,
    };
  }
}

export const upstoxTokenStore = UpstoxTokenStore.getInstance();
