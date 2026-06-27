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
  private static readonly KNOWN_RATIO_ANCHORS: Record<string, string[]> = {
    'P/E': ['P/E', 'PE', 'P/E Ratio', 'Price to Earnings'],
    'P/B': ['P/B', 'PB', 'P/B Ratio', 'Price to Book'],
    'Earnings per share': ['Earnings per share', 'EPS', 'EPS (TTM)', 'Earnings Per Share'],
    'Dividend Yield': ['Dividend Yield', 'Div Yield', 'Dividend'],
    'Beta': ['Beta'],
    'Market Cap': ['Market Cap', 'Market Capitalization', 'Mkt Cap'],
    'Free Float': ['Free Float'],
    'FCF Yield': ['FCF Yield', 'Free Cash Flow Yield'],
    'EV/EBITDA': ['EV/EBITDA', 'Enterprise Value/EBITDA'],
    'ROA': ['ROA', 'Return on Assets', 'Return On Assets'],
    'ROE': ['ROE', 'Return on Equity', 'Return On Equity'],
    'ROCE': ['ROCE', 'Return on Capital Employed'],
    'ROIC': ['ROIC', 'Return on Invested Capital', 'Return On Invested Capital'],
    'Debt to Equity': ['Debt to Equity', 'D/E', 'Debt/Equity'],
    'Current Ratio': ['Current Ratio'],
    'Revenue Growth': ['Revenue Growth', 'Sales Growth'],
    'Profit Growth': ['Profit Growth', 'Net Profit Growth'],
    'EPS Growth': ['EPS Growth'],
    'FCF Growth': ['FCF Growth'],
    'Gross Margin': ['Gross Margin', 'Gross Profit Margin'],
    'Operating Margin': ['Operating Margin', 'Operating Profit Margin'],
    'Net Margin': ['Net Margin', 'Net Profit Margin'],
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

  private static extractCellValue(html: string, label: string): string | null {
    const esc = this.escapeRegex(label);

    const patterns = [
      new RegExp(`<td[^>]*>\\s*${esc}\\s*<\\/td>\\s*<td[^>]*>\\s*([^<]+?)\\s*<\\/td>`, 'i'),
      new RegExp(`<span[^>]*>\\s*${esc}\\s*<\\/span>\\s*<span[^>]*>\\s*([^<]+?)\\s*<\\/span>`, 'i'),
      new RegExp(`<th[^>]*>\\s*${esc}\\s*<\\/th>\\s*<td[^>]*>\\s*([^<]+?)\\s*<\\/td>`, 'i'),
      new RegExp(`<div[^>]*>\\s*${esc}\\s*<\\/div>\\s*<div[^>]*>\\s*([^<]+?)\\s*<\\/div>`, 'i'),
      new RegExp(`<dt[^>]*>\\s*${esc}\\s*<\\/dt>\\s*<dd[^>]*>\\s*([^<]+?)\\s*<\\/dd>`, 'i'),
    ];

    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m) return this.stripTags(m[1]);
    }

    return null;
  }

  private static parseTablesToRecords(html: string, matchHeaders: string[]): Array<Record<string, string>> {
    const results: Array<Record<string, string>> = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
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

    const ratios: Record<string, string> = {};
    let anchorFound = false;

    for (const [key, aliases] of Object.entries(ScreenerParser.KNOWN_RATIO_ANCHORS)) {
      for (const alias of aliases) {
        const value = ScreenerParser.extractCellValue(html, alias);
        if (value !== null && value !== '') {
          ratios[key] = value;
          anchorFound = true;
          break;
        }
      }
    }

    if (!anchorFound) {
      throw new Error('PROVIDER_SCHEMA_DRIFT: No known ratio anchors found in Screener.in HTML');
    }

    const quarterlyResults = ScreenerParser.parseTablesToRecords(html, ['Quarter', 'Revenue']);
    const profitLoss = ScreenerParser.parseTablesToRecords(html, ['Revenue', 'Profit']);
    const balanceSheet = ScreenerParser.parseTablesToRecords(html, ['Assets', 'Liabilities', 'Equity']);
    const cashFlow = ScreenerParser.parseTablesToRecords(html, ['Cash Flow', 'Operations', 'Investing']);

    return {
      companyName,
      sector,
      industry,
      isin,
      ratios,
      quarterlyResults,
      profitLoss,
      balanceSheet,
      cashFlow,
    };
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
      const tableValue = ScreenerParser.extractCellValue(html, label);
      if (tableValue) return tableValue;
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
