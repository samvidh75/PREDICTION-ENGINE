/**
 * TRACK-87 — WatchlistService (async version with authz/IDOR fixes)
 * Server-side watchlist CRUD backed by dbAdapter.
 * Syncs with client-side localStorage via API.
 */
import { dbAdapter } from '../../db/DatabaseAdapter';

export interface WatchlistRow {
  id: string;
  user_id: string;
  name: string;
  tickers: string[];
  is_archived: boolean;
  is_favourite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class WatchlistService {
  async getUserWatchlists(userId: string): Promise<WatchlistRow[]> {
    const res = await dbAdapter.query(
      `SELECT * FROM user_watchlists WHERE user_id = $1 AND is_archived = 0 ORDER BY sort_order ASC`,
      [userId]
    );
    return res.rows.map((r: any) => ({
      ...r,
      tickers: typeof r.tickers === 'string' ? JSON.parse(r.tickers || '[]') : r.tickers,
      is_archived: !!r.is_archived,
      is_favourite: !!r.is_favourite
    }));
  }

  async getWatchlistById(userId: string, id: string): Promise<WatchlistRow | null> {
    const res = await dbAdapter.query('SELECT * FROM user_watchlists WHERE id = $1 AND user_id = $2', [id, userId]);
    const row = res.rows[0] as any;
    if (!row) return null;
    return {
      ...row,
      tickers: typeof row.tickers === 'string' ? JSON.parse(row.tickers || '[]') : row.tickers,
      is_archived: !!row.is_archived,
      is_favourite: !!row.is_favourite
    };
  }

  async createWatchlist(userId: string, name: string): Promise<WatchlistRow> {
    const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const tickers = '[]';
    await dbAdapter.query(
      `INSERT INTO user_watchlists (id, user_id, name, tickers, is_archived, is_favourite, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM user_watchlists WHERE user_id = $5), $6, $7)`,
      [id, userId, name, tickers, userId, now, now]
    );
    return (await this.getWatchlistById(userId, id))!;
  }

  async updateWatchlist(userId: string, id: string, name: string, tickers: string[]): Promise<WatchlistRow | null> {
    const now = new Date().toISOString();
    const res = await dbAdapter.query(
      `UPDATE user_watchlists SET name = $1, tickers = $2, updated_at = $3 WHERE id = $4 AND user_id = $5`,
      [name, JSON.stringify(tickers), now, id, userId]
    );
    if (res.rowCount === 0) return null;
    return this.getWatchlistById(userId, id);
  }

  async deleteWatchlist(userId: string, id: string): Promise<boolean> {
    const res = await dbAdapter.query(
      `UPDATE user_watchlists SET is_archived = 1, updated_at = $1 WHERE id = $2 AND user_id = $3`,
      [new Date().toISOString(), id, userId]
    );
    return res.rowCount > 0;
  }

  async addTicker(userId: string, id: string, ticker: string): Promise<WatchlistRow | null> {
    const wl = await this.getWatchlistById(userId, id);
    if (!wl) return null;
    const tickers = wl.tickers.includes(ticker.toUpperCase()) ? wl.tickers : [...wl.tickers, ticker.toUpperCase()];
    return this.updateWatchlist(userId, id, wl.name, tickers);
  }

  async removeTicker(userId: string, id: string, ticker: string): Promise<WatchlistRow | null> {
    const wl = await this.getWatchlistById(userId, id);
    if (!wl) return null;
    const tickers = wl.tickers.filter(t => t !== ticker.toUpperCase());
    return this.updateWatchlist(userId, id, wl.name, tickers);
  }

  /** Get all tickers across all watchlists for a user */
  async getUserWatchlistTickers(userId: string): Promise<string[]> {
    const lists = await this.getUserWatchlists(userId);
    const all = new Set<string>();
    for (const l of lists) l.tickers.forEach(t => all.add(t));
    return [...all];
  }

  /** Get all tickers across ALL users' watchlists */
  async getAllWatchedTickers(): Promise<string[]> {
    const res = await dbAdapter.query('SELECT DISTINCT tickers FROM user_watchlists WHERE is_archived = 0');
    const all = new Set<string>();
    for (const r of res.rows as any[]) {
      try {
        const tickers = typeof r.tickers === 'string' ? JSON.parse(r.tickers || '[]') : r.tickers;
        tickers.forEach((t: string) => all.add(t));
      } catch { /* ignore malformed archived watchlist payload */ }
    }
    return [...all];
  }
}

export const watchlistService = new WatchlistService();
export default WatchlistService;
