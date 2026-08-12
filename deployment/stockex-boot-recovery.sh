#!/usr/bin/env bash
# StockEX Boot Recovery — runs once at boot; ensures core services are up.
# Installed at /usr/local/bin/stockex-boot-recovery (referenced by the
# stockex-boot-recovery.service oneshot unit).
set -euo pipefail
LOG=/var/log/stockex-boot-recovery.log
echo "[$(date)] boot-recovery" >> "$LOG"
systemctl is-active --quiet nginx || { systemctl start nginx; echo "started nginx" >> "$LOG"; }
systemctl is-active --quiet stockex-api || { systemctl start stockex-api; echo "started api" >> "$LOG"; }
systemctl is-active --quiet stockex-llm || { systemctl start stockex-llm; echo "started llm" >> "$LOG"; }
echo "[$(date)] done" >> "$LOG"
exit 0
