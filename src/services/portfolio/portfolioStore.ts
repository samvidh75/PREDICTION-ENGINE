/**
 * PORTFOLIO STORE
 *
 * Dual-layer architecture:
 * - IndexedDB (local, fast, offline-capable)
 * - Remote sync via POST /api/investor-state
 *
 * Never stores broker credentials. Only tracks:
 * - Ticker, quantity, entry price, date purchased
 * - User notes & thesis for each position
 * - Entry/exit events & P&L tracking
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PortfolioSchema extends DBSchema {
  positions: {
    key: string;
    value: PortfolioPosition;
    indexes: { 'by-symbol': string; 'by-date': number };
  };
  transactions: {
    key: string;
    value: PortfolioTransaction;
    indexes: { 'by-position-id': string; 'by-date': number };
  };
  thesis: {
    key: string;
    value: ThesisSnapshot;
    indexes: { 'by-position-id': string; 'by-date': number };
  };
}

export interface PortfolioPosition {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  entryDate: string;
  notes: string;
  thesisId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioTransaction {
  id: string;
  positionId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  date: string;
  notes?: string;
}

export interface ThesisSnapshot {
  id: string;
  positionId: string;
  timestamp: string;
  bullCase: string;
  bearCase: string;
  riskFactors: string[];
  catalysts: string[];
  conviction: number;
  targetPrice?: number;
  stopLoss?: number;
}

class PortfolioStoreImpl {
  private db: IDBPDatabase<PortfolioSchema> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    this.db = await openDB<PortfolioSchema>('stockstory_portfolio', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('positions')) {
          const store = db.createObjectStore('positions', { keyPath: 'id' });
          store.createIndex('by-symbol', 'symbol');
          store.createIndex('by-date', 'entryDate');
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('by-position-id', 'positionId');
          store.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('thesis')) {
          const store = db.createObjectStore('thesis', { keyPath: 'id' });
          store.createIndex('by-position-id', 'positionId');
          store.createIndex('by-date', 'timestamp');
        }
      },
    });
  }

  async getPositions(): Promise<PortfolioPosition[]> {
    await this.init();
    const all = await this.db!.getAll('positions');
    return all.filter((p) => p.isActive);
  }

  async getAllPositions(): Promise<PortfolioPosition[]> {
    await this.init();
    return this.db!.getAll('positions');
  }

  async addPosition(
    symbol: string,
    quantity: number,
    entryPrice: number,
    entryDate?: string
  ): Promise<PortfolioPosition> {
    await this.init();
    const position: PortfolioPosition = {
      id: this._id(),
      symbol: symbol.toUpperCase(),
      quantity,
      entryPrice,
      entryDate: entryDate || new Date().toISOString().split('T')[0],
      notes: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db!.add('positions', position);
    await this.recordTransaction(position.id, 'BUY', quantity, entryPrice, entryDate);
    this._sync({ type: 'position-added', position });
    return position;
  }

  async updatePosition(id: string, updates: Partial<PortfolioPosition>): Promise<void> {
    await this.init();
    const pos = await this.db!.get('positions', id);
    if (!pos) throw new Error(`Position not found: ${id}`);
    const updated = { ...pos, ...updates, updatedAt: new Date().toISOString() };
    await this.db!.put('positions', updated);
    this._sync({ type: 'position-updated', position: updated });
  }

  async closePosition(id: string, exitPrice: number, exitDate?: string): Promise<void> {
    await this.init();
    const pos = await this.db!.get('positions', id);
    if (!pos) throw new Error(`Position not found: ${id}`);
    await this.recordTransaction(
      id, 'SELL', pos.quantity, exitPrice,
      exitDate || new Date().toISOString().split('T')[0]
    );
    pos.isActive = false;
    pos.updatedAt = new Date().toISOString();
    await this.db!.put('positions', pos);
    this._sync({ type: 'position-closed', positionId: id });
  }

  async recordTransaction(
    positionId: string,
    type: 'BUY' | 'SELL' | 'DIVIDEND',
    quantity: number,
    price: number,
    date?: string
  ): Promise<PortfolioTransaction> {
    await this.init();
    const txn: PortfolioTransaction = {
      id: this._id(),
      positionId,
      type,
      quantity,
      price,
      date: date || new Date().toISOString().split('T')[0],
    };
    await this.db!.add('transactions', txn);
    return txn;
  }

  async getTransactions(positionId: string): Promise<PortfolioTransaction[]> {
    await this.init();
    const tx = this.db!.transaction('transactions').store;
    const idx = tx.index('by-position-id');
    return idx.getAll(positionId);
  }

  async saveThesis(
    positionId: string,
    bullCase: string,
    bearCase: string,
    riskFactors: string[],
    conviction: number,
    targetPrice?: number,
    stopLoss?: number,
    catalysts?: string[],
  ): Promise<ThesisSnapshot> {
    await this.init();
    const thesis: ThesisSnapshot = {
      id: this._id(),
      positionId,
      timestamp: new Date().toISOString(),
      bullCase,
      bearCase,
      riskFactors,
      catalysts: catalysts ?? [],
      conviction,
      targetPrice,
      stopLoss,
    };
    await this.db!.add('thesis', thesis);
    return thesis;
  }

  async getLatestThesis(positionId: string): Promise<ThesisSnapshot | null> {
    await this.init();
    const theses = await this.getThesesForPosition(positionId);
    return theses[0] || null;
  }

  async getThesesForPosition(positionId: string): Promise<ThesisSnapshot[]> {
    await this.init();
    const tx = this.db!.transaction('thesis').store;
    const idx = tx.index('by-position-id');
    const theses = await idx.getAll(positionId);
    return theses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async calculatePnL(
    positionId: string,
    currentPrice: number,
  ): Promise<{
    invested: number;
    current: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    realizedPnL: number;
  }> {
    await this.init();
    const pos = await this.db!.get('positions', positionId);
    if (!pos) throw new Error(`Position not found: ${positionId}`);

    const txns = await this.getTransactions(positionId);
    let invested = 0;
    let qty = 0;
    let realizedPnL = 0;

    for (const txn of txns) {
      if (txn.type === 'BUY') {
        invested += txn.quantity * txn.price;
        qty += txn.quantity;
      } else if (txn.type === 'SELL') {
        const costBasis = qty > 0 ? (invested / qty) * txn.quantity : 0;
        realizedPnL += txn.quantity * txn.price - costBasis;
        qty -= txn.quantity;
        invested -= costBasis;
      }
    }

    const current = qty * currentPrice;
    const unrealizedPnL = current - invested;
    const unrealizedPnLPercent = invested > 0 ? (unrealizedPnL / invested) * 100 : 0;

    return { invested, current, unrealizedPnL, unrealizedPnLPercent, realizedPnL };
  }

  private _id(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private _sync(event: Record<string, unknown>): void {
    const uid = this._userId();
    if (!uid) return;
    fetch('/api/investor-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  }

  private _userId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('auth_session');
      if (!raw) return null;
      return JSON.parse(raw).uid ?? null;
    } catch {
      return null;
    }
  }
}

export const portfolioStore = new PortfolioStoreImpl();
