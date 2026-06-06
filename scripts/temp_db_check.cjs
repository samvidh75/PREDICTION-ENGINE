const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stockstory' });
p.query('SELECT COUNT(*) as cnt FROM symbols')
  .then(r => { console.log('symbols:', r.rows[0].cnt); return p.query('SELECT COUNT(*) as cnt FROM financial_snapshots'); })
  .then(r => { console.log('financial_snapshots:', r.rows[0].cnt); return p.query('SELECT COUNT(*) as cnt FROM feature_snapshots'); })
  .then(r => { console.log('feature_snapshots:', r.rows[0].cnt); return p.query('SELECT COUNT(*) as cnt FROM factor_snapshots'); })
  .then(r => { console.log('factor_snapshots:', r.rows[0].cnt); return p.query('SELECT COUNT(*) as cnt FROM daily_prices'); })
  .then(r => { console.log('daily_prices:', r.rows[0].cnt); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
