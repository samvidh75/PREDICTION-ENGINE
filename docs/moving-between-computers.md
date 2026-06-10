# Moving Between Computers

Follow this exact checklist when moving the PREDICTION-ENGINE repository between machines.

## Checklist

1. Copy source code only, or clone from GitHub.
2. **Never copy `node_modules`.**
3. **Never copy `dist`.**
4. **Never copy `coverage`.**
5. **Never copy local SQLite WAL/SHM files (`*.db-wal`, `*.db-shm`).**
6. Install Node 20 or later.
7. Run `npm ci`.
8. Run `npm run bootstrap:dev`.
9. Run `npm run doctor:platform`.
10. Run `npm run test:integration:sqlite`.
11. Run `npm run build:vercel`.

## Windows → Mac

```bash
rm -rf node_modules
npm ci
npm run bootstrap:dev
```

## Mac → Windows

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
npm run bootstrap:dev
```

## Linux → Mac

```bash
rm -rf node_modules
npm ci
npm run bootstrap:dev
```

## Any Platform → Container

```bash
docker compose -f docker-compose.dev.yml up
```

## Why This Matters

`node_modules` contains platform-specific native binaries:
- `better-sqlite3` compile target
- `@rollup/rollup-{platform}-{arch}` optional packages
- `@esbuild/{platform}-{arch}` binaries

Copying `node_modules` between Windows, macOS, and Linux **will** cause:
- `MODULE_NOT_FOUND` errors for platform packages
- Segmentation faults from wrong-architecture binaries
- Silent failures in SQLite operations
