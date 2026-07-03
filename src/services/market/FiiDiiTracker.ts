export interface FiiDiiFlow {
  date: string;
  fiiBuy: number;
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
  category: 'equity' | 'debt' | 'derivatives' | 'total';
}

export interface FiiDiiSummary {
  today: { fiiNet: number; diiNet: number };
  week: { fiiNet: number; diiNet: number };
  month: { fiiNet: number; diiNet: number };
  year: { fiiNet: number; diiNet: number };
  trend: 'bullish' | 'bearish' | 'neutral';
  interpretation: string;
}

export class FiiDiiTracker {
  private flows: FiiDiiFlow[] = this.seedData();

  private seedData(): FiiDiiFlow[] {
    const data: FiiDiiFlow[] = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const fiiNet = (Math.random() - 0.48) * 10000;
      const diiNet = -fiiNet * 0.6 + (Math.random() - 0.5) * 2000;
      data.push({
        date: date.toISOString().split('T')[0],
        fiiBuy: Math.round((Math.abs(fiiNet) * 2 + Math.random() * 2000) * 100) / 100,
        fiiSell: Math.round((Math.abs(fiiNet) * 1.5 + Math.random() * 2000) * 100) / 100,
        fiiNet: Math.round(fiiNet * 100) / 100,
        diiBuy: Math.round((Math.abs(diiNet) * 1.5 + Math.random() * 1500) * 100) / 100,
        diiSell: Math.round((Math.abs(diiNet) * 1.2 + Math.random() * 1500) * 100) / 100,
        diiNet: Math.round(diiNet * 100) / 100,
        category: 'equity',
      });
    }
    return data;
  }

  getDailyFlows(days: number = 30): FiiDiiFlow[] {
    return this.flows.slice(0, days);
  }

  getSummary(): FiiDiiSummary {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayFlows = this.flows.filter(f => f.date === todayStr);
    const weekFlows = this.flows.filter(f => {
      const d = new Date(f.date);
      return now.getTime() - d.getTime() <= 7 * 86400000;
    });
    const monthFlows = this.flows;
    const yearFlows = this.flows;

    const sum = (arr: FiiDiiFlow[], key: 'fiiNet' | 'diiNet') =>
      Math.round(arr.reduce((s, f) => s + f[key], 0) * 100) / 100;

    const today = {
      fiiNet: todayFlows.length > 0 ? todayFlows[todayFlows.length - 1].fiiNet : 0,
      diiNet: todayFlows.length > 0 ? todayFlows[todayFlows.length - 1].diiNet : 0,
    };
    const week = { fiiNet: sum(weekFlows, 'fiiNet'), diiNet: sum(weekFlows, 'diiNet') };
    const month = { fiiNet: sum(monthFlows, 'fiiNet'), diiNet: sum(monthFlows, 'diiNet') };
    const year = { fiiNet: sum(yearFlows, 'fiiNet'), diiNet: sum(yearFlows, 'diiNet') };

    const fiiTrend = month.fiiNet > 0 ? 'bullish' : month.fiiNet < 0 ? 'bearish' : 'neutral';
    const diiOffset = Math.abs(month.fiiNet) < Math.abs(month.diiNet) * 0.5;
    const trend: 'bullish' | 'bearish' | 'neutral' =
      fiiTrend === 'bullish' || diiOffset ? 'bullish' : fiiTrend === 'bearish' ? 'bearish' : 'neutral';

    let interpretation = '';
    if (month.fiiNet > 0 && month.diiNet > 0) {
      interpretation = 'Both FII and DII are net buyers, indicating strong broad-based confidence in Indian equities.';
    } else if (month.fiiNet > 0 && month.diiNet < 0) {
      interpretation = `FIIs are net buyers (₹${Math.abs(month.fiiNet).toFixed(0)}Cr) while DIIs are profit-taking. Foreign inflows signal global confidence in India's growth story.`;
    } else if (month.fiiNet < 0 && month.diiNet > 0) {
      interpretation = `FIIs are net sellers (₹${Math.abs(month.fiiNet).toFixed(0)}Cr) but DIIs are absorbing the sell-off. Domestic institutional buying provides a cushion against foreign outflows.`;
    } else {
      interpretation = 'Both FII and DII are net sellers. Broad-based caution prevails in the market.';
    }

    return { today, week, month, year, trend, interpretation };
  }
}

export const fiiDiiTracker = new FiiDiiTracker();
