import { describe, expect, it } from 'vitest';
import { parseDisclosureListHtml, parseFinancialStatementText, parsePublicOwnershipText, parseCompanyDirectoryHtml, withRetry } from './PSEEdgeScraper';

describe('parsePublicOwnershipText', () => {
  it('extracts real values from realistic POR-1 text (verified against a live Ayala Land filing)', () => {
    const text = `
      Report Date Jun 30, 2026
      Computation of Public Ownership
      Number of Issued Common Shares 16,712,819,848
      Less: Number of Treasury Common Shares, if any 2,421,057,779
      Number of Outstanding Common Shares 14,291,762,069
      Total Number of Shares Owned by the Public 6,409,136,845
      Public Ownership Percentage 44.84
    `;
    const result = parsePublicOwnershipText(text, 'ALI', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.reportDate).toBe('Jun 30, 2026');
    expect(result.outstandingShares).toBe(14291762069);
    expect(result.sharesOwnedByPublic).toBe(6409136845);
    expect(result.publicOwnershipPercent).toBe(44.84);
    expect(result.insiderOwnershipPercent).toBe(55.16);
  });

  it('leaves fields null when they cannot be found (no fabrication)', () => {
    const result = parsePublicOwnershipText('unrelated filing text', 'AC', 'https://edge.pse.com.ph/fake.pdf');
    expect(result.publicOwnershipPercent).toBeNull();
    expect(result.insiderOwnershipPercent).toBeNull();
  });
});

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

  it('extracts values past a decorative "/(Loss)" in the label (real PSE 17-Q formatting)', () => {
    // Real filers (verified: Ayala Land's 17-Q) label rows like this —
    // the old regex excluded "(" from the label-to-number gap entirely,
    // so it died at the first such label before ever reaching a number,
    // silently leaving every one of these fields null for every filer.
    const text = `
      Net Income/(Loss) After Tax 6,695,026 8,393,040
      Earnings/(Loss) Per Share(Basic) 0.38 0.48
      Stockholders' Equity 388,555,060 385,054,413
    `;
    const result = parseFinancialStatementText(text, 'ALI', 'https://edge.pse.com.ph/fake.pdf');

    expect(result.netIncome).toBe(6695026);
    expect(result.eps).toBe(0.38);
    expect(result.totalEquity).toBe(388555060);
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

  it('picks the real balance-sheet equity over an earlier ratio-table entry (real 17-A formatting)', () => {
    // Real Ayala Land 17-A: a "Financial Highlights" ratios table opens the
    // document with "Total Stockholders' Equity 0.83" (a Debt/Equity-style
    // ratio) BEFORE the real balance sheet's bare "Stockholders' Equity
    // 385,054,413" appears later. First-match-wins previously grabbed the
    // ratio; the fix merges candidates across both label variants and
    // prefers the comma-formatted (real monetary) one.
    const text = `
      For the fiscal year ended Dec 31, 2025
      Financial Ratios
      Total Stockholders' Equity 0.83 0.79
      Total Liabilities to Total Stockholders' Equity 2.59 2.56
      Statement of Financial Position
      Total Assets 997,363,986
      Total Liabilities 612,309,573
      Stockholders' Equity 385,054,413 358,495,815
      Net Income for the period 45,554,129
    `;
    const result = parseFinancialStatementText(text, 'ALI', 'https://edge.pse.com.ph/fake-17a.pdf');

    expect(result.asOfPeriod).toBe('Dec 31, 2025');
    expect(result.totalEquity).toBe(385054413);
    expect(result.totalAssets).toBe(997363986);
    expect(result.roe).toBeCloseTo(11.83, 1);
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

describe('parseCompanyDirectoryHtml', () => {
  // Table shape and the cmDetail('cmpyId','securityId') link pattern are
  // confirmed against a live edge.pse.com.ph company directory response —
  // this is the real markup shape, not a guess.
  it('parses company rows with sector, subsector, and cmpy_id', () => {
    const html = `
      <table class="list">
        <tbody>
          <tr>
            <td class="alignL"><a href="#" onclick="cmDetail('55','347');return false;">Asia Amalgamated Holdings Corporation</a></td>
            <td class="alignC"><a href="#" onclick="cmDetail('55','347');return false;">AAA</a></td>
            <td class="alignC">Holding Firms</td>
            <td class="alignC">Holding Firms</td>
            <td class="alignC">Mar 22, 1973</td>
          </tr>
          <tr>
            <td class="alignL"><a href="#" onclick="cmDetail('260','100');return false;">BDO Unibank, Inc.</a></td>
            <td class="alignC"><a href="#" onclick="cmDetail('260','100');return false;">BDO</a></td>
            <td class="alignC">Financials</td>
            <td class="alignC">Banks</td>
            <td class="alignC">Jun 20, 2002</td>
          </tr>
        </tbody>
      </table>
    `;
    const rows = parseCompanyDirectoryHtml(html);
    expect(rows).toHaveLength(2);

    expect(rows[0].symbol).toBe('AAA');
    expect(rows[0].companyName).toBe('Asia Amalgamated Holdings Corporation');
    expect(rows[0].sector).toBe('Holding Firms');
    expect(rows[0].subsector).toBe('Holding Firms');
    expect(rows[0].cmpyId).toBe(55);
    expect(rows[0].securityId).toBe(347);

    expect(rows[1].symbol).toBe('BDO');
    expect(rows[1].sector).toBe('Financials');
    expect(rows[1].subsector).toBe('Banks');
    expect(rows[1].cmpyId).toBe(260);
  });

  it('returns empty array when no rows match (no fabrication)', () => {
    const rows = parseCompanyDirectoryHtml('<html><body>No companies</body></html>');
    expect(rows).toEqual([]);
  });

  it('leaves cmpy_id null when the onclick pattern is absent', () => {
    const html = `
      <table class="list">
        <tbody>
          <tr>
            <td class="alignL">Some Company</td>
            <td class="alignC">X</td>
            <td class="alignC">Services</td>
            <td class="alignC">Retail</td>
            <td class="alignC">Jan 01, 2000</td>
          </tr>
        </tbody>
      </table>
    `;
    const rows = parseCompanyDirectoryHtml(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe('X');
    expect(rows[0].sector).toBe('Services');
    expect(rows[0].cmpyId).toBeNull();
  });
});

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    let calls = 0;
    const result = await withRetry(async () => { calls++; return 'ok'; });
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries transient errors and succeeds on a later attempt', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error('transient timeout');
      return 'recovered';
    }, 3, 1); // short backoff for test speed
    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('throws after exhausting all retries', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error('persistent'); }, 2, 1)).rejects.toThrow('persistent');
    expect(calls).toBe(3); // initial + 2 retries
  });
});
