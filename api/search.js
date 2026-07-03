import { readFileSync } from 'fs';
import { join } from 'path';

let universe = null;

function loadUniverse() {
  if (universe) return universe;
  try {
    const p = join(process.cwd(), 'dist', 'public', 'assets', 'stockUniverse-By8VPpAh.js');
    universe = JSON.parse(readFileSync(p, 'utf-8'));
  } catch { universe = []; }
  return universe;
}

export default function handler(req, res) {
  const query = (req.query?.q || '').toString().toLowerCase().trim();
  const limit = Math.min(50, parseInt(req.query?.limit || '10'));

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'query required (min 2 chars)' });
  }

  try {
    const data = loadUniverse();
    const results = data
      .filter(s => s.symbol?.toLowerCase().includes(query) || s.name?.toLowerCase().includes(query))
      .slice(0, limit)
      .map(s => ({
        symbol: s.symbol, name: s.name, exchange: s.exchange || 'NSE',
        sector: s.sector || '', industry: s.industry || '',
        price: s.price, pe: s.pe,
      }));

    res.json({ query, total: results.length, results });
  } catch {
    res.json({ query, total: 0, results: [] });
  }
}
