#!/bin/bash

echo "════════════════════════════════════════════"
echo "  CRITICAL PATHS VALIDATION"
echo "  StockStory India — Pre-Deployment Check"
echo "════════════════════════════════════════════"
echo ""

FAIL=0
PASS=0

pass() { echo "  [$1] ✅ $2"; ((PASS++)); }
fail() { echo "  [$1] ❌ $2"; ((FAIL++)); }
check_file() { if [ -f "$2" ]; then pass "$1" "$3"; else fail "$1" "$3"; fi; }
check_grep() { if grep -q "$2" "$3" 2>/dev/null; then pass "$1" "$4"; else fail "$1" "$4"; fi; }

# ── Path 1 ──
echo "── Path 1: Engine Calibration ──"
check_file "1a" "scripts/python/analyze_score_distribution.py" "Script exists"

# ── Path 2 ──
echo ""
echo "── Path 2: EOD Sync ──"
check_file "2a" "scripts/python/nightly_eod_sync.py" "Script exists"

# ── Path 3 ──
echo ""
echo "── Path 3: Universe ──"
check_file "3a" "scripts/python/sync_nse_universe.py" "Script exists"
check_grep "3b" "CHENNPETRO" "scripts/python/sync_nse_universe.py" "CHENNPETRO validation"

# ── Path 4 ──
echo ""
echo "── Path 4: WebSocket ──"
check_grep "4a" "websocket" "src/render/startServer.ts" "WebSocket plugin"
check_grep "4b" "/ws/v1/live-stream" "src/render/startServer.ts" "WS endpoint"
check_grep "4c" "subscribe" "src/render/startServer.ts" "Ticker subscription"
if grep -rl "useWatchlistWebSocket\|useLiveQuotes" src/ --include="*.ts" --include="*.tsx" &>/dev/null; then
  pass "4d" "Client-side WS hooks"
else
  fail "4d" "Client-side WS hooks"
fi

# ── Path 5 ──
echo ""
echo "── Path 5: Broker OAuth ──"
check_file "5a" "src/services/brokers/UpstoxOAuth.ts" "Upstox OAuth"
check_file "5b" "src/services/brokers/ZerodhaProvider.ts" "Zerodha provider"
check_file "5c" "src/services/brokers/BrokerProvider.ts" "Broker interface"
check_file "5d" "src/components/BrokerConnect.tsx" "Broker connect UI"

# ── Path 6 ──
echo ""
echo "── Path 6: Conviction Snapshot ──"
check_grep "6a" "/api/research/snapshot/" "src/backend/web/routes/research.ts" "Snapshot endpoint"
check_grep "6b" "calculateConviction" "src/backend/web/routes/research.ts" "Conviction calculation"
check_grep "6c" "classifyHealth" "src/backend/web/routes/research.ts" "Health classification"
check_grep "6d" "/api/research/snapshot/" "src/services/api/client.ts" "Client calls snapshot"
check_grep "6e" "MasterCompanyRegistry" "src/backend/web/routes/research.ts" "Uses real registry"

# ── Path 7 ──
echo ""
echo "── Path 7: Compliance ──"
check_file "7a" "src/compliance/ResearchOnlyGuard.ts" "ResearchOnlyGuard exists"
check_grep "7b" "DISALLOWED_TERMS" "src/compliance/ResearchOnlyGuard.ts" "Disallowed terms"
check_grep "7c" "sanitize" "src/compliance/ResearchOnlyGuard.ts" "Sanitize function"
check_grep "7d" "getDisclaimer" "src/compliance/ResearchOnlyGuard.ts" "Disclaimer available"
check_file "7e" "src/compliance/ComplianceBanner.tsx" "Compliance banner"

# ── Path 8 ──
echo ""
echo "── Path 8: Monitoring/Metrics ──"
check_file "8a" "src/commercial/api/monitoring/MetricsCollector.ts" "MetricsCollector"
check_file "8b" "prometheus.yml" "Prometheus config"
check_grep "8c" "prometheus\|grafana" "docker-compose.yml" "In Docker Compose"
check_grep "8d" "MetricsCollector.startCollector" "src/render/startServer.ts" "Metrics active"

# ── Path 9 ──
echo ""
echo "── Path 9: Backtest ──"
check_file "9a" "scripts/python/backtest_conviction.py" "Conviction backtest"
check_file "9b" "scripts/python/backtest_slm_strategy.py" "SLM backtest"
check_file "9c" "scripts/python/backtest_engine.py" "Vectorized engine"

# ── Path 10 ──
echo ""
echo "── Path 10: Mobile ──"
check_grep "10a" "useResponsiveValue\|useMediaQuery" "src/ui/responsive.ts" "Responsive hooks"
check_grep "10b" "MOBILE_NAV" "src/app/AppShell.tsx" "Mobile navigation"

echo ""
echo "════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "  ✅ ALL CRITICAL PATHS VALIDATED — Ready to ship!"
  echo ""
  echo "  Next steps:"
  echo "    vercel --prod    # Frontend"
  echo "    vercel --prod    # Frontend (Vercel)"
  echo "    pod deploy      # Backend (Render)"
  exit 0
else
  echo "  ⚠️  $FAIL check(s) failed — review above"
  exit 1
fi
