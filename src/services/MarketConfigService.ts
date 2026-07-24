import { query } from '../db/index';
import { cacheService } from './CacheService';

interface MarketStatus {
  isOpen: boolean;
  dayStatus: 'holiday' | 'weekend' | 'pre-open' | 'open' | 'closed';
  minutesToClose: number;
  dataFreshness: 'live' | 'snapshot' | 'stale';
  nextOpenTime: Date;
  message: string;
}

interface MarketSnapshot {
  id: number;
  date: string;
  timestamp: string;
  stocks: Record<string, any>;
  metadata: Record<string, any>;
}

export class MarketConfigService {
  private static instance: MarketConfigService;

  private readonly MARKET_OPEN = this.parseTime(process.env.MARKET_OPEN || '09:30');
  private readonly MARKET_CLOSE = this.parseTime(process.env.MARKET_CLOSE || '15:30');
  private readonly PREOPEN = this.MARKET_OPEN - 30;

  private holidays: string[] = [];
  private holidaysLoaded = false;

  async getHolidays(): Promise<string[]> {
    if (this.holidaysLoaded) return this.holidays;

    try {
      const res = await query('SELECT date FROM market_holidays');
      this.holidays = res.rows.map((r: any) => {
        const d = r.date instanceof Date ? r.date : new Date(r.date);
        return d.toISOString().split('T')[0];
      });
    } catch {
      this.holidays = this.getDefaultHolidays();
    }
    this.holidaysLoaded = true;
    return this.holidays;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const now = new Date();
    const ist = this.toIST(now);
    const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
    const dayOfWeek = ist.getDay();
    const dateStr = ist.toISOString().split('T')[0];
    const holidays = await this.getHolidays();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isOpen: false,
        dayStatus: 'weekend',
        minutesToClose: -1,
        dataFreshness: 'snapshot',
        nextOpenTime: this.nextOpen(ist, holidays),
        message: 'Market closed (weekend)',
      };
    }

    if (holidays.includes(dateStr)) {
      return {
        isOpen: false,
        dayStatus: 'holiday',
        minutesToClose: -1,
        dataFreshness: 'snapshot',
        nextOpenTime: this.nextOpen(ist, holidays),
        message: 'Market closed (holiday)',
      };
    }

    if (totalMinutes >= this.MARKET_OPEN && totalMinutes < this.MARKET_CLOSE) {
      return {
        isOpen: true,
        dayStatus: 'open',
        minutesToClose: this.MARKET_CLOSE - totalMinutes,
        dataFreshness: 'live',
        nextOpenTime: new Date(8640000000000000),
        message: `Market open (closes at 3:30 PM IST)`,
      };
    }

    if (totalMinutes >= this.PREOPEN && totalMinutes < this.MARKET_OPEN) {
      return {
        isOpen: false,
        dayStatus: 'pre-open',
        minutesToClose: -1,
        dataFreshness: 'snapshot',
        nextOpenTime: this.todayAt(this.MARKET_OPEN),
        message: `Pre-open session (opens at 9:30 AM IST)`,
      };
    }

    return {
      isOpen: false,
      dayStatus: 'closed',
      minutesToClose: -1,
      dataFreshness: 'snapshot',
      nextOpenTime: this.nextOpen(ist, holidays),
      message: 'Market closed',
    };
  }

  shouldFetchFreshData(): boolean {
    const now = new Date();
    const ist = this.toIST(now);
    const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
    return totalMinutes >= this.MARKET_OPEN && totalMinutes < this.MARKET_CLOSE;
  }

  async getMarketSnapshot(date?: string): Promise<MarketSnapshot | null> {
    const dateStr = date || new Date().toISOString().split('T')[0];
    try {
      const res = await query(
        'SELECT * FROM market_snapshots WHERE date = $1 ORDER BY timestamp DESC LIMIT 1',
        [dateStr],
      );
      if (res.rows.length === 0) return null;
      return res.rows[0] as unknown as MarketSnapshot;
    } catch {
      return null;
    }
  }

  async saveMarketSnapshot(stocks: Record<string, any>, metadata: Record<string, any>): Promise<boolean> {
    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];
    try {
      await query(
        `IPSERT INTO market_snapshots (date, timestamp, stocks, metadata)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         ON CONFLICT (date) DO UPDATE SET timestamp = $2, stocks = $3::jsonb, metadata = $4::jsonb`,
        [dateStr, now, JSON.stringify(stocks), JSON.stringify(metadata)],
      );
      return true;
    } catch (err) {
      console.error('[MarketConfig] Failed to save snapshot:', err);
      return false;
    }
  }

  async getDataSource(): Promise<'live' | 'snapshot' | 'stale'> {
    const status = await this.getMarketStatus();
    if (status.dataFreshness === 'live') return 'live';
    const snapshot = await this.getMarketSnapshot();
    if (!snapshot) return 'stale';
    const age = Date.now() - new Date(snapshot.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000 ? 'snapshot' : 'stale';
  }

  async getDataFreshnessMessage(): Promise<string> {
    const status = await this.getMarketStatus();
    if (status.isOpen) return `Live prices (market open until 3:30 PM IST)`;
    if (status.dayStatus === 'weekend' || status.dayStatus === 'holiday') {
      return `Market ${status.dayStatus}. Next open: ${status.nextOpenTime.toLocaleDateString('en-PH')}`;
    }
    const snapshot = await this.getMarketSnapshot();
    if (snapshot) {
      const t = new Date(snapshot.timestamp);
      return `Market closed. Snapshot from ${t.toLocaleTimeString('en-PH')} IST`;
    }
    return 'Market closed. No recent snapshot available.';
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private parseTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 9) * 60 + (m || 30);
  }

  private toIST(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  }

  private todayAt(minutes: number): Date {
    const d = this.toIST(new Date());
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d;
  }

  private nextOpen(from: Date, holidays: string[]): Date {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 30, 0, 0);
    while (d.getDay() === 0 || d.getDay() === 6 || holidays.includes(d.toISOString().split('T')[0])) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  private getDefaultHolidays(): string[] {
    return [
      '2026-01-26', '2026-03-25', '2026-04-02', '2026-04-10',
      '2026-08-15', '2026-09-16', '2026-10-02', '2026-10-20',
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-12-25',
    ];
  }

  static getInstance(): MarketConfigService {
    if (!this.instance) this.instance = new MarketConfigService();
    return this.instance;
  }
}

export const marketConfigService = MarketConfigService.getInstance();
