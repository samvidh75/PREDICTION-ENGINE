#!/bin/bash
# Vercel install script — ensures native binaries are installed
set -e

# Install all deps (including optional)
npm install --legacy-peer-deps

# Explicitly install Linux native binaries needed by Vite/rolldown
npm install @rolldown/binding-linux-x64-gnu@latest --no-save --ignore-scripts 2>/dev/null || true

echo "Install complete"
