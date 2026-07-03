#!/bin/bash
#=============================================================================
# StockEX — Auto Deploy Environment Variables to Vercel & Render
# Runs every 12 hours via cron. Zero manual intervention.
#
# This script:
#   1. Reads all tokens from .env
#   2. Auto-deploys to Vercel via API
#   3. Auto-deploys to Render via API
#   4. Logs everything
#
# Installation:
#   crontab -e
#   0 */12 * * * /bin/bash /path/to/scripts/env-auto-deploy.sh
#
# Required API Tokens (set once in .env):
#   VERCEL_TOKEN=<from vercel.com/settings/tokens>
#   RENDER_API_KEY=<from dashboard.render.com>
#   VERCEL_PROJECT_ID=<from vercel.com project settings>
#   RENDER_SERVICE_ID=<from render.com dashboard>
#=============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/env-auto-deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$PROJECT_DIR/logs"

log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log "=== StockEX Environment Auto-Deploy ==="

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
    log "✅ Loaded .env"
fi

# ── 1. Verify all tokens are present ─────────────────────────────────
MISSING=""

[ -z "$UPSTOX_ACCESS_TOKEN" ] && MISSING="$MISSING UPSTOX_ACCESS_TOKEN"
[ -z "$INDIANAPI_KEY" ] && MISSING="$MISSING INDIANAPI_KEY"

if [ -n "$MISSING" ]; then
    log "⚠️  Missing tokens: $MISSING"
    log "Some tokens will be skipped"
else
    log "✅ All tokens present"
fi

# ── 2. Deploy to Vercel via API ──────────────────────────────────────
if [ -n "$VERCEL_TOKEN" ] && [ -n "$VERCEL_PROJECT_ID" ]; then
    log "--- Deploying to Vercel ---"
    
    # Build environment variables JSON
    VERCEL_ENV_JSON=$(cat << EOF
[
    {"key": "UPSTOX_ACCESS_TOKEN", "value": "${UPSTOX_ACCESS_TOKEN}", "target": ["production", "preview"], "type": "encrypted"},
    {"key": "UPSTOX_ALGO_TOKEN", "value": "${UPSTOX_ALGO_TOKEN:-}", "target": ["production", "preview"], "type": "encrypted"},
    {"key": "UPSTOX_SANDBOX_TOKEN", "value": "${UPSTOX_SANDBOX_TOKEN:-}", "target": ["production", "preview"], "type": "encrypted"},
    {"key": "INDIANAPI_KEY", "value": "${INDIANAPI_KEY}", "target": ["production", "preview"], "type": "encrypted"}
]
EOF
)
    
    # Push each env var to Vercel
    echo "$VERCEL_ENV_JSON" | python3 -c "
import json, sys, os, urllib.request

env_vars = json.load(sys.stdin)
token = os.environ.get('VERCEL_TOKEN', '')
project_id = os.environ.get('VERCEL_PROJECT_ID', '')
team_id = os.environ.get('VERCEL_TEAM_ID', '')

base_url = f'https://api.vercel.com/v1/projects/{project_id}/env'
if team_id:
    base_url += f'?teamId={team_id}'

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
}

for env in env_vars:
    if not env['value']:
        continue
    try:
        data = json.dumps(env).encode()
        req = urllib.request.Request(base_url, data=data, headers=headers, method='POST')
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        print(f'✅ Vercel: {env[\"key\"]} set (ID: {result.get(\"id\", \"?\")})')
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f'ℹ️  Vercel: {env[\"key\"]} already exists')
        else:
            print(f'❌ Vercel: {env[\"key\"]} failed (HTTP {e.code})')
    except Exception as e:
        print(f'❌ Vercel: {env[\"key\"]} error: {e}')
" 2>&1 | tee -a "$LOG_FILE"
    
    # Trigger Vercel redeploy
    if [ -n "$VERCEL_DEPLOY_HOOK" ]; then
        log "Triggering Vercel redeploy..."
        curl -s -X POST "$VERCEL_DEPLOY_HOOK" --max-time 30 > /dev/null 2>&1 && log "✅ Vercel redeploy triggered" || log "❌ Vercel redeploy failed"
    fi
else
    log "ℹ️  Vercel not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID in .env"
fi

# ── 3. Deploy to Render via API ──────────────────────────────────────
if [ -n "$RENDER_API_KEY" ] && [ -n "$RENDER_SERVICE_ID" ]; then
    log "--- Deploying to Render ---"
    
    RENDER_ENV_JSON=$(cat << EOF
[
    {"key": "UPSTOX_ACCESS_TOKEN", "value": "${UPSTOX_ACCESS_TOKEN}"},
    {"key": "UPSTOX_ALGO_TOKEN", "value": "${UPSTOX_ALGO_TOKEN:-}"},
    {"key": "UPSTOX_SANDBOX_TOKEN", "value": "${UPSTOX_SANDBOX_TOKEN:-}"},
    {"key": "INDIANAPI_KEY", "value": "${INDIANAPI_KEY}"}
]
EOF
)
    
    echo "$RENDER_ENV_JSON" | python3 -c "
import json, sys, os, urllib.request

env_vars = json.load(sys.stdin)
api_key = os.environ.get('RENDER_API_KEY', '')
service_id = os.environ.get('RENDER_SERVICE_ID', '')

base_url = f'https://api.render.com/v1/services/{service_id}/env-vars'
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
}

for env in env_vars:
    if not env['value']:
        continue
    try:
        data = json.dumps(env).encode()
        req = urllib.request.Request(base_url, data=data, headers=headers, method='PUT')
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        print(f'✅ Render: {env[\"key\"]} set')
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        if e.code == 409:
            print(f'ℹ️  Render: {env[\"key\"]} already exists')
        else:
            print(f'❌ Render: {env[\"key\"]} failed (HTTP {e.code}): {body[:100]}')
    except Exception as e:
        print(f'❌ Render: {env[\"key\"]} error: {e}')
" 2>&1 | tee -a "$LOG_FILE"

    # Trigger Render deploy
    log "Triggering Render redeploy..."
    curl -s -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
        -H "Authorization: Bearer ${RENDER_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' --max-time 30 > /dev/null 2>&1 && log "✅ Render redeploy triggered" || log "❌ Render redeploy failed"
else
    log "ℹ️  Render not configured. Set RENDER_API_KEY and RENDER_SERVICE_ID in .env"
fi

# ── 4. Save backup ──────────────────────────────────────────────────
cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d)"
log "✅ .env backed up"

log "=== Auto-Deploy Complete ==="
log "Next run: +12 hours"
