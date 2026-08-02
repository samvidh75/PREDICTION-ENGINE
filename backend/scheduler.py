#!/usr/bin/env python3
"""
APScheduler: Update cache once daily (market close)
Never hits APIs during market hours
"""

from apscheduler.schedulers.background import BackgroundScheduler
import logging
from data_fetcher import MarketDataOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYMBOLS = [
    "BDO", "JFC", "SM", "AC", "ALI",
    "SMPH", "BPI", "TEL", "GLO", "MER",
    "MBT", "URC", "AEV", "JGS", "SECB",
    "GTCAP", "CNPF", "EMI", "WLCON", "MONDE",
    "PGOLD", "RRHI", "RLC", "DMC", "ACEN",
    "BLOOM", "AP", "FGEN", "MWIDE", "ANI",
    "CEB", "FLI", "IMI", "MEG", "NIKL",
    "PXP", "SCC", "SSI", "TFHI", "VLL",
    "CHP", "MJC", "HCOR", "ATN", "DMP",
    "CLC", "WEB", "NCM",
]


def refresh_market_data():
    """Called daily at 4 PM PHT (after PSE market close at 3:30 PM PHT)"""
    logger.info("Refreshing market data cache...")
    orchestrator = MarketDataOrchestrator()
    orchestrator.fetch_all_symbols(SYMBOLS)
    logger.info("Cache refresh complete")


scheduler = BackgroundScheduler()
# Explicit timezone: without this, `hour=16` fires at 4 PM in whatever
# timezone the host container's system clock is set to (often UTC on a
# deployed server), not 4 PM PHT as intended.
scheduler.add_job(refresh_market_data, "cron", hour=16, minute=0, timezone="Asia/Manila")
scheduler.start()

if __name__ == "__main__":
    import time
    try:
        logger.info("Scheduler started. Will refresh daily at 4 PM PHT.")
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.shutdown()
