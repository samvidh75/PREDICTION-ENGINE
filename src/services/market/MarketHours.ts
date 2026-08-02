const MARKET_TIMEZONE = 'Asia/Manila';

/**
 * PSE trading calendar (Asia/Manila):
 *   Pre-open auction  09:00 – 09:15
 *   Morning session   09:30 – 12:00
 *   Lunch break       12:00 – 13:00 (exchange closed)
 *   Afternoon session 13:00 – 15:30
 */
export const PSE_SCHEDULE = {
  PRE_OPEN: 9 * 60,
  OPEN: 9 * 60 + 30,
  LUNCH_START: 12 * 60,
  LUNCH_END: 13 * 60,
  CLOSE: 15 * 60 + 30,
  FREEZE: 16 * 60,
} as const;

function nowInPht(at?: Date): { hour: number; minute: number; day: number } {
  const now = at ?? new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TIMEZONE,
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    weekday: 'short',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(now)) {
    parts[part.type] = part.value;
  }
  const day = parts.weekdayShort || parts.weekday || '';
  return {
    hour: parseInt(parts.hour || '0', 10),
    minute: parseInt(parts.minute || '0', 10),
    day: ['Sat', 'Sun'].includes(day) ? 0 : 1,
  };
}

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function nowMinutes(at?: Date): { minutes: number; isMarketDay: boolean } {
  const { hour, minute, day } = nowInPht(at);
  return { minutes: toMinutes(hour, minute), isMarketDay: day === 1 };
}

export class MarketHours {
  static readonly OPEN = PSE_SCHEDULE.OPEN;
  static readonly LUNCH_START = PSE_SCHEDULE.LUNCH_START;
  static readonly LUNCH_END = PSE_SCHEDULE.LUNCH_END;
  static readonly CLOSE = PSE_SCHEDULE.CLOSE;
  static readonly FREEZE = PSE_SCHEDULE.FREEZE;

  static isMarketDay(at?: Date): boolean {
    return nowInPht(at).day === 1;
  }

  static isLunchBreak(at?: Date): boolean {
    if (!this.isMarketDay(at)) return false;
    const { minutes } = nowMinutes(at);
    return minutes >= this.LUNCH_START && minutes < this.LUNCH_END;
  }

  static isMarketOpen(at?: Date): boolean {
    if (!this.isMarketDay(at)) return false;
    if (this.isLunchBreak(at)) return false;
    const { minutes } = nowMinutes(at);
    return minutes >= this.OPEN && minutes < this.CLOSE;
  }

  static isPostMarket(at?: Date): boolean {
    const { minutes } = nowMinutes(at);
    return minutes >= this.FREEZE;
  }

  static isPreMarket(at?: Date): boolean {
    if (!this.isMarketDay(at)) return false;
    const { minutes } = nowMinutes(at);
    return minutes < this.OPEN;
  }

  static shouldFreezeQuotes(at?: Date): boolean {
    if (!this.isMarketDay(at)) return true;
    return this.isPostMarket(at);
  }

  static shouldUseLiveProviders(at?: Date): boolean {
    return this.isMarketDay(at) && this.isMarketOpen(at);
  }

  static getStatus(at?: Date): 'pre-market' | 'auction' | 'open' | 'lunch' | 'closing' | 'post-market' | 'weekend' {
    if (!this.isMarketDay(at)) return 'weekend';
    const { minutes } = nowMinutes(at);
    if (minutes < this.OPEN) return 'auction';
    if (this.isLunchBreak(at)) return 'lunch';
    if (minutes < this.CLOSE) return 'open';
    if (minutes < this.FREEZE) return 'closing';
    return 'post-market';
  }
}
