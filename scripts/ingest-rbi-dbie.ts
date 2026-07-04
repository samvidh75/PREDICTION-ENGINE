import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { dbAdapter } from '../src/db/DatabaseAdapter';

type Snapshot = {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  pageHeading: string;
  tableCount: number;
  headings: string[];
  tables: Array<{ rows: string[][] }>;
  fetchedAt: string;
};

type SeriesRow = {
  sourceId: string;
  seriesName: string;
  observationDate: string | null;
  observationLabel: string | null;
  value: number | null;
  unit: string | null;
  category: string | null;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
};

const DEFAULT_URLS = [
  'https://data.rbi.org.in/DBIE/',
  'https://www.rbi.org.in/commonman/english/history/Scripts/BankrateCRRandSLRChanges.aspx',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const urlsArg = args.find((arg) => arg.startsWith('--urls='))?.slice('--urls='.length);
  const outputDir = args.find((arg) => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'data/official-snapshots/rbi';
  const sourceId = args.find((arg) => arg.startsWith('--source-id='))?.slice('--source-id='.length) ?? 'rbi-dbie';
  return {
    urls: urlsArg ? urlsArg.split(',').map((u) => u.trim()).filter(Boolean) : DEFAULT_URLS,
    outputDir,
    sourceId,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StockStoryIndia/1.0; research)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  return await resp.text();
}

function extractBundleUrl(homeHtml: string): string {
  // eslint-disable-next-line no-useless-escape
  const jsMatches = [...homeHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const mainJs = jsMatches.find((src) => src.includes('main.'));
  if (!mainJs) throw new Error('Could not locate DBIE main bundle');
  return `https://data.rbi.org.in/DBIE/${mainJs}`;
}

function extractWss5Series(bundleText: string, bundleUrl: string): SeriesRow[] {
  const marker = '"WSS5":[';
  const markerIdx = bundleText.indexOf(marker);
  if (markerIdx < 0) return [];

  const start = bundleText.lastIndexOf("JSON.parse('", markerIdx);
  const end = bundleText.indexOf("')", markerIdx);
  if (start < 0 || end < 0 || end <= start) return [];

  const rawJson = bundleText.slice(start + "JSON.parse('".length, end);
  const parsed = JSON.parse(rawJson) as { WSS5?: Array<Record<string, unknown>> };
  const series = parsed.WSS5 ?? [];

  return series.map((row) => {
    const seriesName = String(row.wss_desc ?? row.item_hierarchy_2 ?? 'Unknown').trim();
    const value = typeof row.growth_rate === 'number'
      ? row.growth_rate
      : typeof row.wss_amount === 'string'
        ? Number.parseFloat(row.wss_amount)
        : null;
    const observationDate = typeof row.time_date === 'number'
      ? new Date(row.time_date).toISOString().slice(0, 10)
      : null;
    const observationLabel = typeof row.fiscal_quarter === 'string'
      ? row.fiscal_quarter
      : null;
    const unit = seriesName.includes('Rate') || seriesName.includes('WACR') ? '%' : null;
    return {
      sourceId: 'rbi-dbie',
      seriesName,
      observationDate,
      observationLabel,
      value,
      unit,
      category: 'rates',
      sourceUrl: bundleUrl,
      rawPayload: row,
    };
  });
}

async function fetchDbieSnapshot(sourceId: string, sourceUrl: string): Promise<Snapshot> {
  const html = await fetchHtml(sourceUrl);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const sourceTitle = doc.querySelector('title')?.textContent?.trim() ?? sourceUrl;
  const pageHeading = doc.querySelector('h1')?.textContent?.trim() ?? doc.querySelector('h2')?.textContent?.trim() ?? sourceTitle;
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3')).map((node) => node.textContent?.trim() ?? '').filter(Boolean);
  const tables = Array.from(doc.querySelectorAll('table')).map((table) => ({
    rows: Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean),
    ).filter((row) => row.length > 0),
  })).filter((table) => table.rows.length > 0);

  return {
    sourceId,
    sourceUrl,
    sourceTitle,
    pageHeading,
    tableCount: tables.length,
    headings,
    tables,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchChronologySnapshot(sourceId: string, sourceUrl: string): Promise<Snapshot> {
  const html = await fetchHtml(sourceUrl);
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const sourceTitle = doc.querySelector('title')?.textContent?.trim() ?? sourceUrl;
  const pageHeading = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3')).map((node) => node.textContent?.trim() ?? '').filter(Boolean);
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  const chronIdx = text.indexOf('Chronology of Bankrate, CRR and SLR Changes');
  const chronology = chronIdx >= 0 ? text.slice(chronIdx) : text.slice(0, 5000);

  return {
    sourceId,
    sourceUrl,
    sourceTitle,
    pageHeading,
    tableCount: 0,
    headings,
    tables: [{ rows: [[chronology]] }],
    fetchedAt: new Date().toISOString(),
  };
}

async function upsertSnapshot(snapshot: Snapshot): Promise<void> {
  await dbAdapter.query(
    `INSERT INTO macro_economic_snapshots
      (source_id, source_url, source_title, page_heading, table_count, headings, payload, fetched_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (source_id, source_url) DO UPDATE SET
       source_title = EXCLUDED.source_title,
       page_heading = EXCLUDED.page_heading,
       table_count = EXCLUDED.table_count,
       headings = EXCLUDED.headings,
       payload = EXCLUDED.payload,
       fetched_at = EXCLUDED.fetched_at`,
    [
      snapshot.sourceId,
      snapshot.sourceUrl,
      snapshot.sourceTitle,
      snapshot.pageHeading,
      snapshot.tableCount,
      JSON.stringify(snapshot.headings),
      JSON.stringify({ tables: snapshot.tables, fetchedAt: snapshot.fetchedAt }),
    ],
  );
}

async function upsertSeries(rows: SeriesRow[]): Promise<void> {
  for (const row of rows) {
    await dbAdapter.query(
      `INSERT INTO macro_economic_series
        (source_id, series_name, observation_date, observation_label, value, unit, category, source_url, raw_payload, fetched_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (source_id, series_name, observation_date, source_url) DO UPDATE SET
         observation_label = EXCLUDED.observation_label,
         value = EXCLUDED.value,
         unit = EXCLUDED.unit,
         category = EXCLUDED.category,
         raw_payload = EXCLUDED.raw_payload,
         fetched_at = EXCLUDED.fetched_at`,
      [
        row.sourceId,
        row.seriesName,
        row.observationDate,
        row.observationLabel,
        row.value,
        row.unit,
        row.category,
        row.sourceUrl,
        JSON.stringify(row.rawPayload),
      ],
    );
  }
}

async function ensureSchema(): Promise<void> {
  await dbAdapter.executeScript(`
    CREATE TABLE IF NOT EXISTS macro_economic_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_title TEXT,
      page_heading TEXT,
      table_count INTEGER DEFAULT 0,
      headings TEXT,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_id, source_url)
    );

    CREATE TABLE IF NOT EXISTS macro_economic_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      series_name TEXT NOT NULL,
      observation_date TEXT,
      observation_label TEXT,
      value REAL,
      unit TEXT,
      category TEXT,
      source_url TEXT NOT NULL,
      raw_payload TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_id, series_name, observation_date, source_url)
    );
  `);
}

async function main() {
  const { urls, outputDir, sourceId } = parseArgs();
  await dbAdapter.initialize();
  await ensureSchema();
  mkdirSync(outputDir, { recursive: true });

  let currentRates: SeriesRow[];

  for (const url of urls) {
    const snapshot = url.includes('BankrateCRRandSLRChanges')
      ? await fetchChronologySnapshot(sourceId, url)
      : await fetchDbieSnapshot(sourceId, url);

    await upsertSnapshot(snapshot);
    const fileName = url.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 120);
    writeFileSync(join(outputDir, `${fileName}.json`), JSON.stringify(snapshot, null, 2));
    console.log(JSON.stringify({
      sourceId,
      url,
      tableCount: snapshot.tableCount,
      outputDir,
    }));

    if (url.includes('data.rbi.org.in/DBIE/')) {
      const homeHtml = await fetchHtml(url);
      const bundleUrl = extractBundleUrl(homeHtml);
      const bundleText = await fetchHtml(bundleUrl);
      currentRates = extractWss5Series(bundleText, bundleUrl);
      await upsertSeries(currentRates);
      writeFileSync(
        join(outputDir, 'rbi_current_rates.json'),
        JSON.stringify({ sourceId, bundleUrl, fetchedAt: new Date().toISOString(), rows: currentRates }, null, 2),
      );
    }
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
