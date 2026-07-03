import nacl from 'tweetnacl';
import { v4 as uuidv4 } from 'uuid';

export interface EncryptedWatchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EncryptedPortfolio {
  positions: Array<{
    symbol: string;
    quantity: number;
    entryPrice: number;
    entryDate: string;
    notes?: string;
  }>;
  updatedAt: number;
}

export interface SearchHistoryEntry {
  symbol: string;
  timestamp: number;
}

export class LocalStorageVault {
  private encryptionKey: Uint8Array | null = null;
  private readonly KEY_PREFIX = 'stockstory_v2_';

  async init(): Promise<void> {
    if (this.encryptionKey) return;
    let keyStr = localStorage.getItem(`${this.KEY_PREFIX}encryption_key`);
    if (!keyStr) {
      const key = nacl.randomBytes(32);
      keyStr = Buffer.from(key).toString('base64');
      localStorage.setItem(`${this.KEY_PREFIX}encryption_key`, keyStr);
    }
    this.encryptionKey = Buffer.from(keyStr, 'base64');
  }

  async saveWatchlist(name: string, tickers: string[]): Promise<string> {
    await this.init();
    const id = uuidv4();
    const data: EncryptedWatchlist = {
      id,
      name,
      tickers: tickers.map((t) => t.toUpperCase()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const encrypted = this.encrypt(JSON.stringify(data));
    localStorage.setItem(`${this.KEY_PREFIX}watchlist_${id}`, encrypted);

    const index = this.getIndex('watchlists');
    if (!index.includes(id)) index.push(id);
    this.setIndex('watchlists', index);

    return id;
  }

  async getWatchlists(): Promise<EncryptedWatchlist[]> {
    await this.init();
    const index = this.getIndex('watchlists');
    const results: EncryptedWatchlist[] = [];
    for (const id of index) {
      const encrypted = localStorage.getItem(`${this.KEY_PREFIX}watchlist_${id}`);
      if (encrypted) {
        try {
          results.push(JSON.parse(this.decrypt(encrypted)));
        } catch {
          localStorage.removeItem(`${this.KEY_PREFIX}watchlist_${id}`);
        }
      }
    }
    return results;
  }

  async deleteWatchlist(id: string): Promise<void> {
    localStorage.removeItem(`${this.KEY_PREFIX}watchlist_${id}`);
    const index = this.getIndex('watchlists').filter((wid: string) => wid !== id);
    this.setIndex('watchlists', index);
  }

  async savePortfolio(positions: EncryptedPortfolio['positions']): Promise<void> {
    await this.init();
    const data: EncryptedPortfolio = { positions, updatedAt: Date.now() };
    localStorage.setItem(`${this.KEY_PREFIX}portfolio`, this.encrypt(JSON.stringify(data)));
  }

  async getPortfolio(): Promise<EncryptedPortfolio> {
    await this.init();
    const encrypted = localStorage.getItem(`${this.KEY_PREFIX}portfolio`);
    if (!encrypted) return { positions: [], updatedAt: 0 };
    try {
      return JSON.parse(this.decrypt(encrypted));
    } catch {
      return { positions: [], updatedAt: 0 };
    }
  }

  async addSearchHistory(symbol: string, timestamp: number = Date.now()): Promise<void> {
    const history = this.getSearchHistoryRaw();
    history.push({ symbol: symbol.toUpperCase(), timestamp });
    if (history.length > 5000) history.shift();
    localStorage.setItem(`${this.KEY_PREFIX}search_history`, JSON.stringify(history));
  }

  async getSearchHistory(): Promise<SearchHistoryEntry[]> {
    return this.getSearchHistoryRaw();
  }

  async clearAll(): Promise<void> {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.KEY_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  private getIndex(type: string): string[] {
    const raw = localStorage.getItem(`${this.KEY_PREFIX}${type}_index`);
    return raw ? JSON.parse(raw) : [];
  }

  private setIndex(type: string, index: string[]): void {
    localStorage.setItem(`${this.KEY_PREFIX}${type}_index`, JSON.stringify(index));
  }

  private getSearchHistoryRaw(): SearchHistoryEntry[] {
    const raw = localStorage.getItem(`${this.KEY_PREFIX}search_history`);
    return raw ? JSON.parse(raw) : [];
  }

  private encrypt(message: string): string {
    const nonce = nacl.randomBytes(24);
    const msgBytes = new TextEncoder().encode(message);
    const encrypted = nacl.secretbox(msgBytes, nonce, this.encryptionKey!);
    const combined = Buffer.concat([Buffer.from(nonce), Buffer.from(encrypted)]);
    return combined.toString('base64');
  }

  private decrypt(ciphertext: string): string {
    const combined = Buffer.from(ciphertext, 'base64');
    const nonce = combined.subarray(0, 24);
    const encrypted = combined.subarray(24);
    const decrypted = nacl.secretbox.open(encrypted, nonce, this.encryptionKey!);
    if (!decrypted) throw new Error('Decryption failed');
    return new TextDecoder().decode(decrypted);
  }
}

export const vault = new LocalStorageVault();
