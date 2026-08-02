import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export const db = pool;
export const query = (text: string, values?: any[]) => db.query(text, values);
