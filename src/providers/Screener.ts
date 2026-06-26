import type { IFundamentalsProvider } from './index';
import type { Fundamentals } from '@/types';
import { PROVIDER_URLS } from '@/config/providers';

function extractNumber(text: string): number | null {
  const match = text.replace(/,/g, '').match(/-?[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function extractPercent(text: string): number | null {
  const val = extractNumber(text);
  return val !== null ? val / 100 : null;
}

export class ScreenerProvider implements IFundamentalsProvider {
  name = 'Screener';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${PROVIDER_URLS.SCREENER.BASE}/RELIANCE/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return res.ok;
    } catch { return false; }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    try {
      const res = await fetch(`${PROVIDER_URLS.SCREENER.BASE}/${symbol}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const html = await res.text();

      const peMatch = html.match(/P\/E[^0-9]*([\d.]+)/i);
      const pbMatch = html.match(/P\/B[^0-9]*([\d.]+)/i);
      const roeMatch = html.match(/ROE[^0-9]*([\d.]+)%/i);
      const deMatch = html.match(/Debt[^)]*\)[^0-9]*([\d.]+)/i);
      const revMatch = html.match(/Revenue Growth[^0-9-]*(-?[\d.]+)%/i);
      const profitMatch = html.match(/Profit Growth[^0-9-]*(-?[\d.]+)%/i);
      const mcapMatch = html.match(/Market Cap[^0-9]*₹([\d,]+)/i);

      return {
        symbol,
        marketCap: mcapMatch ? parseFloat(mcapMatch[1].replace(/,/g, '')) : null,
        peRatio: peMatch ? parseFloat(peMatch[1]) : null,
        pbRatio: pbMatch ? parseFloat(pbMatch[1]) : null,
        roe: roeMatch ? parseFloat(roeMatch[1]) / 100 : null,
        roic: null,
        roa: null,
        debtEquity: deMatch ? parseFloat(deMatch[1]) : null,
        currentRatio: null,
        revenueGrowth: revMatch ? parseFloat(revMatch[1]) / 100 : null,
        profitGrowth: profitMatch ? parseFloat(profitMatch[1]) / 100 : null,
        epsGrowth: null,
        fcfGrowth: null,
        grossMargin: null,
        operatingMargin: null,
        evEbitda: null,
        fcfYield: null,
        dividendYield: null,
        beta: null,
        source: 'screener',
        fetchedAt: new Date(),
      };
    } catch { return null; }
  }
}
