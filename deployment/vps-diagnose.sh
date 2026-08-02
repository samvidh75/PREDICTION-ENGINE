#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — VPS Connectivity Diagnostic
# Run from local machine to diagnose why VPS is unreachable.
# Usage: bash deployment/vps-diagnose.sh
# ===========================================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.211.56.127}"
VPS_PORT="${VPS_PORT:-22}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     StockEX Philippines — VPS Diagnostic Tool               ║"
echo "║     Target: ${VPS_HOST}:${VPS_PORT}                         "
echo "╚══════════════════════════════════════════════════════════════╝"

SCORE=0
TOTAL=8

# ── Test 1: DNS Resolution ──────────────────────────────────────────
header "1/${TOTAL} DNS Resolution"
if host "${VPS_HOST}" &>/dev/null || nslookup "${VPS_HOST}" &>/dev/null 2>&1; then
  info "✅ DNS resolves: $(host "${VPS_HOST}" 2>/dev/null | head -1 || nslookup "${VPS_HOST}" 2>/dev/null | grep Name)"
  SCORE=$((SCORE + 1))
else
  error "❌ DNS does not resolve"
fi

# ── Test 2: Ping ────────────────────────────────────────────────────
header "2/${TOTAL} ICMP (Ping)"
if ping -c 2 -W 3 "${VPS_HOST}" &>/dev/null; then
  info "✅ Host responds to ping"
  SCORE=$((SCORE + 1))
else
  error "❌ No ping response (host may block ICMP or be offline)"
fi

# ── Test 3: SSH Port ────────────────────────────────────────────────
header "3/${TOTAL} SSH Port ${VPS_PORT}"
if nc -zv -w 5 "${VPS_HOST}" "${VPS_PORT}" 2>/dev/null; then
  info "✅ SSH port ${VPS_PORT} is open"
  SCORE=$((SCORE + 1))
else
  error "❌ SSH port ${VPS_PORT} is closed/timeout"
fi

# ── Test 4: HTTP Port ───────────────────────────────────────────────
header "4/${TOTAL} HTTP Port 80"
if nc -zv -w 5 "${VPS_HOST}" 80 2>/dev/null; then
  info "✅ HTTP port 80 is open"
  SCORE=$((SCORE + 1))
else
  error "❌ HTTP port 80 is closed/timeout"
fi

# ── Test 5: HTTPS Port ──────────────────────────────────────────────
header "5/${TOTAL} HTTPS Port 443"
if nc -zv -w 5 "${VPS_HOST}" 443 2>/dev/null; then
  info "✅ HTTPS port 443 is open"
  SCORE=$((SCORE + 1))
else
  error "❌ HTTPS port 443 is closed/timeout"
fi

# ── Test 6: API Port ────────────────────────────────────────────────
header "6/${TOTAL} StockEX API (4001)"
if nc -zv -w 5 "${VPS_HOST}" 4001 2>/dev/null; then
  info "✅ API port 4001 is open"
  SCORE=$((SCORE + 1))
else
  warn "⚠️  API port 4001 is closed (expected if server not started)"
fi

# ── Test 7: Traceroute ──────────────────────────────────────────────
header "7/${TOTAL} Network Route"
if command -v traceroute &>/dev/null; then
  TRACE=$(traceroute -m 10 -w 2 "${VPS_HOST}" 2>&1 | tail -1)
  if echo "$TRACE" | grep -q "${VPS_HOST}"; then
    info "✅ Route completes to destination"
    SCORE=$((SCORE + 1))
  elif echo "$TRACE" | grep -q "\*"; then
    warn "⚠️  Route incomplete (firewall may be blocking)"
  else
    error "❌ Cannot reach destination network"
  fi
else
  warn "⚠️  traceroute not installed (brew install traceroute)"
fi

# ── Test 8: Domain DNS (if domain is set) ────────────────────────────
header "8/${TOTAL} Domain DNS"
DOMAIN="${DOMAIN:-stockex-ph.com}"
DOMAIN_IP=$(dig +short "${DOMAIN}" 2>/dev/null || nslookup "${DOMAIN}" 2>/dev/null | grep Address | grep -v "#" | tail -1 | awk '{print $2}' || echo "")
if [ -n "$DOMAIN_IP" ]; then
  if [ "$DOMAIN_IP" = "$VPS_HOST" ]; then
    info "✅ ${DOMAIN} → ${DOMAIN_IP} (correct)"
    SCORE=$((SCORE + 1))
  else
    warn "⚠️  ${DOMAIN} → ${DOMAIN_IP} (expected ${VPS_HOST})"
  fi
else
  warn "⚠️  ${DOMAIN} has no A record"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
if [ "$SCORE" -ge 7 ]; then
  echo "║  ✅ Score: ${SCORE}/${TOTAL} — VPS IS REACHABLE               ║"
  echo "║  Try: ssh root@${VPS_HOST}                                  ║"
elif [ "$SCORE" -ge 4 ]; then
  echo "║  ⚠️  Score: ${SCORE}/${TOTAL} — PARTIALLY REACHABLE          ║"
  echo "║  Some services are down. Run deploy.sh to fix.              ║"
else
  echo "║  ❌ Score: ${SCORE}/${TOTAL} — VPS IS OFFLINE                ║"
  echo "║                                                             ║"
  echo "║  FIX (via Webyne Console):                                  ║"
  echo "║  1. Log into Webyne dashboard                               ║"
  echo "║  2. Start the VPS if it's stopped                           ║"
  echo "║  3. Open the VNC/NoVNC console                              ║"
  echo "║  4. Run: bash /opt/stockex/deployment/vps-first-boot.sh     ║"
  echo "║     (or copy the script contents and paste)                  ║"
  echo "║  5. After reboot: ssh root@${VPS_HOST}                      ║"
  echo "║                                                             ║"
  echo "║  If IP doesn't work:                                        ║"
  echo "║  - Check your Webyne dashboard for the correct IP           ║"
  echo "║  - Update VPS_HOST in deployment/*.sh files                 ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""