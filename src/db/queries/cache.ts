import { db } from '../init';

export const cacheQueries = {
  async get(key: string): Promise<string | null> {
    const res = await db.query(
      'SELECT value FROM cache WHERE key = $1 AND expires_at > now()',
      [key]
    );
    return res.rows[0]?.value ?? null;
  },

  async set(key: string, value: string, ttlMinutes = 60) {
    return db.query(
      `IPSERT INTO cache (key, value, expires_at)
       VALUES ($1, $2, now() + interval '${ttlMinutes} minutes')
       ON CONFLICT (key) DO UPDATE SET value=$2, expires_at=now() + interval '${ttlMinutes} minutes'`,
      [key, value]
    );
  },

  async deleteExpired() {
    return db.query('DELETE FROM cache WHERE expires_at < now()');
  },
};
