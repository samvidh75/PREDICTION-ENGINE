/**
 * PSE Edge disclosure scraper — real fundamentals for PSEi-30 companies.
 *
 * Source: edge.pse.com.ph, the PSE's own public disclosure system (EDGE —
 * Electronic Disclosure Generation Technology). Every listed company files
 * its quarterly (SEC Form 17-Q) and annual (17-A) financial statements here
 * as PDF attachments; this is the same primary-source data analysts use,
 * not a third-party mirror.
 *
 * IMPORTANT — untested in the current sandbox: this development environment
 * has no outbound network access to edge.pse.com.ph (confirmed via direct
 * fetch — only phisix-api3.appspot.com is reachable here), so the search
 * endpoint path, form field names, and HTML structure below are built from
 * documented/known PSE Edge structure, NOT verified against a live response
 * in this session. Before relying on this in production:
 *   1. Run `fetchDisclosureList()` for one company and confirm the returned
 *      HTML actually matches the selectors in `parseDisclosureListHtml()`.
 *   2. If PSE Edge has changed its markup, update the selectors — the PDF
 *      parsing logic (`parseFinancialStatementText`) is independent of this
 *      and only needs the correct PDF URL to work against.
 *
 * No fundamentals are fabricated: if a filing can't be found or a line item
 * can't be parsed from the real PDF text, the corresponding field is left
 * `null` rather than estimated or guessed.
 */

import * as cheerio from 'cheerio';

export interface DisclosureListing {
  companyName: string;
  formType: string;
  title: string;
  filingDate: string;
  pdfUrl: string;
}

export interface ParsedFundamentals {
  symbol: string;
  asOfPeriod: string | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  netIncome: number | null;
  revenue: number | null;
  eps: number | null;
  sharesOutstanding: number | null;
  /** Derived — only set when the inputs needed to compute it are present. */
  roe: number | null;
  debtToEquity: number | null;
  sourceUrl: string;
  scrapedAt: string;
}

const EDGE_BASE = 'https://edge.pse.com.ph';
const SEARCH_ENDPOINT = `${EDGE_BASE}/companyDisclosures/search.ax`;

/**
 * Search PSE Edge's disclosure list by free-text company name — this avoids
 * needing a pre-verified internal PSE Edge company-ID mapping, which isn't
 * something that could be confirmed from this sandbox. `formType` narrows
 * to a specific SEC form, e.g. "17-Q" (quarterly) or "17-A" (annual).
 */
export async function fetchDisclosureList(
  companyName: string,
  formType: '17-Q' | '17-A' = '17-Q',
): Promise<DisclosureListing[]> {
  const body = new URLSearchParams({
    keyword: companyName,
    tmplNm: formType,
    sortBy: 'disclosureDate',
    sortOrder: 'desc',
  });

  const response = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; StockExResearchBot/1.0; +https://stockstory-ph.com)',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PSE Edge search failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseDisclosureListHtml(html, companyName, formType);
}

/**
 * Parse PSE Edge's disclosure search results table. The exact class names
 * here (`.list_table`, `tr.disclosure-row`, etc.) are best-effort based on
 * PSE Edge's known table-based layout — verify against a live response
 * before depending on this in production (see module doc comment).
 */
export function parseDisclosureListHtml(
  html: string,
  companyName: string,
  formType: string,
): DisclosureListing[] {
  const $ = cheerio.load(html);
  const rows: DisclosureListing[] = [];

  $('table.list tbody tr, table.list_table tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length < 3) return;

    const title = $(cells[1]).text().trim() || $(cells[0]).text().trim();
    const filingDate = $(cells[cells.length - 1]).text().trim();
    // Prefer an explicit PDF/popup link, but fall back to any anchor in the
    // row — PSE Edge's real link pattern (direct PDF vs. an HTML viewer
    // popup) isn't confirmed in this codebase (see module doc comment).
    const link = $(el).find('a[href*=".pdf"], a[onclick*="openPopup"]').first().length
      ? $(el).find('a[href*=".pdf"], a[onclick*="openPopup"]').first()
      : $(el).find('a[href]').first();
    const hrefRaw = link.attr('href') ?? '';
    const pdfUrl = hrefRaw.startsWith('http') ? hrefRaw : hrefRaw ? `${EDGE_BASE}${hrefRaw.startsWith('/') ? '' : '/'}${hrefRaw}` : '';

    if (!pdfUrl) return;

    rows.push({ companyName, formType, title, filingDate, pdfUrl });
  });

  return rows;
}

/**
 * Download a filed PDF and extract its raw text via pdf-parse. Network
 * failures propagate — callers should catch and record the failure rather
 * than substitute placeholder data.
 */
export async function fetchAndExtractPdfText(pdfUrl: string): Promise<string> {
  const response = await fetch(pdfUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockExResearchBot/1.0)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`PDF fetch failed: HTTP ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/**
 * Extract known 17-Q/17-A line items from raw PDF text via label-anchored
 * regexes. SEC-prescribed financial statement formats are fairly
 * consistent across PSE issuers (standard IFRS line-item labels), but
 * formatting varies enough between filers that any single field may
 * legitimately fail to match — those fields are left `null`, not guessed.
 */
export function parseFinancialStatementText(text: string, symbol: string, sourceUrl: string): ParsedFundamentals {
  const normalized = text.replace(/\s+/g, ' ');

  const extractNumber = (label: RegExp): number | null => {
    const match = normalized.match(label);
    if (!match || !match[1]) return null;
    const cleaned = match[1].replace(/[,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  // Every regex below uses exactly one capturing group (the number) — any
  // label alternation/optionality is non-capturing `(?:...)` so extractNumber
  // can always safely read match[1] regardless of which label variant hit.
  const totalAssets = extractNumber(/Total\s+Assets\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const totalLiabilities = extractNumber(/Total\s+Liabilities\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const totalEquity = extractNumber(/Total\s+(?:Stockholders'?|Equity\s+attributable).{0,20}Equity\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i)
    ?? extractNumber(/Total\s+Equity\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const netIncome = extractNumber(/Net\s+Income(?:\s+for\s+the\s+period)?\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const revenue = extractNumber(/(?:Total\s+)?Revenues?\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const eps = extractNumber(/Earnings?\s+Per\s+Share\s*[^\d(]{0,10}([\d,.]+|\([\d,.]+\))/i);
  const sharesOutstanding = extractNumber(/(?:Shares?\s+Outstanding|Number\s+of\s+Shares)\s*[^\d(]{0,10}([\d,.]+)/i);

  const periodMatch = normalized.match(/(?:For\s+the\s+(?:Quarter|Period|Year)\s+Ended\s+)([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

  return {
    symbol,
    asOfPeriod: periodMatch?.[1] ?? null,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
    revenue,
    eps,
    sharesOutstanding,
    roe: netIncome !== null && totalEquity ? Number(((netIncome / totalEquity) * 100).toFixed(2)) : null,
    debtToEquity: totalLiabilities !== null && totalEquity ? Number((totalLiabilities / totalEquity).toFixed(2)) : null,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * End-to-end: find a company's most recent quarterly filing on PSE Edge,
 * download it, and parse real fundamentals out of it. Returns `null`
 * (rather than a fabricated placeholder) if no filing is found or the PDF
 * can't be fetched.
 */
export async function scrapeCompanyFundamentals(symbol: string, companyName: string): Promise<ParsedFundamentals | null> {
  const listings = await fetchDisclosureList(companyName, '17-Q');
  const latest = listings[0];
  if (!latest) return null;

  const text = await fetchAndExtractPdfText(latest.pdfUrl);
  return parseFinancialStatementText(text, symbol, latest.pdfUrl);
}
