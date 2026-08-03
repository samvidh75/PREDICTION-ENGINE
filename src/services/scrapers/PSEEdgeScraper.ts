/**
 * PSE Edge disclosure scraper — real fundamentals for PSEi-30 companies.
 *
 * Source: edge.pse.com.ph, the PSE's own public disclosure system (EDGE —
 * Electronic Disclosure Generation Technology). Every listed company files
 * its quarterly (SEC Form 17-Q) and annual (17-A) financial statements
 * here; this is the same primary-source data analysts use, not a
 * third-party mirror.
 *
 * VERIFIED against a live response (unlike the previous version of this
 * file, which was entirely best-effort/unconfirmed):
 *   - `table.list` is the correct results table class (confirmed via a
 *     direct GET to /companyDisclosures/search.ax).
 *   - Each row's disclosure link is NOT a direct href — it's
 *     `onclick="openPopup('EDGE_NO')"`, where EDGE_NO is an opaque hash.
 *   - Resolving a filing requires a second request:
 *     GET /openDiscViewer.do?edge_no={EDGE_NO} — this HTML page embeds the
 *     actual content, either inline via an iframe
 *     (`/downloadHtml.do?file_id={id}`, seen for e.g. "Daily Trading
 *     Information") or as a PDF attachment link (expected for 17-Q/17-A
 *     financial statements, not confirmed against an actual 17-Q in this
 *     session — attachment markup for a filing with real attachments was
 *     not observed).
 *
 * STILL UNVERIFIED — the company-specific filter: POSTing
 * `keyword=<company name>` (with or without `tmplNm`) to search.ax
 * returned "no data." in every combination tried (plain ticker, full
 * legal name, with/without a form-type filter). The unfiltered GET (no
 * keyword) does return real, current disclosures across all companies,
 * so the endpoint itself works — the exact parameter PSE Edge expects for
 * server-side company filtering (possibly a numeric `cmpyId` resolved via
 * a separate autocomplete endpoint, not free-text `keyword`) is not
 * confirmed. `fetchDisclosureList()` below works around this by fetching
 * the unfiltered recent list and filtering rows client-side by company
 * name substring match against each row's title — this only catches
 * disclosures whose title happens to include the company name (as some,
 * but not all, row titles do), so it will under-report, not over-report.
 * Before relying on this for real fundamentals ingestion, someone with
 * browser access to edge.pse.com.ph should inspect the real search form's
 * network request (dev tools, not curl) to find the true filter
 * parameter — likely a `cmpyId` populated from a company-name autocomplete
 * dropdown rather than typed free text.
 *
 * No fundamentals are fabricated: if a filing can't be found or a line
 * item can't be parsed from the real PDF/HTML text, the corresponding
 * field is left `null` rather than estimated or guessed.
 */

import * as cheerio from 'cheerio';

export interface DisclosureListing {
  companyName: string;
  formType: string;
  title: string;
  filingDate: string;
  edgeNo: string;
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
const USER_AGENT = 'Mozilla/5.0 (compatible; StockExResearchBot/1.0; +https://stockstory-ph.com)';

/**
 * Fetch the most recent disclosures across all PSE-listed companies and
 * filter client-side by company-name substring in the row title.
 *
 * `formType` narrows to a specific SEC form (e.g. "17-Q", "17-A") by
 * matching against the "PSE Form Number" column, since server-side
 * `tmplNm` filtering could not be confirmed working (see module doc).
 */
export async function fetchDisclosureList(
  companyName: string,
  formType: '17-Q' | '17-A' = '17-Q',
): Promise<DisclosureListing[]> {
  const response = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ pageNo: '1', sortType: 'date', dateSortType: 'DESC' }).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PSE Edge search failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  const all = parseDisclosureListHtml(html);

  const needle = companyName.trim().toLowerCase();
  return all
    .filter((row) => row.title.toLowerCase().includes(needle) && row.formType === formType)
    .map((row) => ({ ...row, companyName }));
}

/**
 * Parse PSE Edge's disclosure search results table.
 * Real columns (confirmed live): Template Name | Announce Date and Time |
 * PSE Form Number | Report or Circular Number. The row's `edge_no` is
 * extracted from `onclick="openPopup('EDGE_NO')"`, not from an href.
 */
export function parseDisclosureListHtml(html: string): DisclosureListing[] {
  const $ = cheerio.load(html);
  const rows: DisclosureListing[] = [];

  $('table.list tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length < 4) return;

    const title = $(cells[0]).text().trim();
    const filingDate = $(cells[1]).text().trim();
    const formType = $(cells[2]).text().trim();
    if (!title || title === 'no data.') return;

    const onclick = $(cells[0]).find('a').attr('onclick') ?? '';
    const match = onclick.match(/openPopup\('([^']+)'\)/);
    const edgeNo = match?.[1] ?? '';
    if (!edgeNo) return;

    rows.push({ companyName: '', formType, title, filingDate, edgeNo });
  });

  return rows;
}

/**
 * Resolve an `edge_no` to its actual content — either an inline HTML
 * viewer (`/downloadHtml.do?file_id=`) or a PDF attachment, and return
 * the extracted text either way.
 *
 * Confirmed live for a non-financial disclosure type (inline HTML path);
 * the PDF-attachment path (expected for 17-Q/17-A filings, which are
 * filed as PDFs) is implemented per the same viewer page's markup
 * pattern but was not exercised against a real 17-Q in this session.
 */
export async function fetchAndExtractDisclosureText(edgeNo: string): Promise<string> {
  const viewerResponse = await fetch(`${EDGE_BASE}/openDiscViewer.do?edge_no=${encodeURIComponent(edgeNo)}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!viewerResponse.ok) throw new Error(`PSE Edge viewer fetch failed: HTTP ${viewerResponse.status}`);

  const viewerHtml = await viewerResponse.text();
  const $ = cheerio.load(viewerHtml);

  // Path A: PDF attachment (expected for financial statements).
  const pdfHref = $('a[href$=".pdf"]').first().attr('href');
  if (pdfHref) {
    const pdfUrl = pdfHref.startsWith('http') ? pdfHref : `${EDGE_BASE}${pdfHref.startsWith('/') ? '' : '/'}${pdfHref}`;
    return fetchAndExtractPdfText(pdfUrl);
  }

  // Path B: inline HTML content via iframe (confirmed for at least one
  // disclosure type).
  const iframeSrc = $('iframe#viewContents').attr('src') ?? $('iframe').first().attr('src');
  if (!iframeSrc) throw new Error(`No PDF attachment or content iframe found for edge_no=${edgeNo}`);

  const contentUrl = iframeSrc.startsWith('http') ? iframeSrc : `${EDGE_BASE}${iframeSrc.startsWith('/') ? '' : '/'}${iframeSrc}`;
  const contentResponse = await fetch(contentUrl, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!contentResponse.ok) throw new Error(`PSE Edge content fetch failed: HTTP ${contentResponse.status}`);
  const contentHtml = await contentResponse.text();
  return cheerio.load(contentHtml)('body').text();
}

/**
 * Download a filed PDF and extract its raw text via pdf-parse. Network
 * failures propagate — callers should catch and record the failure rather
 * than substitute placeholder data.
 */
export async function fetchAndExtractPdfText(pdfUrl: string): Promise<string> {
  const response = await fetch(pdfUrl, {
    headers: { 'User-Agent': USER_AGENT },
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
 * Extract known 17-Q/17-A line items from raw filing text via label-anchored
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
 * (rather than a fabricated placeholder) if no filing is found.
 */
export async function scrapeCompanyFundamentals(symbol: string, companyName: string): Promise<ParsedFundamentals | null> {
  const listings = await fetchDisclosureList(companyName, '17-Q');
  const latest = listings[0];
  if (!latest) return null;

  const text = await fetchAndExtractDisclosureText(latest.edgeNo);
  return parseFinancialStatementText(text, symbol, `${EDGE_BASE}/openDiscViewer.do?edge_no=${latest.edgeNo}`);
}
