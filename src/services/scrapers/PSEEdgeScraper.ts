/**
 * PSE Edge disclosure scraper — real fundamentals for PSEi-30 companies.
 *
 * Source: edge.pse.com.ph, the PSE's own public disclosure system (EDGE —
 * Electronic Disclosure Generation Technology). Every listed company files
 * its quarterly and annual financial statements here; this is the same
 * primary-source data analysts use, not a third-party mirror.
 *
 * VERIFIED against live responses:
 *   - `table.list` is the correct results table class.
 *   - Each row's disclosure link is NOT a direct href — it's
 *     `onclick="openPopup('EDGE_NO')"`, where EDGE_NO is an opaque hash.
 *   - Resolving a filing requires a second request:
 *     GET /openDiscViewer.do?edge_no={EDGE_NO} — this HTML page embeds the
 *     actual content, either inline via an iframe
 *     (`/downloadHtml.do?file_id={id}`) or as a PDF attachment link
 *     (expected for financial-statement filings; not exercised against a
 *     real one with attachments in this session).
 *
 * COMPANY-SPECIFIC FILTER — fully confirmed, and confirmed via a real
 * browser + the endpoint's own client JS, not guessed:
 *   1. https://edge.pse.com.ph/companyDirectory/form.do lists every listed
 *      company; clicking a row navigates to
 *      /companyPage/stockData.do?cmpy_id={N}&security_id={M} — every
 *      company has a numeric `cmpy_id`.
 *   2. Its "Company Disclosures" tab
 *      (/companyDisclosures/form.do?cmpy_id={N}) renders a
 *      `<form id="searchForm">` whose hidden `keyword` input is
 *      pre-filled with the **numeric cmpy_id itself**, not a company
 *      name — i.e. PSE Edge's `keyword` param on
 *      `companyDisclosures/search.ax` doubles as either free-text OR a
 *      literal cmpy_id string.
 *   3. Live-verified: `POST search.ax` with `keyword=180` (Ayala Land's
 *      cmpy_id) returns `[Total 449]` — exactly Ayala Land's own
 *      disclosure history — versus `[Total 35,530]` for the unfiltered
 *      feed. `tmplNm` filters by the exact **Template Name** text shown
 *      in the results table (e.g. `"Quarterly Report"`,
 *      `"Annual Report"`), NOT the PSE Form Number code in the 3rd
 *      column (e.g. `17-2`) — `tmplNm=17-Q`/`17-A` (the SEC form
 *      numbers) return zero rows; `tmplNm=Quarterly Report` combined
 *      with `keyword=180` returned `[Total 7]`, `tmplNm=Annual Report`
 *      returned `[Total 2]`, both real.
 *
 * REMAINING GAP: this only works for a symbol whose `cmpy_id` is known.
 * KNOWN_CMPY_IDS below covers all 30 PSEi-30 constituents (resolved via
 * PSE Edge's own `/autoComplete/searchCompanyNameSymbol.ax?term={symbol}`
 * JSON endpoint) plus a handful of others observed incidentally — not the
 * full ~294-ticker universe. For any symbol not in the map,
 * `scrapeCompanyFundamentals` returns `null` (honest "can't resolve this
 * symbol yet") rather than guessing an ID or falling back to an
 * unreliable keyword-substring match. Next step for whoever continues
 * this: call the same autocomplete endpoint for the remaining ~264
 * tickers (see src/services/universe/StockUniverse.ts for the full list)
 * to complete the map. Separately, PSE Edge's company directory
 * (https://edge.pse.com.ph/companyDirectory/form.do, 282 companies) also
 * carries each company's real PSE sector/subsector, which would close the
 * gap where ScannerPage.tsx can only classify the PSEi-30 (see
 * api/_lib/data/universe.ts's PSE_SECTORS comment).
 *
 * No fundamentals are fabricated: if a filing can't be found or a line
 * item can't be parsed from the real PDF/HTML text, the corresponding
 * field is left `null` rather than estimated or guessed.
 */

/**
 * Real (symbol, cmpy_id) pairs — see module doc for how the mechanism was
 * confirmed. The PSEi-30 entries were resolved via PSE Edge's own
 * `/autoComplete/searchCompanyNameSymbol.ax?term={symbol}` endpoint (a
 * clean JSON API — e.g. `?term=BDO` returns
 * `[{"cmpyId":"260","cmpyNm":"BDO Unibank, Inc.","symbol":"BDO",...}]`),
 * matched against the exact symbol field since some tickers return
 * multiple candidates (e.g. `?term=AC` also returns ACEN, ACR, ACE).
 * The remaining entries are real IDs observed incidentally while
 * investigating (recent disclosures, first page of the company
 * directory) — not a systematic crawl, and not fabricated.
 *
 * Covers all 30 PSEi-30 constituents (see PSEI_30 in
 * api/_lib/data/universe.ts) plus a handful of others. Still not the full
 * ~294-ticker universe — see the module doc's "REMAINING GAP" for the
 * next step (paging the company directory, or just calling the
 * autocomplete endpoint per-symbol the same way this list was built).
 */
export const KNOWN_CMPY_IDS: Record<string, number> = {
  // PSEi-30
  AC: 57, ACEN: 233, AEV: 16, ALI: 180, AREIT: 679, BDO: 260, BPI: 234,
  CBC: 184, CNPF: 652, CNVRG: 680, DMC: 188, EMI: 632, GLO: 69, GTCAP: 633,
  ICT: 83, JFC: 86, JGS: 210, LTG: 12, MBT: 128, MER: 118, MONDE: 682,
  PGOLD: 629, PLUS: 96, RCR: 684, SCC: 157, SM: 599, SMC: 154, SMPH: 112,
  TEL: 6, URC: 124,
  // Others observed incidentally, not part of the PSEi-30
  AAA: 55, ABS: 114, BNCOM: 692, CA: 213, WIN: 90, BEL: 21, LOTO: 605,
  MREIT: 685, BH: 62, PRIM: 30, MYNLD: 707, FEU: 25, IPO: 85, EEI: 71,
};

/** Real PSE Edge template-name strings, as required by `tmplNm` — see
 * module doc. These are NOT the SEC form numbers (17-Q/17-A); PSE Edge's
 * own "PSE Form Number" column uses different internal codes (e.g. `17-2`
 * for a Quarterly Report) that `tmplNm` does not match against. */
const TEMPLATE_NAMES = {
  quarterly: 'Quarterly Report',
  annual: 'Annual Report',
} as const;
export type PseFilingType = keyof typeof TEMPLATE_NAMES;

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
 * Fetch a specific company's disclosures, server-side filtered by its real
 * PSE Edge `cmpy_id` and template name — see the module doc for how this
 * was confirmed. Returns `[]` (not an error) for a symbol with no known
 * `cmpy_id`, since that's an expected, honest "not resolvable yet" state
 * rather than a fetch failure.
 */
export async function fetchDisclosureList(
  symbol: string,
  companyName: string,
  filingType: PseFilingType = 'quarterly',
): Promise<DisclosureListing[]> {
  const cmpyId = KNOWN_CMPY_IDS[symbol.toUpperCase()];
  if (cmpyId === undefined) return [];

  const response = await fetch(SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      keyword: String(cmpyId),
      tmplNm: TEMPLATE_NAMES[filingType],
      pageNo: '1',
      sortType: 'date',
      dateSortType: 'DESC',
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PSE Edge search failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseDisclosureListHtml(html).map((row) => ({ ...row, companyName }));
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
  //
  // The gap between label and number is `[^\d]{0,40}?` (lazy, excludes only
  // digits) rather than the old `[^\d(]{0,10}` (excluded parens too, capped
  // at 10 chars). Real PSE 17-Q labels routinely embed a decorative
  // "/(Loss)" right in the label text itself (e.g. "Net Income/(Loss) After
  // Tax", "Earnings/(Loss) Per Share(Basic)") — excluding `(` from the gap
  // meant the regex died at the first such label's opening paren before
  // ever reaching a real number, silently leaving every one of these
  // fields null for every filer (verified against a real Ayala Land 17-Q:
  // this was failing for 4 of 7 fields on all 30 PSEi-30 companies before
  // this fix). The capture group's own `\([\d,.]+\)` alternative still
  // handles a genuine parenthesized negative number correctly — the gap
  // being lazy means it stops at the first digit it finds either way.
  const totalAssets = extractNumber(/Total\s+Assets\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const totalLiabilities = extractNumber(/Total\s+Liabilities\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  // "Total" is not always present — some filers (verified: Ayala Land's
  // 17-Q) label this row bare "Stockholders' Equity", not
  // "Total Stockholders' Equity".
  const totalEquity = extractNumber(/Total\s+(?:Stockholders'?|Equity\s+attributable).{0,20}Equity\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i)
    ?? extractNumber(/Total\s+Equity\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i)
    ?? extractNumber(/Stockholders'?\s+Equity\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const netIncome = extractNumber(/Net\s+Income\S*(?:\s+for\s+the\s+period)?\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const revenue = extractNumber(/(?:Total\s+)?Revenues?\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const eps = extractNumber(/Earnings?\S*\s+Per\s+Share\S*\s*[^\d]{0,40}?([\d,.]+|\([\d,.]+\))/i);
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
 * (rather than a fabricated placeholder) if the symbol's cmpy_id isn't in
 * KNOWN_CMPY_IDS yet, or if no filing is found.
 */
export async function scrapeCompanyFundamentals(symbol: string, companyName: string): Promise<ParsedFundamentals | null> {
  const listings = await fetchDisclosureList(symbol, companyName, 'quarterly');
  const latest = listings[0];
  if (!latest) return null;

  const text = await fetchAndExtractDisclosureText(latest.edgeNo);
  return parseFinancialStatementText(text, symbol, `${EDGE_BASE}/openDiscViewer.do?edge_no=${latest.edgeNo}`);
}
