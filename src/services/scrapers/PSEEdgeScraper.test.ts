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
  // Table structure and the onclick="openPopup('edge_no')" link pattern are
  // confirmed against a live edge.pse.com.ph response (see PSEEdgeScraper.ts
  // module doc) — this is the real markup shape, not a guess.
  it('parses a well-formed PSE Edge disclosure table', () => {
    const html = `
      <table class="list">
        <thead>
          <tr><th>Template Name</th><th>Announce Date and Time</th><th>PSE Form Number</th><th>Report/Circular Number</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="#viewer" onclick="openPopup('95d184d9c472822a64d70b69f0a3140b');return false;">BDO Unibank, Inc. 17-Q Quarterly Report</a></td>
            <td class="alignC">05/15/2026 04:30 PM</td>
            <td class="alignC">17-Q</td>
            <td class="alignC">C12345-2026</td>
          </tr>
        </tbody>
      </table>
    `;
    const rows = parseDisclosureListHtml(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('BDO Unibank, Inc. 17-Q Quarterly Report');
    expect(rows[0].formType).toBe('17-Q');
    expect(rows[0].filingDate).toBe('05/15/2026 04:30 PM');
    expect(rows[0].edgeNo).toBe('95d184d9c472822a64d70b69f0a3140b');
  });

  it('returns an empty array when no disclosure rows match (no fabricated results)', () => {
    const rows = parseDisclosureListHtml('<html><body>No results found</body></html>');
    expect(rows).toEqual([]);
  });

  it('skips rows with no data (the literal "no data." placeholder row)', () => {
    const html = `
      <table class="list">
        <tbody>
          <tr><td>no data.</td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
    `;
    expect(parseDisclosureListHtml(html)).toEqual([]);
  });
});
