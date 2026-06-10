import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLitePool, closeSQLite } from '../SQLiteAdapter';

let pool: SQLitePool;

beforeAll(async () => {
  process.env.SQLITE_DB_PATH = ':memory:';
  pool = new SQLitePool();
  await pool.getConnection();
});

afterAll(async () => { await closeSQLite(); });

describe('SQLiteAdapter sql.js parameter safety', () => {
  it('handles apostrophe in parameter', async () => {
    await pool.executeScript("CREATE TABLE IF NOT EXISTS param_test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
    await pool.query("INSERT INTO param_test (name) VALUES ($1)", ["O'Reilly"]);
    const r = await pool.query("SELECT name FROM param_test WHERE name = $1", ["O'Reilly"]);
    expect(r.rows[0].name).toBe("O'Reilly");
  });

  it('handles JSON string', async () => {
    const json = '{"key":"value","num":42}';
    await pool.executeScript("CREATE TABLE IF NOT EXISTS json_test (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)");
    await pool.query("INSERT INTO json_test (data) VALUES ($1)", [json]);
    const r = await pool.query("SELECT data FROM json_test LIMIT 1");
    expect(r.rows[0].data).toBe(json);
  });

  it('SQL-looking text remains data', async () => {
    const injection = "'; DROP TABLE param_test; --";
    await pool.query("INSERT INTO param_test (name) VALUES ($1)", [injection]);
    const r = await pool.query("SELECT COUNT(*) as cnt FROM param_test");
    expect(r.rows[0].cnt).toBeGreaterThanOrEqual(2); // table still exists, not dropped
  });

  it('null parameter', async () => {
    await pool.query("INSERT INTO param_test (name) VALUES ($1)", [null]);
    const r = await pool.query("SELECT name FROM param_test WHERE name IS NULL");
    expect(r.rows[0].name).toBeNull();
  });

  it('boolean parameter', async () => {
    await pool.executeScript("CREATE TABLE IF NOT EXISTS bool_test (id INTEGER PRIMARY KEY AUTOINCREMENT, flag INTEGER)");
    await pool.query("INSERT INTO bool_test (flag) VALUES ($1)", [1]);
    const r = await pool.query("SELECT flag FROM bool_test");
    expect(r.rows[0].flag).toBe(1);
  });

  it('number parameter', async () => {
    await pool.executeScript("CREATE TABLE IF NOT EXISTS num_test (id INTEGER PRIMARY KEY AUTOINCREMENT, val REAL)");
    await pool.query("INSERT INTO num_test (val) VALUES ($1)", [3.14159]);
    const r = await pool.query("SELECT val FROM num_test");
    expect(r.rows[0].val).toBeCloseTo(3.14159);
  });

  it('SELECT row shape', async () => {
    const r = await pool.query("SELECT 1 as one, 'two' as two");
    expect(r.rows[0]).toEqual({ one: 1, two: 'two' });
  });

  it('DELETE rowCount', async () => {
    await pool.query("INSERT INTO param_test (name) VALUES ($1)", ['to-delete']);
    const r = await pool.query("DELETE FROM param_test WHERE name = $1", ['to-delete']);
    expect(r.rowCount).toBeGreaterThanOrEqual(1);
  });
});