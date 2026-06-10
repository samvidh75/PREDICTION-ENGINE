import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLitePool, closeSQLite } from '../SQLiteAdapter';

let pool: SQLitePool;

beforeAll(async () => {
  process.env.SQLITE_DB_PATH = ':memory:';
  pool = new SQLitePool();
  await pool.getConnection();
});

afterAll(async () => { await closeSQLite(); });

describe('SQLiteAdapter multi-statement execution', () => {
  it('one script creates two tables', async () => {
    await pool.executeScript(
      'CREATE TABLE multi_a (id INTEGER PRIMARY KEY, name TEXT);' +
      'CREATE TABLE multi_b (id INTEGER PRIMARY KEY, value REAL);'
    );
    const a = await pool.query("SELECT name FROM sqlite_master WHERE type='table' AND name='multi_a'");
    const b = await pool.query("SELECT name FROM sqlite_master WHERE type='table' AND name='multi_b'");
    expect(a.rows.length).toBe(1);
    expect(b.rows.length).toBe(1);
  });

  it('inserts into both tables', async () => {
    await pool.executeScript(
      "INSERT INTO multi_a (id, name) VALUES (1, 'alpha');" +
      "INSERT INTO multi_b (id, value) VALUES (2, 3.14);"
    );
    const a = await pool.query('SELECT * FROM multi_a');
    const b = await pool.query('SELECT * FROM multi_b');
    expect(a.rows.length).toBe(1);
    expect(b.rows.length).toBe(1);
  });

  it('invalid second statement throws', async () => {
    await expect(pool.executeScript(
      "CREATE TABLE IF NOT EXISTS ok (id INTEGER);" +
      "GARBAGE SYNTAX ERROR"
    )).rejects.toThrow();
  });
});