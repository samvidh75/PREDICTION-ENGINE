export interface ScreenerParsedResult {
  companyName: string;
  sector: string;
  industry: string;
  isin?: string;
  ratios: Record<string, string>;
  quarterlyResults: Array<Record<string, string>>;
  profitLoss: Array<Record<string, string>>;
  balanceSheet: Array<Record<string, string>>;
  cashFlow: Array<Record<string, string>>;
}

export class ScreenerParser {
  private static readonly RATIO_LABELS: Record<string, string[]> = {
    'P/E': ['Stock P/E', 'P/E', 'PE', 'P/E Ratio', 'Price to Earnings'],
    'P/B': ['P/B', 'PB', 'P/B Ratio', 'Price to Book'],
    'EPS': ['EPS', 'Earnings Per Share', 'Earnings per share'],
    'Dividend Yield': ['Dividend Yield', 'Div Yield', 'Dividend'],
    'Market Cap': ['Market Cap', 'Market Capitalization', 'Mkt Cap'],
    'ROE': ['ROE', 'Return on Equity', 'Return On Equity'],
    'ROCE': ['ROCE', 'Return on Capital Employed'],
    'Book Value': ['Book Value'],
    'Face Value': ['Face Value'],
    'Current Price': ['Current Price'],
  };

  private static readonly INDIAN_ISIN = /ISIN[:\s]*(?:<[^>]*>)*\s*([A-Z]{2}[A-Z0-9]{9}\d)/i;

  private static readonly COMPANY_H1 = /<h1[^>]*>([^<]+)<\/h1>/i;

  private static readonly SECTOR_CLASS = /class="[^"]*\bsector\b[^"]*"[^>]*>([^<]+)</i;

  private static readonly SECTOR_META = /<meta\s+name="[^"]*\bsector\b[^"]*"\s+content="([^"]+)"/i;
  private static readonly INDUSTRY_CLASS = /class="[^"]*\bindustry\b[^"]*"[^>]*>([^<]+)</i;
  private static readonly INDUSTRY_META = /<meta\s+name="[^"]*\bindustry\b[^"]*"\s+content="([^"]+)"/i;

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static stripTags(raw: string): string {
    return raw.replace(/<[^>]*>/g, '').trim();
  }

  private static parseCompanyRatios(html: string): Record<string, string> {
    const ratios: Record<string, string> = {};

    const panelMatch = html.match(/<div[^>]*class="[^"]*company-ratios[^"]*"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (!panelMatch) return ratios;

    const listHtml = panelMatch[1];
    const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let itemMatch: RegExpExecArray | null;

    while ((itemMatch = itemRegex.exec(listHtml)) !== null) {
      const itemHtml = itemMatch[1];
      const nameMatch = itemHtml.match(/<span[^>]*class="name"[^>]*>([\s\S]*?)<\/span>/i);
      if (!nameMatch) continue;
      const label = this.stripTags(nameMatch[1]);

      const valueMatch = itemHtml.match(/<span[^>]*class="[^"]*value[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      if (!valueMatch) continue;
      const value = this.stripTags(valueMatch[1]);

      for (const [key, aliases] of Object.entries(this.RATIO_LABELS)) {
        if (aliases.some(a => label.toLowerCase().includes(a.toLowerCase()))) {
          ratios[key] = value;
          break;
        }
      }
    }

    return ratios;
  }

  private static parseTablesToRecords(html: string, matchHeaders: string[]): Array<Record<string, string>> {
    const results: Array<Record<string, string>> = [];
    const tableRegex = /<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const rows: Array<Array<string>> = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cells: string[] = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(this.stripTags(cellMatch[1]));
        }
        if (cells.length > 0) rows.push(cells);
      }

      if (rows.length < 2) continue;

      const headers = rows[0];
      const headerMatch = matchHeaders.filter(h =>
        headers.some(ch => ch.toLowerCase().includes(h.toLowerCase()))
      ).length;

      if (headerMatch < 2) continue;

      for (let i = 1; i < rows.length; i++) {
        const record: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = rows[i][j] ?? '';
        }
        results.push(record);
      }
    }

    return results;
  }

  parseRatiosPage(html: string): ScreenerParsedResult {
    const companyName = html.match(ScreenerParser.COMPANY_H1)?.[1]?.trim() ?? '';
    const sector =
      html.match(ScreenerParser.SECTOR_CLASS)?.[1]?.trim()
      ?? html.match(ScreenerParser.SECTOR_META)?.[1]?.trim()
      ?? '';
    const industry =
      html.match(ScreenerParser.INDUSTRY_CLASS)?.[1]?.trim()
      ?? html.match(ScreenerParser.INDUSTRY_META)?.[1]?.trim()
      ?? '';
    const isin = html.match(ScreenerParser.INDIAN_ISIN)?.[1]?.trim();

    const ratios = ScreenerParser.parseCompanyRatios(html);
    const hasAnyRatio = Object.keys(ratios).length > 0;

    const quarterlyResults = ScreenerParser.parseTablesToRecords(html, ['Quarter', 'Revenue']);
    const profitLoss = ScreenerParser.parseTablesToRecords(html, ['Revenue', 'Profit']);
    const balanceSheet = ScreenerParser.parseTablesToRecords(html, ['Assets', 'Liabilities']);
    const cashFlow = ScreenerParser.parseTablesToRecords(html, ['Cash Flow', 'Operations', 'Investing']);

    const result: ScreenerParsedResult = {
      companyName,
      sector,
      industry,
      isin: isin || undefined,
      ratios,
      quarterlyResults,
      profitLoss,
      balanceSheet,
      cashFlow,
    };

    if (!hasAnyRatio) {
      throw new Error('PROVIDER_SCHEMA_DRIFT: No known ratio anchors found in Screener.in HTML');
    }

    return result;
  }

  parseQuarterlyResults(html: string): Array<Record<string, string>> {
    return ScreenerParser.parseTablesToRecords(html, ['Quarter', 'Revenue']);
  }

  parseShareholding(html: string): {
    promoterHolding: string | null;
    institutionalHolding: string | null;
    publicHolding: string | null;
    pledgedPromoterHolding: string | null;
  } {
    const extractPct = (label: string): string | null => {
      const esc = ScreenerParser.escapeRegex(label);
      const p = new RegExp(`${esc}[^<]*<[^>]*>([^<]+)`, 'i');
      const m = html.match(p);
      if (m) {
        const val = ScreenerParser.stripTags(m[1]);
        return val || null;
      }
      return null;
    };

    return {
      promoterHolding: extractPct('Promoter'),
      institutionalHolding: extractPct('Institutional'),
      publicHolding: extractPct('Public'),
      pledgedPromoterHolding: extractPct('Pledged'),
    };
  }

  parseCorporateActions(html: string): Array<{
    actionType: string;
    exDate: string;
    recordDate: string | null;
    valueText: string | null;
  }> {
    const records: Array<{
      actionType: string;
      exDate: string;
      recordDate: string | null;
      valueText: string | null;
    }> = [];

    const rawRecords = ScreenerParser.parseTablesToRecords(html, ['Action', 'ExDate', 'Record Date']);
    for (const rec of rawRecords) {
      const vals = Object.values(rec);
      if (vals.length < 2) continue;
      records.push({
        actionType: vals[0] ?? '',
        exDate: vals[1] ?? '',
        recordDate: vals.length > 2 ? (vals[2] || null) : null,
        valueText: vals.length > 3 ? (vals[3] || null) : null,
      });
    }

    return records;
  }
}
