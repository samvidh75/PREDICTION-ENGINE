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
  insiderChange: 'Statement of Changes in Beneficial Ownership of Securities',
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
  /** NOT EBITDA — real PSE filings don't report a labeled "EBITDA" line.
   * "Operating Income" is a real, present line for many filers, but is
   * genuinely absent for others (verified: BDO, a bank, reports
   * "Operating Income - - - -" i.e. not applicable — banks structure
   * their income statement differently than industrials/retailers). Left
   * `null` rather than substituted with anything when absent. */
  operatingIncome: number | null;
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

  // Like extractNumber, but scans every match of the label (not just the
  // first) and prefers a comma-formatted candidate over a bare one.
  // Annual reports (17-A, unlike quarterly 17-Q) routinely open with a
  // "Financial Highlights" ratios table before the real balance sheet —
  // e.g. a real Ayala Land 17-A has "Total Stockholders' Equity 0.83"
  // (a Debt/Equity-style ratio) appearing BEFORE "Stockholders' Equity
  // 385,054,413" (the real balance-sheet figure) — first-match-wins
  // silently grabbed the ratio. Real PSE filings always comma-format
  // large monetary totals and never comma-format ratios, so preferring
  // the comma-formatted match is a reliable, real signal, not a guess.
  // Takes one or more label variants (tried in preference order, e.g. a
  // "Total X" form and a bare "X" fallback) and merges candidates across
  // ALL of them before picking — not just within the first variant that
  // matches at all. This matters because which variant matches isn't a
  // reliable proxy for which one is real: verified on a real Ayala Land
  // 17-A, the ratio-table entry is literally "Total Stockholders' Equity
  // 0.83" (WITH "Total"), while the real balance-sheet line is bare
  // "Stockholders' Equity 385,054,413" (WITHOUT "Total") — so trying
  // "Total X" first and falling back to bare "X" only on a total *miss*
  // (via ??) would keep the first variant's wrong match forever, since it
  // does match, just the wrong thing.
  const extractLargeNumber = (...labels: RegExp[]): number | null => {
    const candidates = labels.flatMap((label) => {
      const global = new RegExp(label.source, label.flags.includes('g') ? label.flags : label.flags + 'g');
      return [...normalized.matchAll(global)].map((m) => m[1]).filter((v): v is string => Boolean(v));
    });
    if (candidates.length === 0) return null;
    const withComma = candidates.find((v) => v.includes(','));
    const cleaned = (withComma ?? candidates[0]).replace(/[,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
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
  // Gap excludes literal "-" too, not just digits: a not-applicable line
  // (verified real: BDO's "Operating Income - - - -") is rendered as
  // dashes, which aren't digits — the old [^\d] gap happily skipped over
  // them and kept extending into the NEXT line's real number, silently
  // attributing an unrelated figure to this label. Excluding "-" makes
  // any dash placeholder a hard stop instead (applied defensively to
  // every field here, even though only Operating Income was confirmed to
  // hit it in practice).
  const totalAssets = extractLargeNumber(/Total\s+Assets\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const totalLiabilities = extractLargeNumber(/Total\s+Liabilities\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  // "Total" is not always present — some filers (verified: Ayala Land's
  // 17-Q) label this row bare "Stockholders' Equity", not
  // "Total Stockholders' Equity".
  const totalEquity = extractLargeNumber(
    /Total\s+(?:Stockholders'?|Equity\s+attributable).{0,20}Equity\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i,
    /Total\s+Equity\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i,
    /Stockholders'?\s+Equity\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i,
  );
  const netIncome = extractLargeNumber(/Net\s+Income\S*(?:\s+for\s+the\s+period)?\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const revenue = extractLargeNumber(/(?:Total\s+)?Revenues?\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  // EPS is deliberately left on plain extractNumber (first match, no
  // comma preference) — a real EPS value is a small decimal and never
  // comma-formatted, so the comma-preference heuristic doesn't apply.
  const eps = extractNumber(/Earnings?\S*\s+Per\s+Share\S*\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);
  const sharesOutstanding = extractNumber(/(?:Shares?\s+Outstanding|Number\s+of\s+Shares)\s*[^\d(-]{0,10}([\d,.]+)/i);
  // "Operating Income" — real, present for many filers (verified: Ayala
  // Land, where it confirmed the dash-exclusion fix above matters: BDO's
  // real filing renders it as "Operating Income - - - -", genuinely not
  // applicable for a bank's income-statement structure) but absent for
  // others. Not EBITDA — see ParsedFundamentals's operatingIncome doc.
  const operatingIncome = extractLargeNumber(/Operating\s+Income\s*[^\d-]{0,40}?([\d,.]+|\([\d,.]+\))/i);

  // 17-A annual reports real-world label this "For the fiscal year ended"
  // (verified: Ayala Land's 17-A), not "For the Year Ended" — the old
  // pattern only matched the 17-Q wording.
  const periodMatch = normalized.match(/(?:For\s+the\s+(?:fiscal\s+)?(?:Quarter|Period|Year)\s+Ended\s+)([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

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
    operatingIncome,
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

  // Gap excludes literal "-" too — see parseFinancialStatementText's
  // dash-placeholder comment for the real-world case that motivated this
  // (not confirmed to occur in POR-1 filings specifically, but these are
  // mandatory disclosure fields so the same defensive fix costs nothing).
  const outstandingShares = extractNumber(/Number\s+of\s+Outstanding\s*Common\s+Shares\s*[^\d-]{0,20}?([\d,.]+)/i);
  const sharesOwnedByPublic = extractNumber(/Total\s+Number\s+of\s+Shares\s+Owned\s*(?:by\s+the\s+Public)?\s*[^\d-]{0,20}?([\d,.]+)/i);
  const publicOwnershipPercent = extractNumber(/Public\s+Ownership\s+Percentage\s*[^\d-]{0,20}?([\d,.]+)/i);
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
 * From a real "Statement of Changes in Beneficial Ownership of Securities"
 * (form 17-7) filing. Confirmed live against an Ayala Land filing: the
 * disclosure reports the reporting person's name, their relationship to
 * the issuer (e.g. "10% Owner", "Director"), and a plain-text description
 * of the transaction (e.g. "Acquisition of common shares"). It does NOT
 * reliably include a share quantity or transaction value/price in the
 * rendered disclosure content — that data simply isn't present in this
 * filing type's PSE Edge rendering (verified: the raw HTML has no
 * quantity/amount fields at all for this filing). Earlier code in this
 * codebase (scripts/python/insider_vectorizer.py's MOCK_FILINGS,
 * src/commercial/api/insiderRoutes.ts's shares_quantity/
 * transaction_value_php columns) presented fabricated numbers for these
 * fields — this real version leaves them out rather than guess.
 */
export interface ParsedInsiderFiling {
  symbol: string;
  reportingPerson: string | null;
  relationship: string | null;
  description: string | null;
  filingDate: string;
  edgeNo: string;
  sourceUrl: string;
  scrapedAt: string;
}

export function parseInsiderFilingText(text: string, symbol: string, filingDate: string, edgeNo: string, sourceUrl: string): ParsedInsiderFiling {
  const normalized = text.replace(/\s+/g, ' ');

  const extractField = (label: RegExp): string | null => {
    const match = normalized.match(label);
    return match?.[1]?.trim() || null;
  };

  return {
    symbol,
    reportingPerson: extractField(/Name\s+of\s+Reporting\s+Person\s+([^]+?)\s+Relationship/i),
    relationship: extractField(/Relationship\s+of\s+Reporting\s+Person\s+to\s+Issuer\s+([^]+?)\s+(?:Description|Filed)/i),
    description: extractField(/Description\s+of\s+the\s+Disclosure\s+([^]+?)\s+Filed\s+on\s+behalf/i),
    filingDate,
    edgeNo,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * End-to-end: find a company's most recent insider beneficial-ownership-
 * change filings (form 17-7) and parse the real (name, relationship,
 * description) out of each. Returns `[]` (not fabricated placeholders) if
 * the symbol's cmpy_id isn't known or no such filings exist.
 */
export async function scrapeCompanyInsiderFilings(symbol: string, companyName: string, limit = 10): Promise<ParsedInsiderFiling[]> {
  const listings = await fetchDisclosureList(symbol, companyName, 'insiderChange');
  const toFetch = listings.slice(0, limit);

  const results: ParsedInsiderFiling[] = [];
  for (const listing of toFetch) {
    try {
      const text = await fetchAndExtractDisclosureText(listing.edgeNo);
      results.push(parseInsiderFilingText(text, symbol, listing.filingDate, listing.edgeNo, `${EDGE_BASE}/openDiscViewer.do?edge_no=${listing.edgeNo}`));
    } catch {
      // One filing failing to fetch/parse shouldn't drop the rest.
    }
  }
  return results;
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

// ── Multi-period financial history (real time series) ─────────────

/** One point in a real multi-quarter financial series, parsed from a
 * single PSE Edge quarterly filing. Null fields mean that specific filing
 * didn't match the label regex — never a fabricated value. */
export interface FinancialHistoryPoint {
  period: string;             // the filing's announce date (e.g. "05/15/2026 04:30 PM"),
  asOfPeriod: string | null;  // e.g. "March 31, 2026",
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalEquity: number | null;
  totalLiabilities: number | null;
  eps: number | null;
  /** NOT EBITDA — see ParsedFundamentals's operatingIncome doc. */
  operatingIncome: number | null;
  sourceUrl: string;
}

export interface ParsedFinancialHistory {
  symbol: string;
  latest: ParsedFundamentals | null;
  series: FinancialHistoryPoint[]; // oldest → newest, quarterly (17-Q),
  annualSeries: FinancialHistoryPoint[]; // oldest → newest, annual (17-A)
}

async function fetchFilingSeries(symbol: string, companyName: string, filingType: PseFilingType, periodsToFetch: number): Promise<FinancialHistoryPoint[]> {
  const listings = await fetchDisclosureList(symbol, companyName, filingType);
  const selected = listings.slice(0, periodsToFetch);
  const points: FinancialHistoryPoint[] = [];

  for (const listing of selected) {
    const sourceUrl = `${EDGE_BASE}/openDiscViewer.do?edge_no=${listing.edgeNo}`;
    const text = await fetchAndExtractDisclosureText(listing.edgeNo);
    const parsed = parseFinancialStatementText(text, symbol, sourceUrl);
    points.push({
      period: listing.filingDate,
      asOfPeriod: parsed.asOfPeriod,
      revenue: parsed.revenue,
      netIncome: parsed.netIncome,
      totalAssets: parsed.totalAssets,
      totalEquity: parsed.totalEquity,
      totalLiabilities: parsed.totalLiabilities,
      eps: parsed.eps,
      operatingIncome: parsed.operatingIncome,
      sourceUrl,
    });
  }

  // PSE sorts DESC (newest first); store oldest → newest for charting.
  return points.reverse();
}

/**
 * Fetch the last `periodsToFetch` quarterly filings (and up to 3 annual
 * filings — issuers file at most one 17-A per year, so 8 would be
 * pointless) for a company and parse each into a real multi-period
 * series — the ground truth the Financials chart can render instead of
 * the synthetic market-cap model.
 *
 * NOTE on request volume: this makes up to `periodsToFetch + 3` PSE Edge
 * viewer requests per company, so several times the traffic of
 * scrapeCompanyFundamentals. It is intentionally a separate,
 * less-frequent (monthly) pipeline — see scripts/scrape-pse-financial-history.ts
 * and .github/workflows/pse-financial-history-monthly.yml. The weekly
 * fundamentals job keeps using scrapeCompanyFundamentals (latest only).
 */
export async function scrapeCompanyFinancialHistory(
  symbol: string,
  companyName: string,
  periodsToFetch = 8,
): Promise<ParsedFinancialHistory | null> {
  const series = await fetchFilingSeries(symbol, companyName, 'quarterly', periodsToFetch);
  if (series.length === 0) return null;

  const annualSeries = await fetchFilingSeries(symbol, companyName, 'annual', 3);

  // "Latest" reflects the most recent quarterly filing (17-Q reports are
  // more current than the once-a-year 17-A) — series is oldest-first, so
  // the last element is newest.
  const latestPoint = series[series.length - 1];
  const latest: ParsedFundamentals = {
    symbol: symbol.toUpperCase(),
    asOfPeriod: latestPoint.asOfPeriod,
    totalAssets: latestPoint.totalAssets,
    totalLiabilities: latestPoint.totalLiabilities,
    totalEquity: latestPoint.totalEquity,
    netIncome: latestPoint.netIncome,
    revenue: latestPoint.revenue,
    eps: latestPoint.eps,
    sharesOutstanding: null,
    operatingIncome: latestPoint.operatingIncome,
    roe: latestPoint.netIncome !== null && latestPoint.totalEquity ? Number(((latestPoint.netIncome / latestPoint.totalEquity) * 100).toFixed(2)) : null,
    debtToEquity: latestPoint.totalLiabilities !== null && latestPoint.totalEquity ? Number((latestPoint.totalLiabilities / latestPoint.totalEquity).toFixed(2)) : null,
    sourceUrl: latestPoint.sourceUrl,
    scrapedAt: new Date().toISOString(),
  };

  return {
    symbol: symbol.toUpperCase(),
    latest,
    series,
    annualSeries,
  };
}

// ── Company Directory (sector/subsector) ──────────────────────────

const COMPANY_DIR_SEARCH_ENDPOINT = `${EDGE_BASE}/companyDirectory/search.ax`;

/** Real sector/subsector classification for a PSE-listed company, scraped
 * from PSE Edge's company directory. The `cmpyId`/`securityId` are the
 * numeric identifiers PSE Edge uses internally — `cmpyId` matches the
 * values in KNOWN_CMPY_IDS above, confirming the two endpoints agree. */
export interface PseCompanyDirectoryEntry {
  symbol: string;
  companyName: string;
  sector: string;
  subsector: string;
  cmpyId: number | null;
  securityId: number | null;
  listingDate: string;
  sourceUrl: string;
}

/**
 * Retry an async operation with exponential backoff. Used to make transient
 * network failures (timeouts, rate-limit responses) non-fatal during
 * batch scraping — a single hiccup no longer gets silently recorded as
 * "no data found" for a symbol that actually has real disclosures.
 *
 * - `retries` is the max number of *additional* attempts (so 3 retries =
 *   4 total attempts).
 * - Backoff starts at `baseDelayMs` (default 2000) and doubles each retry.
 * - Only errors are retried; a `null` return is treated as a legitimate
 *   "no result" outcome (e.g. no disclosure found), not a transient failure.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 200;
        const msg = `Transient error (attempt ${attempt + 1}/${retries + 1}): ${err instanceof Error ? err.message : String(err)}. Retrying in ${Math.round(delay + jitter)}ms…`;
        console.warn(`[retry] ${msg}`);
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }
  throw lastError;
}

/**
 * Fetch a single page of PSE Edge's company directory and parse the
 * company/sector/subsector table. Confirmed live (2026-08-04): the table
 * has class `list` with columns Company Name | Stock Symbol | Sector |
 * Subsector | Listing Date, and each row has an onclick of
 * `cmDetail('cmpyId','securityId')` giving the numeric company identifier.
 * 6 pages total (282 companies, ~50 per page).
 */
export async function scrapeCompanyDirectoryPage(pageNo: number): Promise<PseCompanyDirectoryEntry[]> {
  const response = await fetch(COMPANY_DIR_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      pageNo: String(pageNo),
      sector: 'ALL',
      subsector: 'ALL',
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PSE Edge company directory fetch failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseCompanyDirectoryHtml(html);
}

/**
 * Parse a single page of the company directory HTML into typed records.
 * Column order (confirmed live): Company Name | Stock Symbol | Sector |
 * Subsector | Listing Date.
 */
export function parseCompanyDirectoryHtml(html: string): PseCompanyDirectoryEntry[] {
  const $ = cheerio.load(html);
  const rows: PseCompanyDirectoryEntry[] = [];

  $('table.list tbody tr').each((_, el) => {
    const cells = $(el).find('td');
    if (cells.length < 5) return;

    const companyName = $(cells[0]).text().trim();
    const symbol = $(cells[1]).text().trim();
    const sector = $(cells[2]).text().trim();
    const subsector = $(cells[3]).text().trim();
    const listingDate = $(cells[4]).text().trim();

    if (!symbol || !sector) return;

    const onclick = $(el).find('a').attr('onclick') ?? $(el).attr('onclick') ?? '';
    const match = onclick.match(/cmDetail\('(\d+)','(\d+)'\)/);
    const cmpyId = match ? parseInt(match[1], 10) : null;
    const securityId = match ? parseInt(match[2], 10) : null;

    rows.push({
      symbol,
      companyName,
      sector,
      subsector,
      cmpyId,
      securityId,
      listingDate,
      sourceUrl: COMPANY_DIR_SEARCH_ENDPOINT,
    });
  });

  return rows;
}

/**
 * End-to-end: page through all pages of PSE Edge's company directory and
 * collect the full sector/subsector classification for every listed
 * company (~282 companies across 6 pages). Returns an empty array rather
 * than throwing on a per-page failure — individual page retries use
 * exponential backoff so a transient hiccup doesn't lose an entire page.
 */
export async function scrapeCompanySectors(): Promise<PseCompanyDirectoryEntry[]> {
  const all: PseCompanyDirectoryEntry[] = [];
  const totalPages = 6;

  for (let page = 1; page <= totalPages; page++) {
    try {
      const pageEntries = await withRetry(() => scrapeCompanyDirectoryPage(page));
      all.push(...pageEntries);
      console.log(`[sectors] page ${page}/${totalPages}: ${pageEntries.length} companies`);
    } catch (err) {
      console.error(`[sectors] page ${page} failed after retries:`, err instanceof Error ? err.message : err);
    }
    // Polite pause between pages
    if (page < totalPages) await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return all;
}

// ── Recent disclosures (real company news) ─────────────────────────

export interface CompanyDisclosure {
  symbol: string;
  companyName: string;
  formType: string;      // e.g. "4-30" (Material Info), "4-31" (Press Release), "13-1" (insider),
  title: string;         // the disclosure category shown in PSE Edge's table (e.g. "Press Release"),
  filingDate: string;    // e.g. "Jul 28, 2026 03:57 PM",
  edgeNo: string;
  sourceUrl: string;
}

/**
 * Fetch a company's most recent disclosures from PSE Edge WITHOUT a
 * template filter — the full disclosure history (Material Information,
 * Press Releases, insider-transaction forms, results announcements, etc.).
 * Confirmed live for BDO (cmpy_id=260): returns real recent filings such
 * as [4-30] Material Information/Transactions and [4-31] Press Release.
 * These are genuine company announcements — a real "Company Disclosures"
 * news feed, unlike templated placeholder headlines.
 */
export async function fetchCompanyDisclosures(
  symbol: string,
  companyName: string,
  limit = 8,
): Promise<CompanyDisclosure[]> {
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
      pageNo: '1',
      sortType: 'date',
      dateSortType: 'DESC',
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`PSE Edge disclosure search failed: HTTP ${response.status}`);
  }

  const html = await response.text();
  const rows = parseDisclosureListHtml(html);
  return rows.slice(0, limit).map((row) => ({
    symbol: symbol.toUpperCase(),
    companyName,
    formType: row.formType,
    title: row.title,
    filingDate: row.filingDate,
    edgeNo: row.edgeNo,
    sourceUrl: `${EDGE_BASE}/openDiscViewer.do?edge_no=${row.edgeNo}`,
  }));
}

/**
 * End-to-end: fetch the most recent disclosures for every company with a
 * known `cmpy_id` (the ~280 in KNOWN_CMPY_IDS), with retry-with-backoff
 * per company so a transient failure doesn't silently drop a symbol.
 */
export async function scrapeAllCompanyDisclosures(
  limits = 8,
  concurrency = 4,
  delayMs = 1200,
): Promise<Record<string, CompanyDisclosure[]>> {
  const symbols = Object.keys(KNOWN_CMPY_IDS).sort();
  const results: Record<string, CompanyDisclosure[]> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const recs = await withRetry(() => fetchCompanyDisclosures(symbol, symbol, limits), 2, 2000);
          return { symbol, recs };
        } catch (err) {
          console.error(`[disclosures] ${symbol} failed after retries:`, err instanceof Error ? err.message : err);
          return { symbol, recs: [] as CompanyDisclosure[] };
        }
      }),
    );

    for (const { symbol, recs } of batchResults) {
      results[symbol] = recs;
      if (recs.length > 0) succeeded++;
      else {
        failed++;
        console.warn(`[disclosures] ${symbol}: no disclosures returned`);
      }
    }

    if (i + concurrency < symbols.length) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.log(`\n[disclosures] Done: ${succeeded} with disclosures, ${failed} empty out of ${symbols.length}.`);
  return results;
}
