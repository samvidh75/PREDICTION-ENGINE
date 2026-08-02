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
    "TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK",
    "BAJAJFINSV", "MARUTI", "LT", "AXISBANK", "SBIN",
    "BHARTIARTL", "KOTAKBANK", "HCLTECH", "ITC", "WIPRO",
    "ASIANPAINT", "DMART", "TITAN", "NESTLEIND", "HINDUNILVR",
    "NTPC", "POWERGRID", "ULTRACEMCO", "M&M", "TATAMOTORS",
    "BAJFINANCE", "ADANIENT", "ADANIPORTS", "SUNPHARMA", "DRREDDY",
    "CIPLA", "DIVISLAB", "APOLLOHOSP", "HINDALCO", "JSWSTEEL",
    "COALINDIA", "TECHM", "BRITANNIA", "EICHERMOT", "HEROMOTOCO",
    "GRASIM", "BPCL", "HDFCLIFE", "SBILIFE", "TATASTEEL",
    "INDUSINDBK", "BAJAJ-AUTO", "TATACONSUM", "HCLTECH", "WIPRO",
]


def refresh_market_data():
    """Called daily at 4 PM IST (after market close)"""
    logger.info("Refreshing market data cache...")
    orchestrator = MarketDataOrchestrator()
    orchestrator.fetch_all_symbols(SYMBOLS)
    logger.info("Cache refresh complete")


scheduler = BackgroundScheduler()
scheduler.add_job(refresh_market_data, "cron", hour=16, minute=0)
scheduler.start()

if __name__ == "__main__":
    import time
    try:
        logger.info("Scheduler started. Will refresh daily at 4 PM IST.")
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.shutdown()
