// src/scripts/start-postgres.ts
import { existsSync, unlinkSync, openSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import { platform } from 'os';

const PG_EXE_SUFFIX = platform() === 'win32' ? '.exe' : '';
const BASE_DIR = process.env.PG_BASE_DIR ?? join(process.cwd(), 'pg-portable');
const DATA_DIR = process.env.PG_DATA_DIR ?? join(BASE_DIR, 'postgres-data');
const PID_FILE = join(DATA_DIR, 'postmaster.pid');
const LOG_FILE = join(BASE_DIR, 'postgres-server.log');
const PGSQL_DIR = join(BASE_DIR, 'postgres-bin', 'pgsql');
const POSTGRES_EXE = join(PGSQL_DIR, 'bin', `postgres${PG_EXE_SUFFIX}`);

async function start() {
  console.log('Starting PostgreSQL server...');

  if (existsSync(PID_FILE)) {
    console.log('Removing stale PID file...');
    try {
      unlinkSync(PID_FILE);
    } catch (e: any) {
      console.warn('Could not remove PID file:', e.message);
    }
  }

  const logFd = openSync(LOG_FILE, 'a');

  // Detached process, redirecting stdio
  const child = spawn(POSTGRES_EXE, ['-D', DATA_DIR, '-p', '5432'], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  console.log(`Spawned postgres with PID: ${child.pid}`);

  // Wait 4 seconds for server to start and bind
  await new Promise((r) => setTimeout(r, 4000));
  console.log('PostgreSQL start sequence complete. Checking server status...');
}

start().catch((err) => {
  console.error('Failed to start postgres:', err);
  process.exit(1);
});
