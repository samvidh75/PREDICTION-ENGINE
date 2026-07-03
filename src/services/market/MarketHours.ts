const MARKET_TIMEZONE = 'Asia/Kolkata';

function nowInIst(): { hour: number; minute: number; day: number } {
  const now = new Date();
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

export class MarketHours {
  static readonly OPEN = 9 * 60 + 15;
  static readonly CLOSE = 15 * 60 + 30;
  static readonly FREEZE = 16 * 60;

  static isMarketDay(): boolean {
    return nowInIst().day === 1;
  }

  static isMarketOpen(): boolean {
    if (!this.isMarketDay()) return false;
    const { hour, minute } = nowInIst();
    const now = toMinutes(hour, minute);
    return now >= this.OPEN && now < this.CLOSE;
  }

  static isPostMarket(): boolean {
    const { hour, minute } = nowInIst();
    return toMinutes(hour, minute) >= this.FREEZE;
  }

  static isPreMarket(): boolean {
    if (!this.isMarketDay()) return false;
    const { hour, minute } = nowInIst();
    return toMinutes(hour, minute) < this.OPEN;
  }

  static shouldFreezeQuotes(): boolean {
    if (!this.isMarketDay()) return true;
    return this.isPostMarket();
  }

  static shouldUseLiveProviders(): boolean {
    return this.isMarketDay() && this.isMarketOpen();
  }

  static getStatus(): 'pre-market' | 'open' | 'closing' | 'post-market' | 'weekend' {
    if (!this.isMarketDay()) return 'weekend';
    const { hour, minute } = nowInIst();
    const now = toMinutes(hour, minute);
    if (now < this.OPEN) return 'pre-market';
    if (now < this.CLOSE) return 'open';
    if (now < this.FREEZE) return 'closing';
    return 'post-market';
  }
}
