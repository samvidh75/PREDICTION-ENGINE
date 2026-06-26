#!/bin/bash
# SGLang Rollback Script
# Usage: ./scripts/rollback-sglang.sh [version]
# Default: rollback to previous Railway deployment

set -e

RAILWAY_PROJECT="${RAILWAY_PROJECT:-stockstory}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
SGLANG_SERVICE="${SGLANG_SERVICE:-sglang-server}"

echo "=== SGLang Rollback Procedure ==="
echo "Project: $RAILWAY_PROJECT"
echo "Environment: $RAILWAY_ENVIRONMENT"
echo "Service: $SGLANG_SERVICE"
echo ""

if [ -n "$1" ]; then
  echo "Rolling back to version: $1"
else
  echo "Rolling back to previous deployment..."
fi

echo ""
echo "Step 1: Verify current health"
curl -sf http://localhost:30000/health && echo " - Current server is healthy" || echo " - Current server is DOWN"

echo ""
echo "Step 2: Check Railway deployments"
echo "  railway deployment list --project $RAILWAY_PROJECT"

echo ""
echo "Step 3: Rollback"
if [ -n "$1" ]; then
  echo "  railway deployment rollback $1 --project $RAILWAY_PROJECT"
else
  echo "  railway deployment rollback --project $RAILWAY_PROJECT"
fi

echo ""
echo "Step 4: Verify rollback"
echo "  sleep 30"
echo "  curl http://localhost:30000/health"

echo ""
echo "Step 5: Run smoke tests"
echo "  curl -X POST http://localhost:30000/generate -H 'Content-Type: application/json' -d '{\"text\":\"test\",\"sampling_params\":{\"max_new_tokens\":10}}'"

echo ""
echo "Step 6: Update backend .env if URL changed"
echo "  SGLANG_URL=<new-url>"

echo ""
echo "=== Rollback script complete ==="
echo ""
echo "NOTE: This is a dry-run script. Remove --dry-run flags to execute."
echo "Production rollback requires: railway CLI installed and authenticated."
