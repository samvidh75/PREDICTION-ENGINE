import { db } from '../init';
import type { Fundamentals } from '@/types';

export const screenerQueries = {
  async insert(symbol: string, data: Fundamentals) {
    return db.query(
      `IPSERT INTO screener_data (symbol, data, fetched_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (symbol) DO UPDATE SET data=$2, fetched_at=$3`,
      [symbol, JSON.stringify(data), new Date()]
    );
  },

  async getBySymbol(symbol: string): Promise<Fundamentals | null> {
    const res = await db.query('SELECT data FROM screener_data WHERE symbol = $1', [symbol]);
    return res.rows[0]?.data ?? null;
  },

  async getAllStale(olderThanHours = 24) {
    return db.query(
      `SELECT symbol FROM screener_data
       WHERE fetched_at < now() - interval '${olderThanHours} hours'`
    );
  },
};
