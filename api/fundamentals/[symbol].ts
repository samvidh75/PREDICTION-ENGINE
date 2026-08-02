import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Serves real fundamentals scraped from PSE Edge (see
 * scripts/scrape-pse-fundamentals.ts + src/services/scrapers/PSEEdgeScraper.ts)
 * out of the static data/pse-fundamentals.json snapshot. That file is not
 * generated automatically — run `npm run scrape:pse-fundamentals` from an
 * environment with real internet access to produce it. Until then this
 * endpoint responds with a clear "not generated yet" status rather than
 * fabricated numbers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const symbol = String(req.query.symbol ?? '').toUpperCase().trim();
  if (!symbol) {
    res.status(400).json({ ok: false, error: 'symbol required' });
    return;
  }

  const dataPath = join(process.cwd(), 'data', 'pse-fundamentals.json');
  if (!existsSync(dataPath)) {
    res.status(503).json({
      ok: false,
      error: 'fundamentals_not_generated',
      message: 'Run `npm run scrape:pse-fundamentals` to generate real PSE Edge fundamentals data.',
    });
    return;
  }

  try {
    const file = JSON.parse(readFileSync(dataPath, 'utf-8'));
    const entry = file.results?.[symbol];

    if (!entry) {
      res.status(404).json({ ok: false, error: 'not_found', symbol });
      return;
    }
    if ('error' in entry) {
      res.status(502).json({ ok: false, error: entry.error, symbol });
      return;
    }

    res.status(200).json({ ok: true, generatedAt: file.generatedAt, data: entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
