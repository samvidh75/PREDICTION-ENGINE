# Node 22 Standardization Report

| Surface | Before | After |
|---------|---------|-------|
| `package.json` engines | `node: ">=20.0.0"` | `node: ">=22.12.0 <23"` |
| `Dockerfile` base image | `node:20-alpine` | `node:22-alpine` |
| `.github/workflows/ci.yml` | `node-version: 20` | `node-version: 22` |
| `.github/workflows/docker-smoke.yml` | `node-version: 20` | `node-version: 22` |
| `.github/workflows/release-gate.yml` | `node-version: 20` | `node-version: 22` |
| `.github/workflows/daily-pipeline.yml` | `node-version: '20'` | `node-version: '22'` |
| `.nvmrc` | Non-existent | `22` |
