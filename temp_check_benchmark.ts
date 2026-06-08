import Database from 'better-sqlite3';

const db = new Database('./data/stockstory.db', { readonly: true });

const nifty = db.prepare("SELECT DISTINCT symbol FROM daily_prices WHERE symbol LIKE '%NIFTY%'").all();
console.log('NIFTY/benchmark symbols:', nifty.length > 0 ? nifty.map((r: any) => r.symbol).join(', ') : 'NONE');

const samples = db.prepare("SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol LIMIT 20").all();
console.log('Sample symbols:', samples.map((r: any) => r.symbol).join(', '));

const alphaCount = db.prepare("SELECT COUNT(*) as cnt FROM prediction_registry WHERE alpha IS NOT NULL AND benchmark_return IS NOT NULL AND benchmark_return != 0").get() as any;
console.log('Predictions with non-zero benchmark_return:', alphaCount?.cnt ?? 0);

db.close();
