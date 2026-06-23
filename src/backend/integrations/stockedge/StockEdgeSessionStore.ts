export interface StockEdgeSession {
  cookieHeader: string;
  createdAt: string;
  expiresAt: string;
  metadata?: {
    loginHost?: string;
    discoveredDataHosts?: string[];
  };
}

export class StockEdgeSessionStore {
  private session: StockEdgeSession | null = null;

  getSession(): StockEdgeSession | null {
    if (!this.session) return null;
    if (Date.now() >= new Date(this.session.expiresAt).getTime()) {
      this.session = null;
      return null;
    }
    return this.session;
  }

  setSession(session: StockEdgeSession): void {
    this.session = session;
  }

  clearSession(): void {
    this.session = null;
  }

  isSessionValid(): boolean {
    if (!this.session) return false;
    return Date.now() < new Date(this.session.expiresAt).getTime();
  }
}

export const stockEdgeSessionStore = new StockEdgeSessionStore();
