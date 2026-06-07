/**
 * ScreenerProvider - Indian equity fundamentals via live Screener.in HTML.
 *
 * TRACK-9B role: enrichment only. ProviderCoordinator may use this provider only
 * to fill missing growth/liquidity/margin fields. Upstox-owned fields must not be
 * overwritten by Screener values.
 */

import { FinancialProvider, FinancialData } from './FinancialProvider';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 1000, maxDelayMs: 5000 };

export class ScreenerProvider implements FinancialProvider {
  async getFinancials(symbol: string): Promise<FinancialData> {
    const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const url = `https://www.screener.in/company/${encodeURIComponent(clean)}/consolidated/`;
    const html = await this.fetchPage(url);
    if (!html) throw new Error(`Screener: no data for ${clean}`);

    const parsed = this.parseScreenerPage(html, clean, url);
    if (!parsed) throw new Error(`Screener: failed to parse fundamentals for ${clean}`);
    return parsed;
  }

  private async fetchPage(url: string): Promise<string> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (resp.status === 404) throw new Error('Screener: company not found (404)');
      if (resp.status === 429) throw new Error('Screener: rate limited (429)');
      if (!resp.ok) throw new Error(`Screener HTTP ${resp.status}: ${resp.statusText}`);
      return resp.text();
    }, RETRY_OPTS);
  }

  private parseScreenerPage(html: string, symbol: string, url: string): FinancialData | null {
    const revenueGrowth = this.extractRangeTablePercent(html, 'Compounded Sales Growth', 'TTM')
      ?? this.extractRangeTablePercent(html, 'Compounded Sales Growth', '3 Years')
      ?? this.extractRangeTablePercent(html, 'Compounded Sales Growth', '5 Years');
    const profitGrowth = this.extractRangeTablePercent(html, 'Compounded Profit Growth', 'TTM')
      ?? this.extractRangeTablePercent(html, 'Compounded Profit Growth', '3 Years')
      ?? this.extractRangeTablePercent(html, 'Compounded Profit Growth', '5 Years');
    const operatingMargin = this.extractLatestPercentFromRow(html, 'OPM %');
    const currentRatio = this.extractLatestNumberFromRow(html, 'Current Ratio');
    const dividendYield = this.extractTopRatioPercent(html, 'Dividend Yield');
    const bookValue = this.extractTopRatioNumber(html, 'Book Value');
    const marketCapCrore = this.extractTopRatioNumber(html, 'Market Cap');
    const marketCap = marketCapCrore === undefined ? undefined : marketCapCrore * 10_000_000;
    const epsGrowth = this.extractLatestGrowthFromRow(html, 'EPS in Rs');
    const fcfGrowth = this.extractLatestGrowthFromRow(html, 'Free Cash Flow');

    return {
      symbol,
      periodEnd: this.extractLatestYearEnd(html) ?? new Date().toISOString().split('T')[0],
      revenueGrowth: revenueGrowth ?? undefined,
      profitGrowth: profitGrowth ?? undefined,
      epsGrowth: epsGrowth ?? undefined,
      fcfGrowth: fcfGrowth ?? undefined,
      operatingMargin: operatingMargin ?? undefined,
      currentRatio: currentRatio ?? undefined,
      dividendYield: dividendYield ?? undefined,
      bookValue: bookValue ?? undefined,
      marketCap,
      _raw: {
        source: 'Screener.in live HTML',
        url,
        extractedMetrics: {
          revenueGrowth,
          profitGrowth,
          epsGrowth,
          fcfGrowth,
          operatingMargin,
          currentRatio,
          dividendYield,
          bookValue,
          marketCap,
        },
      },
    };
  }

  private extractRangeTablePercent(html: string, title: string, label: string): number | undefined {
    const table = this.extractTableContaining(html, title);
    if (!table) return undefined;
    const re = new RegExp(`<td>\\s*${this.escape(label)}:\\s*</td>\\s*<td>\\s*([-\\d.]+)%\\s*</td>`, 'i');
    return this.percent((table.match(re) || [])[1]);
  }

  private extractTopRatioNumber(html: string, label: string): number | undefined {
    const item = this.extractListItemContaining(html, label);
    if (!item) return undefined;
    return this.number((item.match(new RegExp('<span class="number">([^<]+)</span>', 'i')) || [])[1]);
  }

  private extractTopRatioPercent(html: string, label: string): number | undefined {
    const value = this.extractTopRatioNumber(html, label);
    return value === undefined ? undefined : value / 100;
  }

  private extractLatestPercentFromRow(html: string, rowLabel: string): number | undefined {
    const value = this.extractLatestNumberFromRow(html, rowLabel);
    return value === undefined ? undefined : value / 100;
  }

  private extractLatestGrowthFromRow(html: string, rowLabel: string): number | undefined {
    const values = this.extractNumbersFromRow(html, rowLabel);
    if (values.length < 2) return undefined;
    const previous = values[values.length - 2];
    const latest = values[values.length - 1];
    if (previous === 0) return undefined;
    return (latest - previous) / Math.abs(previous);
  }

  private extractLatestNumberFromRow(html: string, rowLabel: string): number | undefined {
    const values = this.extractNumbersFromRow(html, rowLabel);
    return values.length ? values[values.length - 1] : undefined;
  }

  private extractNumbersFromRow(html: string, rowLabel: string): number[] {
    const escaped = this.escape(rowLabel);
    const rowMatch = html.match(new RegExp(`<tr[^>]*>[\\s\\S]*?<td class="text">\\s*${escaped}\\s*</td>[\\s\\S]*?<\\/tr>`, 'i'));
    if (!rowMatch) return [];
    return [...rowMatch[0].matchAll(/([-]?[\\d,]+(?:\\.\\d+)?)\\s*%?/g)]
      .map((match) => this.number(match[1]))
      .filter((value): value is number => value !== undefined);
  }

  private extractLatestYearEnd(html: string): string | undefined {
    const years = [...html.matchAll(/Mar\\s+(20\\d{2})/g)].map((match) => Number(match[1]));
    if (!years.length) return undefined;
    return `${Math.max(...years)}-03-31`;
  }

  private extractTableContaining(html: string, label: string): string | null {
    const index = html.indexOf(label);
    if (index < 0) return null;
    const start = html.lastIndexOf('<table', index);
    const end = html.indexOf('</table>', index);
    if (start < 0 || end < 0) return null;
    return html.slice(start, end + '</table>'.length);
  }

  private extractListItemContaining(html: string, label: string): string | null {
    const index = html.indexOf(label);
    if (index < 0) return null;
    const start = html.lastIndexOf('<li', index);
    const end = html.indexOf('</li>', index);
    if (start < 0 || end < 0) return null;
    return html.slice(start, end + '</li>'.length);
  }

  private percent(raw: string | undefined): number | undefined {
    const value = this.number(raw);
    return value === undefined ? undefined : value / 100;
  }

  private number(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const parsed = Number.parseFloat(raw.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }
}
