/**
 * TRACK-87 — DailyDigestGenerator
 * Generates personalised HTML/plain-text daily digest per user.
 */
import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'stockstory.db');

export interface DigestData {
  userId: string;
  date: string;
  subject: string;
  html: string;
  text: string;
  topChanges: Array<{ symbol: string; change: string; detail: string }>;
}

export class DailyDigestGenerator {
  generateForUser(userId: string): DigestData {
    const db = new Database(DB_PATH);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get user's watchlist tickers
    const rows = db.prepare('SELECT tickers FROM user_watchlists WHERE user_id = ? AND is_archived = 0').all(userId) as any[];
    const watchedTickers = new Set<string>();
    for (const r of rows) {
      try { JSON.parse(r.tickers || '[]').forEach((t: string) => watchedTickers.add(t)); } catch { /* ignore malformed archived watchlist payload */ }
    }

    // Get today's predictions for watched tickers
    const placeholders = [...watchedTickers].map(() => '?').join(',');
    let watchlistPredictions: any[] = [];
    if (watchedTickers.size > 0) {
      watchlistPredictions = db.prepare(
        `SELECT symbol, prediction_horizon, ranking_score, classification, confidence_level
         FROM prediction_registry WHERE prediction_date = ? AND symbol IN (${placeholders})
         ORDER BY ranking_score DESC`
      ).all(today, ...[...watchedTickers]) as any[];
    }

    // Get today's alerts for user
    const todayAlerts = db.prepare(
      `SELECT * FROM user_alerts WHERE user_id = ? AND created_at >= date(?)
       ORDER BY created_at DESC LIMIT 20`
    ).all(userId, today) as any[];

    // Get top market movers (by score change absolute value, across all symbols)
    const topMovers = db.prepare(
      `SELECT symbol, ranking_score, classification, confidence_level
       FROM prediction_registry WHERE prediction_date = ?
       ORDER BY ranking_score DESC LIMIT 5`
    ).all(today) as any[];

    const topChanges = todayAlerts.slice(0, 10).map((a: any) => ({
      symbol: a.symbol,
      change: a.alert_type.replace(/_/g, ' '),
      detail: a.body
    }));

    db.close();

    // Build HTML
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const subject = `StockStory Daily Brief — ${dateStr}`;

    const html = this.buildHtml(userId, dateStr, watchlistPredictions, todayAlerts, topMovers);
    const text = this.buildText(userId, dateStr, watchlistPredictions, todayAlerts, topMovers);

    return { userId, date: today, subject, html, text, topChanges };
  }

  private buildHtml(userId: string, dateStr: string, watchlist: any[], alerts: any[], movers: any[]): string {
    const watchlistRows = watchlist.length > 0
      ? watchlist.map(p => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1a2030;font-family:monospace;font-weight:bold;color:#00C8FF">${p.symbol}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1a2030;text-align:center;font-weight:bold;color:#D6DEEA">${Number(p.ranking_score).toFixed(0)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1a2030;text-align:center">
            <span style="background:${p.classification === 'Exceptional' || p.classification === 'Excellent' ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.05)'};color:${p.classification === 'Exceptional' || p.classification === 'Excellent' ? '#00C8FF' : '#718096'};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold">${p.classification}</span>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="3" style="padding:12px;text-align:center;color:#718096">No watchlist data for today. Add stocks to your watchlist!</td></tr>';

    const alertRows = alerts.length > 0
      ? alerts.map((a: any) => `
        <div style="padding:8px 0;border-bottom:1px solid #1a2030">
          <strong style="color:${a.alert_type.includes('upgrade') ? '#00E676' : a.alert_type.includes('downgrade') ? '#FF5252' : '#FFC857'}">${a.title}</strong>
          <p style="margin:4px 0 0 0;color:#718096;font-size:12px">${a.body}</p>
        </div>`).join('')
      : '<p style="color:#718096">No new alerts today. Your watchlist is stable.</p>';

    const moverRows = movers.map((m: any, i: number) => `
      <div style="padding:8px 0;border-bottom:1px solid #1a2030;display:flex;justify-content:space-between">
        <span style="font-family:monospace;font-weight:bold;color:#D6DEEA">#${i + 1} ${m.symbol}</span>
        <span style="font-weight:bold;color:#00C8FF">${Number(m.ranking_score).toFixed(0)}/100 — ${m.classification}</span>
      </div>`).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0F17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#D6DEEA">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="text-align:center;padding:24px 0;border-bottom:2px solid #00C8FF">
    <h1 style="margin:0;font-size:24px;color:#00C8FF;letter-spacing:2px">STOCKSTORY</h1>
    <p style="margin:8px 0 0 0;font-size:13px;color:#718096">Daily Intelligence Brief</p>
    <p style="margin:4px 0 0 0;font-size:11px;color:#525252">${dateStr}</p>
  </div>

  <div style="padding:20px 0">
    <h2 style="font-size:16px;color:#00C8FF;border-bottom:1px solid #1a2030;padding-bottom:8px">📊 Your Watchlist Today</h2>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead><tr>
        <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #1a2030;color:#718096;font-size:10px;text-transform:uppercase">Symbol</th>
        <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #1a2030;color:#718096;font-size:10px;text-transform:uppercase">Score</th>
        <th style="text-align:center;padding:8px 12px;border-bottom:1px solid #1a2030;color:#718096;font-size:10px;text-transform:uppercase">Rating</th>
      </tr></thead>
      <tbody>${watchlistRows}</tbody>
    </table>
  </div>

  <div style="padding:20px 0">
    <h2 style="font-size:16px;color:#FFC857;border-bottom:1px solid #1a2030;padding-bottom:8px">🔔 Changes Since Yesterday</h2>
    ${alertRows}
  </div>

  <div style="padding:20px 0">
    <h2 style="font-size:16px;color:#00E676;border-bottom:1px solid #1a2030;padding-bottom:8px">🏆 Today's Top Performers</h2>
    ${moverRows}
  </div>

  <div style="margin-top:24px;padding:16px;background:rgba(0,200,255,0.03);border:1px solid #1a2030;border-radius:8px;font-size:10px;color:#525252;text-align:center">
    <p>StockStory provides research intelligence and health assessments. It does not provide personalised investment advice.</p>
    <p style="margin-top:4px">SEBI Registered Investment Research • Advisory-Free Resource</p>
    <p style="margin-top:8px"><a href="https://www.stockstory-india.com/settings" style="color:#00C8FF">Manage email preferences</a></p>
  </div>
</div>
</body>
</html>`;
  }

  private buildText(userId: string, dateStr: string, watchlist: any[], alerts: any[], movers: any[]): string {
    const lines = [
      `STOCKSTORY DAILY BRIEF — ${dateStr}`,
      '',
      '=== YOUR WATCHLIST ===',
      ...watchlist.map(p => `  ${p.symbol}: ${Number(p.ranking_score).toFixed(0)}/100 — ${p.classification} [${p.confidence_level}]`),
      '',
      '=== CHANGES SINCE YESTERDAY ===',
      ...alerts.map(a => `  [${a.alert_type}] ${a.symbol}: ${a.body}`),
      '',
      '=== TOP PERFORMERS ===',
      ...movers.map((m, i) => `  #${i + 1} ${m.symbol}: ${Number(m.ranking_score).toFixed(0)}/100 — ${m.classification}`),
      '',
      '---',
      'StockStory is a research intelligence platform. This is not personal investment advice.',
      'Manage preferences: https://www.stockstory-india.com/settings'
    ];
    if (watchlist.length === 0) lines.splice(3, 0, '  Add stocks to your watchlist on StockStory!');
    if (alerts.length === 0) lines.splice(lines.indexOf('=== CHANGES SINCE YESTERDAY ===') + 1, 0, '  No changes today. Your watchlist is stable.');
    return lines.join('\n');
  }

  /** Generate digests for all users and store in DB */
  generateForAllUsers(): DigestData[] {
    const db = new Database(DB_PATH);
    const users = db.prepare('SELECT DISTINCT user_id FROM user_watchlists WHERE is_archived = 0').all() as any[];
    db.close();

    const results: DigestData[] = [];
    for (const u of users) {
      const digest = this.generateForUser(u.user_id);
      this.storeDigest(digest);
      results.push(digest);
    }
    return results;
  }

  private storeDigest(digest: DigestData): void {
    const db = new Database(DB_PATH);
    try {
      db.prepare(
        `INSERT OR REPLACE INTO daily_digests (user_id, digest_date, content, email_sent, created_at)
         VALUES (?, ?, ?, 0, datetime('now'))`
      ).run(digest.userId, digest.date, JSON.stringify({ subject: digest.subject, html: digest.html, text: digest.text, topChanges: digest.topChanges }));
    } finally { db.close(); }
  }
}

export const dailyDigestGenerator = new DailyDigestGenerator();
export default DailyDigestGenerator;
