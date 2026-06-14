// src/services/providers/parsers/MoneycontrolParser.ts
// Regex-based parser for Moneycontrol.com HTML pages. No DOM parser dependency.

export interface MoneycontrolFinancialsParsed {
  ratios: Record<string, string>;
  profitLoss: Array<Record<string, string>>;
  balanceSheet: Array<Record<string, string>>;
  cashFlow: Array<Record<string, string>>;
}

export interface MoneycontrolShareholdingParsed {
  promoterHolding: string | null;
  institutionalHolding: string | null;
  publicHolding: string | null;
}

export interface MoneycontrolCorporateActionsParsed {
  dividends: Array<{ exDate: string; dividendPerShare: string; type: string }>;
  splits: Array<{ exDate: string; ratio: string }>;
  bonuses: Array<{ exDate: string; ratio: string }>;
}

const KNOWN_RATIOS: ReadonlyArray<string> = [
  'P/E', 'P/B', 'EPS', 'Dividend Yield', 'ROE', 'ROCE',
  'Debt to Equity', 'Current Ratio', 'Operating Margin', 'Net Margin',
  'Gross Margin', 'Revenue Growth', 'Profit Growth', 'EV/EBITDA',
];

const SCHEMA_DRIFT_MSG =
  'PROVIDER_SCHEMA_DRIFT: Moneycontrol page structure changed — no known ratio anchors found';

const NO_QUARTERLY_MSG =
  'PROVIDER_SCHEMA_DRIFT: No quarterly results table found on Moneycontrol page';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract the value cell next to a known ratio label in a table row. */
function extractRatioValue(label: string, html: string): string | null {
  const esc = escapeRegex(label);
  const patterns = [
    // <td>Label</td><td><span>value</span></td>
    new RegExp(
      `<td[^>]*>\\s*${esc}\\s*<\\/td>\\s*<td[^>]*>\\s*<span[^>]*>\\s*([^<]+?)\\s*<\\/span>\\s*<\\/td>`,
      'i',
    ),
    // <td>Label</td><td>value</td>
    new RegExp(
      `<td[^>]*>\\s*${esc}\\s*<\\/td>\\s*<td[^>]*>\\s*([^<]+?)\\s*<\\/td>`,
      'i',
    ),
    // Label followed closely by a cell
    new RegExp(
      `${esc}[\\s\\S]{0,80}?<td[^>]*>\\s*([\\d,.%\\-—–/]+)\\s*<\\/td>`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const v = m[1].trim();
      if (v && v !== '&nbsp;' && v !== '-' && v !== '\u2014' && v !== '\u2013') {
        return v;
      }
    }
  }
  return null;
}

/** Extract table rows from a <table> inner-HTML string. */
function extractTableRows(tableInner: string): Array<Array<string>> {
  const rows: Array<Array<string>> = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableInner)) !== null) {
    const cells: Array<string> = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const content = cellMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, '')
        .trim();
      cells.push(content);
    }
    if (cells.length >= 2) {
      rows.push(cells);
    }
  }
  return rows;
}

/** Find a table that appears near a section header. */
function extractTableSection(
  headerName: string,
  html: string,
): Array<Record<string, string>> {
  const results: Array<Record<string, string>> = [];
  const esc = escapeRegex(headerName);
  const sectionRegex = new RegExp(
    `${esc}[\\s\\S]{0,300}?<table[^>]*>([\\s\\S]*?)<\\/table>`,
    'i',
  );
  const sectionMatch = html.match(sectionRegex);
  if (!sectionMatch) return results;

  const rows = extractTableRows(sectionMatch[1]);
  for (const cells of rows) {
    const row: Record<string, string> = {};
    cells.forEach((cell, idx) => {
      row[`col${idx}`] = cell;
    });
    results.push(row);
  }

  return results;
}

/** Extract a named field from a quote page. */
function extractQuoteField(fieldName: string, html: string): string | null {
  const esc = escapeRegex(fieldName);
  const patterns = [
    new RegExp(
      `${esc}[\\s\\S]{0,100}?<span[^>]*class="[^"]*\\b(?:value|num|data|b_)[^"]*"[^>]*>\\s*([^<]+?)\\s*<\\/span>`,
      'i',
    ),
    new RegExp(
      `${esc}[\\s\\S]{0,50}?<td[^>]*>\\s*([^<]+?)\\s*<\\/td>`,
      'i',
    ),
    new RegExp(
      `<span[^>]*class="[^"]*\\b${esc.toLowerCase()}\\b[^"]*"[^>]*>\\s*([^<]+?)\\s*<\\/span>`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const v = m[1].trim();
      if (v && v !== '&nbsp;' && v !== '-' && v !== '\u2014') return v;
    }
  }
  return null;
}

/** Find a shareholding percentage by matching a row label. */
function extractShareholdingPct(labels: Array<string>, html: string): string | null {
  const alt = labels.join('|');
  const patterns = [
    new RegExp(
      `<td[^>]*>\\s*(${alt})\\s*<\\/td>\\s*<td[^>]*>\\s*([^<]+?)\\s*<\\/td>`,
      'i',
    ),
    new RegExp(
      `(${alt})[\\s\\S]{0,80}?<td[^>]*>\\s*([\\d.]+\\s*%)`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const v = m[2].trim();
      if (v && v !== '&nbsp;' && v !== '-') return v;
    }
  }
  for (const label of labels) {
    const v = extractRatioValue(label, html);
    if (v !== null) return v;
  }
  return null;
}

export class MoneycontrolParser {

  parseFinancialsPage(html: string): MoneycontrolFinancialsParsed {
    const ratios: Record<string, string> = {};
    let anchorFound = false;

    for (const label of KNOWN_RATIOS) {
      const val = extractRatioValue(label, html);
      if (val !== null) {
        ratios[label] = val;
        anchorFound = true;
      }
    }

    if (!anchorFound) {
      throw new Error(SCHEMA_DRIFT_MSG);
    }

    const profitLoss = extractTableSection('Profit & Loss', html);
    const balanceSheet = extractTableSection('Balance Sheet', html);
    const cashFlow = extractTableSection('Cash Flow', html);

    return { ratios, profitLoss, balanceSheet, cashFlow };
  }

  parseQuarterlyResults(html: string): Array<Record<string, string>> {
    const results = extractTableSection('Quarterly Results', html);
    if (results.length === 0) {
      const alt = extractTableSection('Quarterly', html);
      if (alt.length === 0) {
        const sniff = /<td[^>]*>\s*(?:Dec|Mar|Jun|Sep)\s+\d{4}\s*<\/td>/i;
        if (!sniff.test(html)) {
          throw new Error(NO_QUARTERLY_MSG);
        }
      }
      return alt;
    }
    return results;
  }

  parseShareholding(html: string): MoneycontrolShareholdingParsed {
    const promoterHolding = extractShareholdingPct(
      ['Promoters', 'Promoter', 'Promoter Group'],
      html,
    );
    const institutionalHolding = extractShareholdingPct(
      ['Institutional', 'Institutions', 'Institutional Investors', 'FI', 'DII', 'FII'],
      html,
    );
    const publicHolding = extractShareholdingPct(
      ['Public', 'Non Institutional', 'Retail', 'Public Shareholding'],
      html,
    );

    return { promoterHolding, institutionalHolding, publicHolding };
  }

  parseCorporateActions(html: string): MoneycontrolCorporateActionsParsed {
    const dividends: Array<{ exDate: string; dividendPerShare: string; type: string }> = [];
    const splits: Array<{ exDate: string; ratio: string }> = [];
    const bonuses: Array<{ exDate: string; ratio: string }> = [];

    const divSection = html.match(/Dividends?[\s\S]{0,300}?<table[^>]*>([\s\S]*?)<\/table>/i);
    if (divSection) {
      const rows = extractTableRows(divSection[1]);
      for (const row of rows) {
        if (row.length >= 2) {
          dividends.push({
            exDate: row[0],
            dividendPerShare: row[1],
            type: row[2] || 'Final',
          });
        }
      }
    }

    const splitSection = html.match(/Splits?[\s\S]{0,300}?<table[^>]*>([\s\S]*?)<\/table>/i);
    if (splitSection) {
      const rows = extractTableRows(splitSection[1]);
      for (const row of rows) {
        if (row.length >= 2) {
          splits.push({ exDate: row[0], ratio: row[1] });
        }
      }
    }

    const bonusSection = html.match(/Bonus(?:es)?[\s\S]{0,300}?<table[^>]*>([\s\S]*?)<\/table>/i);
    if (bonusSection) {
      const rows = extractTableRows(bonusSection[1]);
      for (const row of rows) {
        if (row.length >= 2) {
          bonuses.push({ exDate: row[0], ratio: row[1] });
        }
      }
    }

    return { dividends, splits, bonuses };
  }

  parseQuotePage(html: string): {
    price: string;
    change: string;
    percentChange: string;
    open: string;
    high: string;
    low: string;
    volume: string;
    marketCap: string;
  } {
    return {
      price:
        extractQuoteField('Last Price', html) ||
        extractQuoteField('LTP', html) ||
        extractQuoteField('price', html) ||
        '',
      change:
        extractQuoteField('Change', html) ||
        extractQuoteField('Chg', html) ||
        '',
      percentChange:
        extractQuoteField('% Chg', html) ||
        extractQuoteField('Change%', html) ||
        extractQuoteField('percent', html) ||
        '',
      open:
        extractQuoteField('Open', html) ||
        extractQuoteField('Today Open', html) ||
        '',
      high:
        extractQuoteField('High', html) ||
        extractQuoteField('Day High', html) ||
        '',
      low:
        extractQuoteField('Low', html) ||
        extractQuoteField('Day Low', html) ||
        '',
      volume:
        extractQuoteField('Volume', html) ||
        extractQuoteField('Total Traded Qty', html) ||
        extractQuoteField('Vol', html) ||
        '',
      marketCap:
        extractQuoteField('Market Cap', html) ||
        extractQuoteField('Mkt Cap', html) ||
        extractQuoteField('Market Capitalisation', html) ||
        '',
    };
  }
}
