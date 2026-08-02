import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const symbol = String(req.query.symbol ?? '').toUpperCase().trim();

  const dataPath = join(process.cwd(), 'data', 'pse-foreign-flow.json');
  if (!existsSync(dataPath)) {
    res.status(503).json({
      ok: false,
      error: 'data_not_generated',
      message:
        'Run `python3 scripts/fetch_pse_data.py` to generate real PSE foreign flow data from the Daily Quotation Report.',
    });
    return;
  }

  try {
    const file = JSON.parse(readFileSync(dataPath, 'utf-8'));
    let entries = file.data ?? [];

    if (symbol) {
      entries = entries.filter((e: Record<string, unknown>) => e.symbol === symbol);
    }

    entries.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const diff = (b.netForeign as number) - (a.netForeign as number);
      return diff > 0 ? 1 : diff < 0 ? -1 : 0;
    });

    res.status(200).json({
      ok: true,
      generatedAt: file.generatedAt,
      source: file.source,
      count: entries.length,
      data: entries,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
