import Database from 'better-sqlite3';
const db = new Database('data/stockstory.db');

// Check if user_profiles exists
const hasUserProfiles = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'").get();
console.log('user_profiles exists:', !!hasUserProfiles);

// Check user_watchlists schema
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_watchlists'").get() as any;
  console.log('user_watchlists schema:', schema?.sql?.substring(0, 200));
} catch { console.log('user_watchlists: no schema'); }

// Check shared_predictions schema
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='shared_predictions'").get() as any;
  console.log('shared_predictions schema:', schema?.sql?.substring(0, 200));
} catch { console.log('shared_predictions: no schema'); }

// List all columns for these tables
for (const table of ['user_profiles', 'user_watchlists', 'shared_predictions', 'user_subscriptions']) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (cols.length > 0) {
      console.log(`${table} columns:`, cols.map((c: any) => c.name).join(', '));
    } else {
      console.log(`${table}: NO COLUMNS or table missing`);
    }
  } catch (e: any) {
    console.log(`${table}: ${e.message}`);
  }
}

// Fix: Drop user_watchlists FK and recreate without FK constraint
// (user_profiles may not exist in SQLite)

// Check all existing tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[];
console.log('\nAll tables:', tables.map((t: any) => t.name).join(', '));

// Fix user_watchlists: remove FK constraint since user_profiles may not have been created
// SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so recreate
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_watchlists_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      tickers TEXT NOT NULL DEFAULT '[]',
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_favourite INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO user_watchlists_v2 SELECT * FROM user_watchlists;
    DROP TABLE IF EXISTS user_watchlists;
    ALTER TABLE user_watchlists_v2 RENAME TO user_watchlists;
    CREATE INDEX IF NOT EXISTS idx_watchlists_user ON user_watchlists(user_id);
  `);
  console.log('✓ Fixed user_watchlists (removed FK)');
} catch (e: any) { console.log('user_watchlists fix failed:', e.message); }

// Fix shared_predictions: ensure created_at column exists
try {
  const cols = db.prepare('PRAGMA table_info(shared_predictions)').all();
  const hasCreatedAt = cols.some((c: any) => c.name === 'created_at');
  if (!hasCreatedAt) {
    db.exec(`ALTER TABLE shared_predictions ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`);
    console.log('✓ Added created_at to shared_predictions');
  } else {
    console.log('shared_predictions already has created_at');
  }
} catch (e: any) { console.log('shared_predictions fix:', e.message); }

// Fix user_subscriptions: same FK issue
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_subscriptions_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      auto_renew INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO user_subscriptions_v2 SELECT * FROM user_subscriptions;
    DROP TABLE IF EXISTS user_subscriptions;
    ALTER TABLE user_subscriptions_v2 RENAME TO user_subscriptions;
    CREATE INDEX IF NOT EXISTS idx_subs_user ON user_subscriptions(user_id);
  `);
  console.log('✓ Fixed user_subscriptions (removed FK)');
} catch (e: any) { console.log('user_subscriptions fix failed:', e.message); }

// Fix user_alerts: same FK issue
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_alerts_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO user_alerts_v2 SELECT * FROM user_alerts;
    DROP TABLE IF EXISTS user_alerts;
    ALTER TABLE user_alerts_v2 RENAME TO user_alerts;
    CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON user_alerts(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON user_alerts(created_at DESC);
  `);
  console.log('✓ Fixed user_alerts (removed FK)');
} catch (e: any) { console.log('user_alerts fix failed:', e.message); }

// Fix daily_digests: same FK issue  
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_digests_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      digest_date TEXT NOT NULL,
      content TEXT NOT NULL,
      email_sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, digest_date)
    );
    INSERT OR IGNORE INTO daily_digests_v2 SELECT * FROM daily_digests;
    DROP TABLE IF EXISTS daily_digests;
    ALTER TABLE daily_digests_v2 RENAME TO daily_digests;
    CREATE INDEX IF NOT EXISTS idx_digests_user_date ON daily_digests(user_id, digest_date DESC);
  `);
  console.log('✓ Fixed daily_digests (removed FK)');
} catch (e: any) { console.log('daily_digests fix failed:', e.message); }

console.log('\nSchema fixation complete.');
db.close();
