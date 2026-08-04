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
 * COVERAGE: KNOWN_CMPY_IDS below was built by calling PSE Edge's own
 * `/autoComplete/searchCompanyNameSymbol.ax?term={symbol}` endpoint for
 * every symbol in PSE_STOCKS (api/_lib/data/universe.ts, ~294 tickers —
 * see scripts/resolve-cmpy-ids.py), matched against the exact `symbol`
 * field in the response since some terms return multiple candidates
 * (e.g. `?term=AC` also returns ACEN, ACR, ACE). 280/294 resolved. The 14
 * that didn't (ATNB, BCB, CAB, COAL, DMPA1, DMPA2, DMPI, DTEL, FJPB,
 * FYNB, LCB, MAB, MAHB, OPMB) returned no exact match — mostly preferred-
 * share/bond-style tickers PSE Edge's autocomplete doesn't index the same
 * way as common shares. Left unresolved rather than guessed; for any of
 * these, `scrapeCompanyFundamentals` returns `null` (honest "can't
 * resolve this symbol yet").
 *
 * PSE Edge's company directory (https://edge.pse.com.ph/companyDirectory/
 * form.do, 282 companies) separately carries each company's real PSE
 * sector/subsector, which would close the gap where ScannerPage.tsx can
 * only classify the PSEi-30 (see api/_lib/data/universe.ts's PSE_SECTORS
 * comment) — not pulled in here since it needs different scraping logic
 * (a paginated HTML table, not this JSON endpoint).
 *
 * No fundamentals are fabricated: if a filing can't be found or a line
 * item can't be parsed from the real PDF/HTML text, the corresponding
 * field is left `null` rather than estimated or guessed.
 */

/**
 * Real (symbol, cmpy_id) pairs for ~95% of the PSE_STOCKS universe — see
 * the module doc's COVERAGE section for exactly how this was built and
 * which 14 symbols are missing and why.
 */
export const KNOWN_CMPY_IDS: Record<string, number> = {
  AAA: 55, AB: 19, ABA: 174, ABG: 176, ABS: 114, ABSP: 15,
  AC: 57, ACE: 48, ACEN: 233, ACR: 121, AEV: 16, AGI: 212,
  ALCO: 172, ALHI: 612, ALI: 180, ALLDY: 686, ALLHC: 26, ALTER: 701,
  ANI: 619, ANS: 14, AP: 609, APC: 177, APL: 638, APO: 52,
  APVI: 678, APX: 178, AR: 33, ARA: 38, AREIT: 679, ASLAG: 694,
  AT: 34, ATN: 56, AUB: 641, AXLM: 673, BALAI: 697, BC: 108,
  BCOR: 9, BDO: 260, BEL: 21, BH: 62, BHI: 63, BLOOM: 49,
  BMM: 181, BNCOM: 692, BPI: 234, BRN: 13, BSC: 60, C: 669,
  CA: 213, CAT: 183, CBC: 184, CDC: 39, CEB: 624, CEI: 186,
  CEU: 223, CHP: 662, CIC: 648, CLI: 668, CNPF: 652, CNVRG: 680,
  COL: 601, COSCO: 50, CPG: 189, CPM: 621, CREC: 703, CREIT: 691,
  CROWN: 657, CSB: 228, CTS: 693, CYBR: 67, DD: 651, DDMPR: 681,
  DELM: 642, DFNN: 187, DHI: 31, DITO: 36, DIZ: 68, DMC: 188,
  DMW: 671, DNL: 639, DWC: 647, ECP: 70, ECVC: 46, EEI: 71,
  EG: 623, EGRN: 191, ELI: 190, EMI: 632, ENEX: 653, EURO: 219,
  EW: 634, FAF: 81, FB: 151, FCG: 689, FDC: 75, FERRO: 643,
  FEU: 25, FFI: 196, FGEN: 600, FILRT: 683, FJP: 225, FLI: 226,
  FMETF: 649, FNI: 224, FOOD: 602, FPH: 197, FPI: 220, FRUIT: 676,
  FYN: 80, GEO: 198, GERI: 193, GLO: 69, GMA7: 610, GMAP: 611,
  GPH: 221, GREEN: 132, GSMI: 94, GTCAP: 633, HI: 82, HOME: 674,
  HTI: 690, I: 613, ICT: 83, IDC: 660, IMI: 622, IMP: 201,
  INFRA: 84, ION: 203, IPM: 4, IPO: 85, IS: 204, JAS: 134,
  JFC: 86, JGS: 210, JOH: 261, KEEPR: 2, KEP: 88, KPPI: 672,
  LBC: 236, LC: 98, LFM: 227, LMG: 205, LODE: 37, LOTO: 605,
  LPC: 698, LPZ: 61, LSC: 115, LTG: 12, MA: 119, MAC: 106,
  MACAY: 145, MAH: 3, MARC: 175, MAXS: 135, MB: 1, MBC: 117,
  MBT: 128, MED: 126, MEDIC: 687, MEG: 127, MER: 118, MFC: 120,
  MFIN: 263, MG: 105, MGH: 192, MHC: 206, MJC: 102, MJIC: 24,
  MM: 677, MONDE: 682, MRC: 131, MREIT: 685, MRSGI: 659, MVC: 100,
  MWC: 270, MWIDE: 627, MYNLD: 707, NI: 103, NIKL: 625, NOW: 264,
  NRCP: 606, NXGEN: 179, OGP: 704, OM: 207, OPM: 43, ORE: 616,
  OV: 45, PA: 109, PAL: 20, PAX: 194, PBB: 640, PBC: 208,
  PCOR: 136, PERC: 578, PGOLD: 629, PHA: 148, PHC: 97, PHES: 138,
  PHN: 107, PHR: 631, PIZZA: 664, PLUS: 96, PMPC: 104, PNB: 139,
  PNC: 7, PNX: 608, PORT: 129, PPC: 150, PRC: 141, PREIT: 699,
  PRIM: 30, PRMX: 214, PSB: 142, PSE: 478, PTC: 144, PTT: 76,
  PX: 137, PXP: 628, RCB: 232, RCI: 54, RCR: 684, REDC: 702,
  REG: 153, RFM: 77, RLC: 195, RLT: 40, ROCK: 635, ROX: 64,
  RRHI: 646, SBS: 658, SCC: 157, SECB: 32, SEVN: 143, SFI: 165,
  SGI: 160, SGP: 166, SHLPH: 663, SHNG: 218, SLF: 78, SLI: 41,
  SM: 599, SMC: 154, SMPH: 112, SOC: 161, SPC: 237, SPM: 156,
  SPNEC: 688, SRDC: 479, SSI: 654, STI: 222, STN: 164, STR: 147,
  SUN: 73, T: 163, TBGI: 269, TECH: 630, TEL: 6, TFC: 8,
  TFHI: 650, TOP: 706, TUGS: 644, UBP: 167, UNH: 22, UPM: 168,
  UPSON: 700, URC: 124, V: 65, VITA: 28, VLC: 661, VLL: 607,
  VMC: 123, VREIT: 695, VVT: 79, WEB: 122, WIN: 90, WLCON: 665,
  WPI: 173, X: 656, XG: 705, ZHI: 89,
};

/** Real PSE Edge template-name strings, as required by `tmplNm` — see
 * module doc. These are NOT the SEC form numbers (17-Q/17-A); PSE Edge's
 * own "PSE Form Number" column uses different internal codes (e.g. `17-2`
 * for a Quarterly Report) that `tmplNm` does not match against. */
const TEMPLATE_NAMES = {
  quarterly: 'Quarterly Report',
  annual: 'Annual Report',
  publicOwnership: 'Public Ownership Report',
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

/**
 * From a real "Public Ownership Report" (POR-1) filing — every PSE issuer
 * files one quarterly. Confirmed live for ALI and BDO: the report gives
 * outstanding shares, shares held by directors/officers/substantial
 * shareholders (summed, not split out further), and a single
 * `publicOwnershipPercent` figure. It does NOT report a foreign/domestic
 * institutional split — that's not a real PSE disclosure category, unlike
 * the FII/DII breakdown this codebase used to show (a leftover from an
 * India-market version — see StockPage.tsx's shareholding card, which was
 * redesigned around this real shape rather than kept forcing fabricated
 * FII/DII numbers into categories PSE filings don't actually report).
 */
export interface ParsedOwnership {
  symbol: string;
  reportDate: string | null;
  outstandingShares: number | null;
  sharesOwnedByPublic: number | null;
  publicOwnershipPercent: number | null;
  /** Derived: 100 - publicOwnershipPercent, when that's present. */
  insiderOwnershipPercent: number | null;
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
 * Extract public/insider ownership from a real Public Ownership Report
 * (POR-1) filing's text. Confirmed live for ALI ("Total Number of Shares
 * Owned by the Public 6,409,136,845 Public Ownership Percentage 44.84")
 * and BDO (same label format, different real numbers) — a stable, real
 * label PSE issuers use consistently, unlike the ad-hoc line items in
 * 17-Q financial statements which vary more by filer.
 */
export function parsePublicOwnershipText(text: string, symbol: string, sourceUrl: string): ParsedOwnership {
  const normalized = text.replace(/\s+/g, ' ');

  const extractNumber = (label: RegExp): number | null => {
    const match = normalized.match(label);
    if (!match || !match[1]) return null;
    const cleaned = match[1].replace(/[,\s]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  const outstandingShares = extractNumber(/Number\s+of\s+Outstanding\s*Common\s+Shares\s*[^\d]{0,20}?([\d,.]+)/i);
  const sharesOwnedByPublic = extractNumber(/Total\s+Number\s+of\s+Shares\s+Owned\s*(?:by\s+the\s+Public)?\s*[^\d]{0,20}?([\d,.]+)/i);
  const publicOwnershipPercent = extractNumber(/Public\s+Ownership\s+Percentage\s*[^\d]{0,20}?([\d,.]+)/i);
  const reportDateMatch = normalized.match(/Report\s+Date\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

  return {
    symbol,
    reportDate: reportDateMatch?.[1] ?? null,
    outstandingShares,
    sharesOwnedByPublic,
    publicOwnershipPercent,
    insiderOwnershipPercent: publicOwnershipPercent !== null ? Number((100 - publicOwnershipPercent).toFixed(2)) : null,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * End-to-end: find a company's most recent Public Ownership Report on PSE
 * Edge, download it, and parse real ownership split out of it. Returns
 * `null` (rather than a fabricated placeholder) if the symbol's cmpy_id
 * isn't in KNOWN_CMPY_IDS yet, or if no filing is found.
 */
export async function scrapeCompanyOwnership(symbol: string, companyName: string): Promise<ParsedOwnership | null> {
  const listings = await fetchDisclosureList(symbol, companyName, 'publicOwnership');
  const latest = listings[0];
  if (!latest) return null;

  const text = await fetchAndExtractDisclosureText(latest.edgeNo);
  return parsePublicOwnershipText(text, symbol, `${EDGE_BASE}/openDiscViewer.do?edge_no=${latest.edgeNo}`);
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
