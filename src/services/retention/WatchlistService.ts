/**
 * TRACK-87 — WatchlistService
 * Server-side watchlist CRUD backed by SQLite.
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

/** Raw row shape returned by the database query */
interface WatchlistDbRow {
  id: string;
  user_id: string;
  name: string;
  tickers: string;
  is_archived: number;
  is_favourite: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CountResult {
  cnt: number;
}

function hydrateWatchlist(r: WatchlistDbRow): WatchlistRow {
  return {
    ...r,
    tickers: JSON.parse(r.tickers || '[]'),
    is_archived: !!r.is_archived,
    is_favourite: !!r.is_favourite,
  };
}

export class WatchlistService {
  async getUserWatchlists(userId: string): Promise<WatchlistRow[]> {
    const result = await dbAdapter.query(
      `SELECT * FROM user_watchlists WHERE user_id = $1 AND is_archived = 0 ORDER BY sort_order ASC`,
      [userId]
    );
    const rows = result.rows as unknown as WatchlistDbRow[];
    return rows.map(hydrateWatchlist);
  }

  async getWatchlistById(id: string): Promise<WatchlistRow | null> {
    const result = await dbAdapter.query(
      'SELECT * FROM user_watchlists WHERE id = $1',
      [id]
    );
    const rows = result.rows as unknown as WatchlistDbRow[];
    if (rows.length === 0) return null;
    return hydrateWatchlist(rows[0]);
  }

  async createWatchlist(userId: string, name: string): Promise<WatchlistRow> {
    const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const tickers = '[]';

    // Get next sort order
    const maxResult = await dbAdapter.query(
      `SELECT COALESCE(MAX(sort_order), 0) AS cnt FROM user_watchlists WHERE user_id = $1`,
      [userId]
    );
    const maxRows = maxResult.rows as unknown as CountResult[];
    const nextSort = (maxRows[0]?.cnt ?? 0) + 1;

    await dbAdapter.query(
      `INSERT INTO user_watchlists (id, user_id, name, tickers, is_archived, is_favourite, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7)`,
      [id, userId, name, tickers, nextSort, now, now]
    );
    return (await this.getWatchlistById(id))!;
  }

  async updateWatchlist(id: string, name: string, tickers: string[]): Promise<WatchlistRow | null> {
    const now = new Date().toISOString();
    await dbAdapter.query(
      `UPDATE user_watchlists SET name = $1, tickers = $2, updated_at = $3 WHERE id = $4`,
      [name, JSON.stringify(tickers), now, id]
    );
    return this.getWatchlistById(id);
  }

  async deleteWatchlist(id: string): Promise<void> {
    await dbAdapter.query(
      `UPDATE user_watchlists SET is_archived = 1, updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), id]
    );
  }

  async addTicker(id: string, ticker: string): Promise<WatchlistRow | null> {
    const wl = await this.getWatchlistById(id);
    if (!wl) return null;
    const tickers = wl.tickers.includes(ticker.toUpperCase())
      ? wl.tickers
      : [...wl.tickers, ticker.toUpperCase()];
    return this.updateWatchlist(id, wl.name, tickers);
  }

  async removeTicker(id: string, ticker: string): Promise<WatchlistRow | null> {
    const wl = await this.getWatchlistById(id);
    if (!wl) return null;
    const tickers = wl.tickers.filter(t => t !== ticker.toUpperCase());
    return this.updateWatchlist(id, wl.name, tickers);
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
    const result = await dbAdapter.query(
      'SELECT DISTINCT tickers FROM user_watchlists WHERE is_archived = 0'
    );
    const all = new Set<string>();
    for (const r of result.rows) {
      try {
        const parsed = JSON.parse((r as { tickers: string }).tickers || '[]');
        parsed.forEach((t: string) => all.add(t));
      } catch { /* skip malformed */ }
    }
    return [...all];
  }
}

export const watchlistService = new WatchlistService();
export default WatchlistService;