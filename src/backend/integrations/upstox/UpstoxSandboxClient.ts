import { UpstoxConfig } from './UpstoxConfig';
import { UpstoxTokenStore } from './UpstoxTokenStore';
import { UpstoxSandboxError, sanitizeErrorMessage } from './UpstoxErrors';
import type { UpstoxOrderRequest, UpstoxOrderResponse } from './UpstoxTypes';

const FETCH_TIMEOUT = 10_000;

export class UpstoxSandboxClient {
  private config: UpstoxConfig;
  private tokenStore: UpstoxTokenStore;

  constructor(config?: UpstoxConfig, tokenStore?: UpstoxTokenStore) {
    this.config = config ?? UpstoxConfig.getInstance();
    this.tokenStore = tokenStore ?? UpstoxTokenStore.getInstance();
  }

  private getToken(): string {
    const token = this.tokenStore.getSandboxToken();
    if (!token) {
      throw new UpstoxSandboxError('Sandbox token not available');
    }
    return token;
  }

  private getBaseUrl(): string {
    return 'https://sandbox-api.upstox.com/v2';
  }

  private async sandboxFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const url = `${this.getBaseUrl()}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const safeMsg = sanitizeErrorMessage(data.message || data.error || `HTTP ${response.status}`);
        throw new UpstoxSandboxError(`Sandbox API error: ${safeMsg}`);
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof UpstoxSandboxError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        throw new UpstoxSandboxError('Sandbox request timed out');
      }
      throw new UpstoxSandboxError(`Sandbox request failed: ${sanitizeErrorMessage(msg)}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async placeOrderDryRun(order: UpstoxOrderRequest): Promise<UpstoxOrderResponse> {
    return this.sandboxFetch<UpstoxOrderResponse>('/orders/dry-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  }

  async getOrders(): Promise<UpstoxOrderResponse[]> {
    return this.sandboxFetch<UpstoxOrderResponse[]>('/orders');
  }

  async getOrderHistory(orderId: string): Promise<UpstoxOrderResponse[]> {
    return this.sandboxFetch<UpstoxOrderResponse[]>(`/orders/${orderId}/history`);
  }

  async cancelOrder(orderId: string): Promise<UpstoxOrderResponse> {
    return this.sandboxFetch<UpstoxOrderResponse>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async modifyOrder(orderId: string, updates: Partial<UpstoxOrderRequest>): Promise<UpstoxOrderResponse> {
    return this.sandboxFetch<UpstoxOrderResponse>(`/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  async getPositions(): Promise<unknown> {
    return this.sandboxFetch<unknown>('/user/positions');
  }

  async getHoldings(): Promise<unknown> {
    return this.sandboxFetch<unknown>('/user/holdings');
  }

  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      await this.sandboxFetch<unknown>('/user/profile');
      return { status: 'healthy', message: 'Sandbox API is reachable' };
    } catch {
      return { status: 'unreachable', message: 'Sandbox API is not reachable' };
    }
  }
}
