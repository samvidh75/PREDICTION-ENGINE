// src/scripts/setup-postgres.ts
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const DOWNLOAD_URL = 'https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64-binaries.zip';
const BASE_DIR = 'C:\\Users\\Samvidh';
const ZIP_PATH = join(BASE_DIR, 'postgres.zip');
const BIN_DIR = join(BASE_DIR, 'postgres-bin');
const DATA_DIR = join(BASE_DIR, 'postgres-data');
const PGSQL_DIR = join(BIN_DIR, 'pgsql');

async function setup() {
  console.log('=== Setting up Portable PostgreSQL (Real Warehouse) ===');

  // Step 1: Download binaries zip if not present
  if (!existsSync(ZIP_PATH) && !existsSync(PGSQL_DIR)) {
    console.log(`Downloading PostgreSQL binaries from ${DOWNLOAD_URL}...`);
    const resp = await fetch(DOWNLOAD_URL);
    if (!resp.ok) {
      throw new Error(`Failed to download: ${resp.statusText}`);
    }
    const buffer = await resp.arrayBuffer();
    writeFileSync(ZIP_PATH, Buffer.from(buffer));
    console.log('Download complete.');
  } else {
    console.log('PostgreSQL binaries zip already exists.');
  }

  // Step 2: Extract zip
  if (!existsSync(PGSQL_DIR)) {
    console.log(`Extracting to ${BIN_DIR}...`);
    mkdirSync(BIN_DIR, { recursive: true });
    execSync(`tar -xf "${ZIP_PATH}" -C "${BIN_DIR}"`);
    console.log('Extraction complete.');
  } else {
    console.log('PostgreSQL binaries already extracted.');
  }

  // Step 3: Initialize data directory
  if (!existsSync(DATA_DIR)) {
    console.log(`Initializing database in ${DATA_DIR}...`);
    const initdbCmd = `"${join(PGSQL_DIR, 'bin', 'initdb.exe')}" -U postgres -A trust -D "${DATA_DIR}"`;
    execSync(initdbCmd, { stdio: 'inherit' });
    console.log('Database initialization complete.');
  } else {
    console.log('Database data directory already exists.');
  }

  // Step 4: Start PostgreSQL
  console.log('Starting PostgreSQL server on port 5432...');
  try {
    const pgctlCmd = `"${join(PGSQL_DIR, 'bin', 'pg_ctl.exe')}" -D "${DATA_DIR}" -o "-p 5432" start`;
    execSync(pgctlCmd, { stdio: 'inherit' });
    console.log('PostgreSQL started.');
  } catch (err: any) {
    console.log('Server startup command output:', err.message);
  }

  // Wait for server to bind
  await new Promise((r) => setTimeout(r, 3000));

  // Step 5: Create database stockstory
  console.log('Creating database "stockstory"...');
  try {
    const createdbCmd = `"${join(PGSQL_DIR, 'bin', 'createdb.exe')}" -U postgres -p 5432 stockstory`;
    execSync(createdbCmd, { stdio: 'inherit' });
    console.log('Database created.');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('Database "stockstory" already exists.');
    } else {
      console.warn('createdb warning/error:', err.message);
    }
  }

  console.log('=== Portable PostgreSQL Setup Complete! ===');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
