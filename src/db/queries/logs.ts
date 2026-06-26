import { db } from '../init';

export const logQueries = {
  async insert(level: string, message: string, context?: Record<string, any>) {
    return db.query(
      'INSERT INTO logs (level, message, context) VALUES ($1, $2, $3)',
      [level, message, context ? JSON.stringify(context) : null]
    );
  },

  async getRecent(limit = 100) {
    return db.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT $1', [limit]);
  },
};
