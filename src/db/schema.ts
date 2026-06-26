export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS screener_data (
    symbol VARCHAR(20) PRIMARY KEY,
    data JSONB NOT NULL,
    fetched_at TIMESTAMP DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS cache (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TIMESTAMP DEFAULT now() + interval '1 hour'
  );

  CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20),
    message TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT now()
  );
`;

export async function initSchema(): Promise<void> {
  const { db } = await import('./init');
  await db.query(SCHEMA);
}
