/**
 * TRACK-87 — WatchlistService
 * Server-side watchlist CRUD backed by SQLite.
 * Syncs with client-side localStorage via API.
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');
const db = new Database(DB_PATH);

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
  getUserWatchlists(userId: string): WatchlistRow[] {
    const rows = db.prepare(
      `SELECT * FROM user_watchlists WHERE user_id = ? AND is_archived = 0 ORDER BY sort_order ASC`
    ).all(userId) as any[];
    return rows.map(r => ({ ...r, tickers: JSON.parse(r.tickers || '[]'), is_archived: !!r.is_archived, is_favourite: !!r.is_favourite }));
  }

  getWatchlistById(id: string): WatchlistRow | null {
    const row = db.prepare('SELECT * FROM user_watchlists WHERE id = ?').get(id) as any;
    if (!row) return null;
    return { ...row, tickers: JSON.parse(row.tickers || '[]'), is_archived: !!row.is_archived, is_favourite: !!row.is_favourite };
  }

  createWatchlist(userId: string, name: string): WatchlistRow {
    const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const tickers = '[]';
    db.prepare(
      `INSERT INTO user_watchlists (id, user_id, name, tickers, is_archived, is_favourite, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM user_watchlists WHERE user_id = ?), ?, ?)`
    ).run(id, userId, name, tickers, userId, now, now);
    return this.getWatchlistById(id)!;
  }

  updateWatchlist(id: string, name: string, tickers: string[]): WatchlistRow | null {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE user_watchlists SET name = ?, tickers = ?, updated_at = ? WHERE id = ?`
    ).run(name, JSON.stringify(tickers), now, id);
    return this.getWatchlistById(id);
  }

  deleteWatchlist(id: string): void {
    db.prepare(`UPDATE user_watchlists SET is_archived = 1, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  addTicker(id: string, ticker: string): WatchlistRow | null {
    const wl = this.getWatchlistById(id);
    if (!wl) return null;
    const tickers = wl.tickers.includes(ticker.toUpperCase()) ? wl.tickers : [...wl.tickers, ticker.toUpperCase()];
    return this.updateWatchlist(id, wl.name, tickers);
  }

  removeTicker(id: string, ticker: string): WatchlistRow | null {
    const wl = this.getWatchlistById(id);
    if (!wl) return null;
    const tickers = wl.tickers.filter(t => t !== ticker.toUpperCase());
    return this.updateWatchlist(id, wl.name, tickers);
  }

  /** Get all tickers across all watchlists for a user */
  getUserWatchlistTickers(userId: string): string[] {
    const lists = this.getUserWatchlists(userId);
    const all = new Set<string>();
    for (const l of lists) l.tickers.forEach(t => all.add(t));
    return [...all];
  }

  /** Get all tickers across ALL users' watchlists */
  getAllWatchedTickers(): string[] {
    const rows = db.prepare('SELECT DISTINCT tickers FROM user_watchlists WHERE is_archived = 0').all() as any[];
    const all = new Set<string>();
    for (const r of rows) {
      try { JSON.parse(r.tickers || '[]').forEach((t: string) => all.add(t)); } catch { /* ignore malformed archived watchlist payload */ }
    }
    return [...all];
  }
}

export const watchlistService = new WatchlistService();
export default WatchlistService;
