#!/bin/bash
# Install the 12-hour cron jobs for token renewal and env auto-deploy
CRON_ENTRIES=$(cat << 'EOF'
# StockEX Token Renewal - runs every 12 hours
0 */12 * * * /bin/bash /path/to/scripts/token-renewal-system.sh
# StockEX Env Auto-Deploy - runs every 12 hours (offset by 5 min)
5 */12 * * * /bin/bash /path/to/scripts/env-auto-deploy.sh
EOF
)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_ENTRIES="${CRON_ENTRIES//\/path\/to/$SCRIPT_DIR}"
(crontab -l 2>/dev/null | grep -v "token-renewal\|env-auto-deploy"; echo "$CRON_ENTRIES") | crontab -
echo "✅ Cron jobs installed. Runs every 12 hours."
echo "   Token renewal: minute 0"
echo "   Env auto-deploy: minute 5"
