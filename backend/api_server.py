#!/usr/bin/env python3
"""
FastAPI server to serve cached market data
No real-time API calls from frontend - only serves cached data
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from data_fetcher import MarketDataOrchestrator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="StockStory Market Data API")
orchestrator = MarketDataOrchestrator()


@app.get("/api/market-data/quote/{symbol}")
def get_quote(symbol: str):
    package = orchestrator.get_symbol_package(symbol)
    if not package.get('quote'):
        raise HTTPException(status_code=404, detail=f"No data for {symbol}")
    return JSONResponse(content=package)


@app.get("/api/market-data/technical/{symbol}")
def get_technical_indicators(symbol: str):
    package = orchestrator.get_symbol_package(symbol)
    return {
        'symbol': symbol,
        'indicators': package['technical_indicators'],
        'ema_crosses': package['ema_crosses'],
    }


@app.get("/api/market-data/options-greeks/{symbol}")
def get_options_greeks(symbol: str):
    package = orchestrator.get_symbol_package(symbol)
    return {'symbol': symbol, 'greeks': package['options_greeks']}


@app.get("/api/market-data/all/{symbols}")
def get_all_data(symbols: str):
    symbol_list = [s.strip() for s in symbols.split(",")]
    results = {}
    for sym in symbol_list:
        results[sym] = orchestrator.get_symbol_package(sym)
    return results


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Market data API running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
