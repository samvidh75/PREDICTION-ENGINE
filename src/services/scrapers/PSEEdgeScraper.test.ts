import { describe, expect, it } from 'vitest';
import { parseDisclosureListHtml, parseFinancialStatementText } from './PSEEdgeScraper';

describe('parseFinancialStatementText', () => {
  it('extracts real line items from realistic 17-Q statement text', () => {
    const text = `
      Statement of Financial Position
      For the Quarter Ended March 31, 2026
      Total Assets 4,567,890
      Total Liabilities 2,345,678
      Total Stockholders' Equity 2,222,212
      Net Income for the period 123,456
      Total Revenues 987,654
      Earnings Per Share 1.85
      Number of Shares Outstanding 66,758
    `;

    const result = parseFinancialStatementText(text, 'BDO', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.symbol).toBe('BDO');
    expect(result.totalAssets).toBe(4567890);
    expect(result.totalLiabilities).toBe(2345678);
    expect(result.totalEquity).toBe(2222212);
    expect(result.netIncome).toBe(123456);
    expect(result.revenue).toBe(987654);
    expect(result.eps).toBe(1.85);
    expect(result.sharesOutstanding).toBe(66758);
    expect(result.asOfPeriod).toBe('March 31, 2026');
  });

  it('derives ROE and debt-to-equity only when their real inputs are present', () => {
    const text = `
      Total Liabilities 2,000,000
      Total Stockholders' Equity 1,000,000
      Net Income for the period 100,000
    `;
    const result = parseFinancialStatementText(text, 'JFC', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.roe).toBe(10); // 100,000 / 1,000,000 * 100
    expect(result.debtToEquity).toBe(2); // 2,000,000 / 1,000,000
  });

  it('leaves fields null rather than guessing when a line item is absent', () => {
    const text = 'Some unrelated filing text with no recognizable financial line items.';
    const result = parseFinancialStatementText(text, 'AC', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.totalAssets).toBeNull();
    expect(result.totalLiabilities).toBeNull();
    expect(result.totalEquity).toBeNull();
    expect(result.netIncome).toBeNull();
    expect(result.revenue).toBeNull();
    expect(result.eps).toBeNull();
    expect(result.sharesOutstanding).toBeNull();
    expect(result.roe).toBeNull();
    expect(result.debtToEquity).toBeNull();
    expect(result.asOfPeriod).toBeNull();
  });

  it('handles parenthesized negative values as negative numbers', () => {
    const text = `
      Net Income for the period (45,000)
      Total Stockholders' Equity 500,000
    `;
    const result = parseFinancialStatementText(text, 'SCC', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.netIncome).toBe(-45000);
    expect(result.roe).toBe(-9); // -45,000 / 500,000 * 100
  });

  it('sets scrapedAt to a valid ISO timestamp and preserves the source URL', () => {
    const result = parseFinancialStatementText('no data here', 'BPI', 'https://edge.pse.com.ph/real-filing.pdf');
    expect(result.sourceUrl).toBe('https://edge.pse.com.ph/real-filing.pdf');
    expect(() => new Date(result.scrapedAt).toISOString()).not.toThrow();
  });
});

describe('parseDisclosureListHtml', () => {
  it('parses a well-formed PSE Edge-style disclosure table', () => {
    const html = `
      <table class="list_table">
        <tbody>
          <tr>
            <td>1</td>
            <td>SEC Form 17-Q Quarterly Report</td>
            <td><a href="/openDiscViewer.do?id=12345">View</a></td>
            <td>2026-05-15</td>
          </tr>
        </tbody>
      </table>
    `;
    const rows = parseDisclosureListHtml(html, 'BDO Unibank, Inc.', '17-Q');
    expect(rows).toHaveLength(1);
    expect(rows[0].companyName).toBe('BDO Unibank, Inc.');
    expect(rows[0].formType).toBe('17-Q');
    expect(rows[0].filingDate).toBe('2026-05-15');
  });

  it('returns an empty array when no disclosure rows match (no fabricated results)', () => {
    const rows = parseDisclosureListHtml('<html><body>No results found</body></html>', 'Unknown Corp', '17-Q');
    expect(rows).toEqual([]);
  });
});
