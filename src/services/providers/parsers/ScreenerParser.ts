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

  private static decodeHtml(raw: string): string {
    return raw
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private static parseGenericTableRows(tableHtml: string): string[][] {
    const rows: string[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(this.decodeHtml(this.stripTags(cellMatch[1])));
      }
      if (cells.length > 0) rows.push(cells);
    }

    return rows;
  }

  private static findTableNearHeading(html: string, heading: string): string | null {
    const escaped = this.escapeRegex(heading);
    const match = html.match(new RegExp(`${escaped}[\\s\\S]{0,5000}?<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\\s\\S]*?)<\\/table>`, 'i'));
    return match?.[1] ?? null;
  }

  private static matchesAlias(label: string, alias: string): boolean {
    const a = alias.toLowerCase();
    const l = label.toLowerCase();
    if (a.length <= 3) {
      return new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(l);
    }
    return l.includes(a);
  }

  private static findRow(rows: string[][], aliases: string[]): string[] | null {
    for (const row of rows) {
      const label = (row[0] ?? '').toLowerCase();
      if (aliases.some((alias) => this.matchesAlias(label, alias))) {
        return row;
      }
    }
    return null;
  }

  private static parseCompanyRatios(html: string): Record<string, string> {
    const ratios: Record<string, string> = {};

    const panelMatch = html.match(/<div[^>]*class="[^"]*company-ratios[^"]*"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (panelMatch) {
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
          if (aliases.some(a => this.matchesAlias(label, a))) {
            ratios[key] = value;
            break;
          }
        }
      }
    }

    if (Object.keys(ratios).length > 0) {
      return ratios;
    }

    const genericTableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = genericTableRegex.exec(html)) !== null) {
      const rows = this.parseGenericTableRows(tableMatch[1]);
      for (const row of rows) {
        if (row.length < 2) continue;
        const label = row[0];
        const value = row[1];
        for (const [key, aliases] of Object.entries(this.RATIO_LABELS)) {
          if (aliases.some((alias) => this.matchesAlias(label, alias))) {
            ratios[key] = value;
            break;
          }
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
    const extractFromRows = (rows: string[][]) => {
      const promoterRow = ScreenerParser.findRow(rows, ['promoters', 'promoter']);
      const fiiRow = ScreenerParser.findRow(rows, ['fiis', 'fii']);
      const diiRow = ScreenerParser.findRow(rows, ['diis', 'dii']);
      const institutionalRow = ScreenerParser.findRow(rows, ['institutional', 'institutions', 'institutional investors']);
      const publicRow = ScreenerParser.findRow(rows, ['public']);
      const pledgedRow = ScreenerParser.findRow(rows, ['pledged']);
      const firstValue = (row: string[] | null): string | null => {
        if (!row) return null;
        return row.slice(1).find((cell) => /\d/.test(cell)) ?? null;
      };
      const institutionalParts = [firstValue(institutionalRow), firstValue(fiiRow), firstValue(diiRow)]
        .filter(Boolean) as string[];
      return {
        promoterHolding: firstValue(promoterRow),
        institutionalHolding: institutionalParts.length > 0 ? institutionalParts.join(' + ') : null,
        publicHolding: firstValue(publicRow),
        pledgedPromoterHolding: firstValue(pledgedRow),
      };
    };

    const tableHtml = ScreenerParser.findTableNearHeading(html, 'Shareholding Pattern');
    if (tableHtml) {
      return extractFromRows(ScreenerParser.parseGenericTableRows(tableHtml).slice(1));
    }

    const genericTableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let genericMatch: RegExpExecArray | null;
    while ((genericMatch = genericTableRegex.exec(html)) !== null) {
      const rows = ScreenerParser.parseGenericTableRows(genericMatch[1]);
      const parsed = extractFromRows(rows.slice(1));
      if (parsed.promoterHolding || parsed.institutionalHolding || parsed.publicHolding) {
        return parsed;
      }
    }

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
