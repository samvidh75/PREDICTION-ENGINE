import { Client } from 'pg';
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const queries = [
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS symbols_failed INTEGER DEFAULT 0;`,
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS error_classes TEXT[] DEFAULT '{}';`,
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS provider_statuses JSONB DEFAULT '{}';`,
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS rows_written JSONB DEFAULT '{}';`,
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
    `ALTER TABLE pipeline_health ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
  ];
  for (const q of queries) {
    try {
      await client.query(q);
    } catch (e) {
      console.error('Error running query', q, e);
    }
  }
  await client.end();
  console.log('Migration script completed');
})();
