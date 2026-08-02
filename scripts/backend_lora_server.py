#!/usr/bin/env python3
"""
StockEX Enhanced Inference Server
Fine-tuned Qwen2.5-0.5B + stockex_slm_agent_output
Daily pre-computed cache + real-time data + Claude-like chat
"""

import os, json, re, sqlite3, asyncio, time, math
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from contextlib import closing
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# ── Config ────────────────────────────────────────────────────────────────
ADAPTER_PATH = Path("stockex_slm_agent_output")
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
CACHE_DB = "stockex_cache.sqlite3"
MEMORY_DB = "chat_memory.sqlite3"

app = FastAPI(title="StockEX AI")

STOP_WORDS = {"WHAT","THE","FOR","AND","ARE","CAN","HOW","WHY","ITS","ALL","ANY","BUT",
              "NOT","OUT","NOW","YOU","YOUR","HAS","HAD","WAS","WERE","WILL","THIS",
              "THAT","FROM","WITH","HAVE","BEEN","BEING","DOES","MUCH","MORE","MOST",
              "SOME","SUCH","THAN","THEN","THEM","THEY","WHEN","WHERE","WHICH","ABOUT",
              "INTO","LIKE","JUST","ALSO","VERY","WOULD","COULD","SHOULD","MAYBE",
              "STOCK","MARKET","PRICE","SHARE","TRADE","BUY","SELL","HOLD","GOOD",
              "HIGH","LOW","BIG","COMPARE","VERSUS","VERSES","V/S","VS","BETTER",
              "WHICH","ONE","BETWEEN","DIFFERENCE","ANALYZE","ANALYSIS","FUNDAMENTALS",
              "TECHNICAL","RATIO","RATIOS","MEANS","MEAN","VALUE","VALUES","TOP",
              "BOTTOM","BEST","WORST","FEATURES","PROS","CONS","EXPLAIN","WHAT",
              "EARNINGS","GROWTH","VALUE","RISK","RETURN","RETURNS","ON","AT","BY","TO","IN",
              "IT","IS","BE","DO","NO","SO","UP","GO","IF","OR","AS","AN","AM","MY",
              "USE","USED","USING","HELP","NEED","WANT","KNOW","HERE","THERE","TELL",
              "GIVE","GET","MAKE","TAKE","SEE","LOOK","SAY","COME","PUT","SET","NEW"}

NSE_200 = [
    "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","ITC","SBIN","BHARTIARTL",
    "LICI","HINDUNILVR","DMART","BAJFINANCE","NTPC","ADANIENT","ADANIPORTS",
    "M&M","TATAMOTORS","TITAN","KOTAKBANK","LT","MARUTI","ONGC","SUNPHARMA",
    "POWERGRID","ULTRACEMCO","BAJAJFINSV","WIPRO","AXISBANK","HCLTECH","TRENT",
    "COALINDIA","DLF","AVENUES","EICHERMOT","AMBUJACEM","HAL","IOC","BEL","VBL",
    "JSWSTEEL","BAJAJ-AUTO","SIEMENS","TATASTEEL","HINDALCO","BRITANNIA","PIDILITIND",
    "GRASIM","HEROMOTOCO","INDUSINDBK","NESTLEIND","MARICO","DABUR","HAVELLS",
    "ASIANPAINT","GODREJCP","BANKBARODA","TATACONSUM","TVSMOTOR","CIPLA","DRREDDY",
    "DIVISLAB","APOLLOHOSP","SBILIFE","HDFCLIFE","ICICIPRULI","SHRIRAMFIN","MUTHOOTFIN",
    "PAGEIND","JSWENERGY","TATAPOWER","ZOMATO","PNB","VEDL","INDUSTOWER",
    "ABB","BERGEPAINT","CGPOWER","UNIONBANK","CANBK","IDFCFIRSTB",
    "BANDHANBNK","MANKIND","LODHA","PHOENIXLTD","IREDA","MCDOWELL-N",
    "YESBANK","SAIL","IDEA","NHPC","GAIL","HINDCOPPER","BHEL","RECLTD",
    "PFC","IRFC","IBULHSGFIN","TECHM","LTTS","METROPOLIS","OFSS","MOTHERSON",
    "APLAPOLLO","SRTRANSFIN","CHOLAFIN","TATACOMM","ASTRAL","POLYCAB","JUBILANT",
    "BALKRISIND","MRF","APOLLOTYRE","ASHOKLEY","ESCORTS","CUMMINSIND","THERMAX",
    "KALPATPOWR","LTIM","MINDTREE","PERSISTENT","COFORGE","MPHASIS",
    "BIOCON","LUPIN","TORNTPHARM","ALKEM","AUROPHARMA","GLENMARK","NATCOPHARM",
    "CONCOR","BLUEDART","GODREJAGRO","NAVINFLUOR","GUJGASLTD","IGL","MGL",
    "ADANIGREEN","ADANITRANS","SUPREMEIND","KANSAINER","WHIRLPOOL",
    "VOLTAS","AMBER","BATAINDIA","CROMPTON","KAJARIACER","ORIENTELEC","RAJESHEXPO",
    "ENDURANCE","EXIDEIND","VARROC","RADICO","UNITEDBREW","ZYDUSLIFE",
    "ABBOTINDIA","PFIZER","GLAXO","SANOFI","SOLARINDS","TTKPRESTIG","VIPIND"
]

# ── Pydantic Models ───────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class AnalyzeRequest(BaseModel):
    ticker: str
    query: str
    use_adapter: bool = True

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    ticker: Optional[str] = None

class AnalyzeResponse(BaseModel):
    response: str
    ticker: str
    adapter_used: bool
    inference_type: str
    data_summary: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    ticker: Optional[str] = None
    adapter_used: bool

# ── Cache Layer ───────────────────────────────────────────────────────────
def init_cache():
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS daily_snapshot (
                ticker TEXT PRIMARY KEY,
                snapshot_date TEXT,
                price REAL, prev_close REAL, change_pct REAL,
                pe REAL, forward_pe REAL, pb REAL, eps REAL, forward_eps REAL, bvps REAL,
                roe REAL, roce REAL, debt_to_equity REAL, current_ratio REAL,
                market_cap REAL, enterprise_value REAL,
                revenue_growth REAL, profit_growth REAL, earnings_growth REAL,
                profit_margin REAL, operating_margin REAL,
                dividend_yield REAL, dividend_rate REAL, payout_ratio REAL,
                sector TEXT, industry TEXT,
                promoter_holding REAL, fii_holding REAL,
                sma_50 REAL, sma_200 REAL, ema_50 REAL, ema_200 REAL,
                rsi_14 REAL, macd REAL, macd_signal REAL, macd_histogram REAL,
                bb_upper REAL, bb_lower REAL, bb_width REAL,
                atr_14 REAL, support_s1 REAL, support_s2 REAL,
                resistance_r1 REAL, resistance_r2 REAL,
                high_52w REAL, low_52w REAL, avg_volume REAL, volume REAL,
                trend TEXT, macd_cross TEXT, volatility REAL,
                day_change_pct REAL, week_change_pct REAL,
                month_change_pct REAL, year_change_pct REAL,
                price_vs_sma50 REAL, price_vs_sma200 REAL, volume_ratio REAL,
                revenue REAL, profit REAL, ebitda REAL,
                free_cashflow REAL, total_debt REAL, total_cash REAL,
                book_value REAL, beta REAL, peg_ratio REAL,
                target_price REAL, recommendation TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS market_context (
                key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def get_cached_snapshot(ticker: str) -> Optional[dict]:
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM daily_snapshot WHERE ticker=? AND snapshot_date=?",
            (ticker.upper(), datetime.now().strftime("%Y-%m-%d"))
        ).fetchone()
        return dict(row) if row else None

def _get_schema_columns() -> list[str]:
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        cols = conn.execute("PRAGMA table_info(daily_snapshot)").fetchall()
        return [c[1] for c in cols]

SCHEMA_COLS = None

def save_snapshot(ticker: str, data: dict):
    global SCHEMA_COLS
    if SCHEMA_COLS is None:
        SCHEMA_COLS = _get_schema_columns()
    filtered = {k: v for k, v in data.items() if k in SCHEMA_COLS}
    if not filtered:
        return
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        cols = ", ".join(filtered.keys())
        placeholders = ", ".join("?" for _ in filtered)
        vals = list(filtered.values())
        conn.execute(f"DELETE FROM daily_snapshot WHERE ticker=?", (ticker.upper(),))
        conn.execute(f"INSERT OR REPLACE INTO daily_snapshot ({cols}) VALUES ({placeholders})", vals)
        conn.commit()

def get_all_cached_tickers() -> list[str]:
    today = datetime.now().strftime("%Y-%m-%d")
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        rows = conn.execute(
            "SELECT ticker FROM daily_snapshot WHERE snapshot_date=?", (today,)
        ).fetchall()
        return [r[0] for r in rows]

def get_market_context() -> dict:
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT key, value FROM market_context").fetchall()
        return {r["key"]: r["value"] for r in rows}

def save_market_context(ctx: dict):
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        conn.execute("DELETE FROM market_context")
        for k, v in ctx.items():
            conn.execute("INSERT INTO market_context (key, value) VALUES (?,?)", (k, str(v)))
        conn.commit()

# ── Conversation Memory ──────────────────────────────────────────────────
def init_memory():
    with closing(sqlite3.connect(MEMORY_DB)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                session_id TEXT, role TEXT, content TEXT, ticker TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON conversations(session_id)")
        conn.commit()

def get_history(session_id: str, limit: int = 6) -> list[dict]:
    with closing(sqlite3.connect(MEMORY_DB)) as conn:
        rows = conn.execute(
            "SELECT role, content, ticker FROM conversations WHERE session_id=? ORDER BY created_at DESC LIMIT ?",
            (session_id, limit)
        ).fetchall()
        return [{"role": r[0], "content": r[1], "ticker": r[2]} for r in reversed(rows)]

# ── Market Data Engine ────────────────────────────────────────────────────
def fetch_yfinance_quote(ticker: str) -> dict:
    d = {"source": "none"}
    try:
        import yfinance as yf
        s = yf.Ticker(f"{ticker}.NS")
        info = s.info or {}
        d["source"] = "yfinance"
        d["price"] = info.get("currentPrice") or info.get("regularMarketPrice")
        d["prev_close"] = info.get("previousClose") or info.get("regularMarketPreviousClose")
        d["change_pct"] = info.get("regularMarketChangePercent")
        d["pe"] = info.get("trailingPE")
        d["forward_pe"] = info.get("forwardPE")
        d["pb"] = info.get("priceToBook")
        d["eps"] = info.get("trailingEps")
        d["market_cap"] = info.get("marketCap")
        d["enterprise_value"] = info.get("enterpriseValue")
        d["roe"] = info.get("returnOnEquity")
        d["roce"] = info.get("returnOnCapitalEmployed")
        d["debt_to_equity"] = info.get("debtToEquity")
        d["current_ratio"] = info.get("currentRatio")
        d["revenue_growth"] = info.get("revenueGrowth")
        d["earnings_growth"] = info.get("earningsGrowth")
        d["profit_margin"] = info.get("profitMargins")
        d["operating_margin"] = info.get("operatingMargins")
        d["dividend_yield"] = info.get("dividendYield")
        d["dividend_rate"] = info.get("dividendRate")
        d["payout_ratio"] = info.get("payoutRatio")
        d["sector"] = info.get("sector")
        d["industry"] = info.get("industry")
        d["high_52w"] = info.get("fiftyTwoWeekHigh")
        d["low_52w"] = info.get("fiftyTwoWeekLow")
        d["avg_volume"] = info.get("averageVolume")
        d["volume"] = info.get("volume")
        d["short_ratio"] = info.get("shortRatio")
        d["beta"] = info.get("beta")
        d["book_value"] = info.get("bookValue")
        d["revenue"] = info.get("totalRevenue")
        d["revenue_per_share"] = info.get("revenuePerShare")
        d["ebitda"] = info.get("ebitda")
        d["free_cashflow"] = info.get("freeCashflow")
        d["operating_cashflow"] = info.get("operatingCashflows")
        d["gross_profit"] = info.get("grossProfits")
        d["total_debt"] = info.get("totalDebt")
        d["total_cash"] = info.get("totalCash")
        d["net_debt"] = info.get("netDebt")
        d["target_price"] = info.get("targetMeanPrice")
        d["recommendation"] = info.get("recommendationKey")
        d["number_of_analysts"] = info.get("numberOfAnalystOpinions")
        d["forward_eps"] = info.get("forwardEps")
        d["peg_ratio"] = info.get("pegRatio")
        d["revenue_quarterly_growth"] = info.get("revenueQuarterlyGrowth")
        d["earnings_quarterly_growth"] = info.get("earningsQuarterlyGrowth")
        if info.get("heldPercentInstitutions") is not None:
            d["fii_holding"] = info["heldPercentInstitutions"] * 100
        if info.get("heldPercentInsiders") is not None:
            d["promoter_holding"] = info["heldPercentInsiders"] * 100
        # Scrape financials for revenue/profit
        try:
            fs = s.financials
            if fs is not None and not fs.empty:
                if "Total Revenue" in fs.index:
                    d["revenue"] = fs.loc["Total Revenue"].iloc[0]
                if "Net Income" in fs.index:
                    d["profit"] = fs.loc["Net Income"].iloc[0]
                if "EBITDA" in fs.index:
                    d["ebitda"] = fs.loc["EBITDA"].iloc[0]
        except: pass
    except Exception as e:
        print(f"[YF] {ticker}: {e}")
    return d

def compute_technical(hist) -> dict:
    import pandas as pd
    import numpy as np
    d = {}
    close = hist["Close"]
    high = hist["High"]
    low = hist["Low"]
    volume = hist["Volume"] if "Volume" in hist else None

    d["current_price"] = float(close.iloc[-1])
    n = len(close)

    if n >= 20:
        d["sma_20"] = float(close.rolling(20).mean().iloc[-1])
    if n >= 50:
        d["sma_50"] = float(close.rolling(50).mean().iloc[-1])
    if n >= 100:
        d["sma_100"] = float(close.rolling(100).mean().iloc[-1])
    if n >= 200:
        d["sma_200"] = float(close.rolling(200).mean().iloc[-1])
    if n >= 50:
        d["ema_50"] = float(close.ewm(span=50).mean().iloc[-1])
    if n >= 200:
        d["ema_200"] = float(close.ewm(span=200).mean().iloc[-1])

    # RSI-14
    if n >= 15:
        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        d["rsi_14"] = float((100 - (100 / (1 + rs))).iloc[-1])

    # MACD
    if n >= 26:
        exp12 = close.ewm(span=12).mean()
        exp26 = close.ewm(span=26).mean()
        macd = exp12 - exp26
        signal = macd.ewm(span=9).mean()
        d["macd"] = float(macd.iloc[-1])
        d["macd_signal"] = float(signal.iloc[-1])
        d["macd_histogram"] = float((macd - signal).iloc[-1])

        # MACD cross
        prev_exp12 = close.ewm(span=12).mean().shift(1)
        prev_exp26 = close.ewm(span=26).mean().shift(1)
        prev_macd = prev_exp12 - prev_exp26
        prev_signal = prev_macd.ewm(span=9).mean()
        if not prev_macd.isna().all() and not prev_signal.isna().all():
            if macd.iloc[-1] > signal.iloc[-1] and prev_macd.iloc[-1] <= prev_signal.iloc[-1]:
                d["macd_cross"] = "BULLISH_CROSSOVER"
            elif macd.iloc[-1] < signal.iloc[-1] and prev_macd.iloc[-1] >= prev_signal.iloc[-1]:
                d["macd_cross"] = "BEARISH_CROSSOVER"
            else:
                d["macd_cross"] = "NO_CROSS"

    # Bollinger Bands
    if n >= 20:
        bb_mid = close.rolling(20).mean()
        bb_std = close.rolling(20).std()
        d["bb_upper"] = float((bb_mid + 2 * bb_std).iloc[-1])
        d["bb_middle"] = float(bb_mid.iloc[-1])
        d["bb_lower"] = float((bb_mid - 2 * bb_std).iloc[-1])
        d["bb_width"] = float(((bb_mid + 2 * bb_std) - (bb_mid - 2 * bb_std)).iloc[-1] / bb_mid.iloc[-1])

    # Trend
    if d.get("sma_50") and d.get("sma_200"):
        d["trend"] = "BULLISH" if d["sma_50"] > d["sma_200"] else "BEARISH"
    else:
        d["trend"] = "NEUTRAL"

    # Price vs SMA
    if d.get("sma_50"):
        d["price_vs_sma50"] = float((close.iloc[-1] / d["sma_50"] - 1) * 100)
    if d.get("sma_200"):
        d["price_vs_sma200"] = float((close.iloc[-1] / d["sma_200"] - 1) * 100)

    # ATR-14
    if n >= 15:
        tr = pd.concat([high - low, abs(high - close.shift()), abs(low - close.shift())], axis=1).max(axis=1)
        d["atr_14"] = float(tr.rolling(14).mean().iloc[-1])
        d["volatility"] = float((tr.rolling(14).mean() / close).iloc[-1] * 100) if close.iloc[-1] > 0 else None

    # Volume analysis
    if volume is not None and n >= 20:
        d["avg_volume_20"] = float(volume.rolling(20).mean().iloc[-1])
        if d["avg_volume_20"] > 0:
            d["volume_ratio"] = float(volume.iloc[-1] / d["avg_volume_20"])

    # Support / Resistance approximations
    if n >= 50:
        d["support_s1"] = float(close.rolling(50).min().iloc[-1])
        d["resistance_r1"] = float(close.rolling(50).max().iloc[-1])
    if n >= 200:
        d["support_s2"] = float(close.rolling(200).min().iloc[-1])
        d["resistance_r2"] = float(close.rolling(200).max().iloc[-1])

    # Price action
    d["day_change_pct"] = float(((close.iloc[-1] / close.iloc[-2]) - 1) * 100) if n >= 2 else None
    d["week_change_pct"] = float(((close.iloc[-1] / close.iloc[-6]) - 1) * 100) if n >= 6 else None
    d["month_change_pct"] = float(((close.iloc[-1] / close.iloc[-22]) - 1) * 100) if n >= 22 else None
    d["year_change_pct"] = float(((close.iloc[-1] / close.iloc[-252]) - 1) * 100) if n >= 252 else None

    return d

def compute_yfinance_technical(ticker: str) -> dict:
    try:
        import yfinance as yf
        s = yf.Ticker(f"{ticker}.NS")
        hist = s.history(period="1y")
        if hist.empty:
            return {"source": "no_data"}
        d = compute_technical(hist)
        d["source"] = "yfinance"
        return d
    except Exception as e:
        print(f"[Tech] {ticker}: {e}")
        return {"source": "error"}

def build_full_snapshot(ticker: str) -> Optional[dict]:
    try:
        quote = fetch_yfinance_quote(ticker)
        tech = compute_yfinance_technical(ticker)
        today = datetime.now().strftime("%Y-%m-%d")
        snapshot = {"ticker": ticker.upper(), "snapshot_date": today}
        for k in ["price","pe","pb","eps","market_cap","roe","debt_to_equity",
                   "current_ratio","revenue_growth","profit_margin","operating_margin",
                   "dividend_yield","sector","industry","high_52w","low_52w",
                   "avg_volume","volume","promoter_holding","fii_holding",
                   "enterprise_value","revenue","ebitda","free_cashflow",
                   "total_debt","total_cash","book_value","beta","peg_ratio",
                   "forward_pe","forward_eps","target_price","recommendation"]:
            snapshot[k] = quote.get(k)
        for k in ["sma_50","sma_200","ema_50","ema_200","rsi_14","macd","macd_signal",
                   "macd_histogram","bb_upper","bb_lower","bb_width","trend","macd_cross",
                   "atr_14","volatility","support_s1","support_s2","resistance_r1","resistance_r2",
                   "day_change_pct","week_change_pct","month_change_pct","year_change_pct",
                   "price_vs_sma50","price_vs_sma200","volume_ratio"]:
            snapshot[k] = tech.get(k)
        snapshot["profit_growth"] = quote.get("earnings_growth")
        snapshot["roce"] = quote.get("roce")
        snapshot["revenue"] = quote.get("revenue") or quote.get("totalRevenue")
        snapshot["profit"] = quote.get("profit")
        snapshot["source"] = "yfinance"
        return snapshot
    except Exception as e:
        print(f"[Snapshot] {ticker}: {e}")
        return None

def build_market_context_str(ticker: str) -> str:
    cache = get_cached_snapshot(ticker)
    d = cache or build_full_snapshot(ticker)
    if not d:
        return "Market data unavailable."
    lines = [f"Stock: {ticker.upper()}"]
    p = d.get("price")
    if p:
        lines.append(f"Current Price: ₹{p:.2f}")
    if d.get("day_change_pct") is not None:
        arrow = "▲" if d["day_change_pct"] >= 0 else "▼"
        lines.append(f"Change: {arrow} {d['day_change_pct']:+.2f}%")
    if d.get("pe"):
        lines.append(f"P/E: {d['pe']:.2f}")
    if d.get("forward_pe"):
        lines.append(f"Forward P/E: {d['forward_pe']:.2f}")
    if d.get("pb"):
        lines.append(f"P/B: {d['pb']:.2f}")
    if d.get("eps"):
        lines.append(f"EPS: ₹{d['eps']:.2f}")
    if d.get("book_value"):
        lines.append(f"Book Value: ₹{d['book_value']:.2f}")
    if d.get("roe") is not None:
        lines.append(f"ROE: {d['roe']*100:.2f}%")
    if d.get("roce") is not None:
        lines.append(f"ROCE: {d['roce']*100:.2f}%")
    if d.get("debt_to_equity") is not None:
        lines.append(f"D/E: {d['debt_to_equity']:.2f}")
    if d.get("current_ratio") is not None:
        lines.append(f"Current Ratio: {d['current_ratio']:.2f}")
    if d.get("peg_ratio"):
        lines.append(f"PEG: {d['peg_ratio']:.2f}")
    if d.get("beta"):
        lines.append(f"Beta: {d['beta']:.2f}")
    if d.get("market_cap"):
        mc = d["market_cap"]
        lines.append(f"Market Cap: ₹{mc/1e7:.2f}Cr")
    if d.get("enterprise_value"):
        lines.append(f"EV: ₹{d['enterprise_value']/1e7:.2f}Cr")
    if d.get("revenue"):
        lines.append(f"Revenue (TTM): ₹{d['revenue']/1e7:.2f}Cr")
    if d.get("profit"):
        lines.append(f"Net Profit (TTM): ₹{d['profit']/1e7:.2f}Cr")
    if d.get("ebitda"):
        lines.append(f"EBITDA: ₹{d['ebitda']/1e7:.2f}Cr")
    if d.get("free_cashflow"):
        lines.append(f"Free Cash Flow: ₹{d['free_cashflow']/1e7:.2f}Cr")
    if d.get("total_debt") is not None:
        lines.append(f"Total Debt: ₹{d['total_debt']/1e7:.2f}Cr")
    if d.get("total_cash") is not None:
        lines.append(f"Cash: ₹{d['total_cash']/1e7:.2f}Cr")
    if d.get("revenue_growth") is not None:
        lines.append(f"Revenue Growth: {d['revenue_growth']*100:.2f}%")
    if d.get("profit_growth") is not None:
        lines.append(f"Profit Growth: {d['profit_growth']*100:.2f}%")
    if d.get("profit_margin") is not None:
        lines.append(f"Profit Margin: {d['profit_margin']*100:.2f}%")
    if d.get("operating_margin") is not None:
        lines.append(f"Operating Margin: {d['operating_margin']*100:.2f}%")
    if d.get("dividend_yield") is not None:
        lines.append(f"Dividend Yield: {d['dividend_yield']*100:.3f}%")
    if d.get("payout_ratio") is not None:
        lines.append(f"Payout Ratio: {d['payout_ratio']*100:.1f}%")
    if d.get("promoter_holding") is not None:
        lines.append(f"Promoter Holding: {d['promoter_holding']:.1f}%")
    if d.get("fii_holding") is not None:
        lines.append(f"FII Holding: {d['fii_holding']:.1f}%")
    if d.get("high_52w"):
        lines.append(f"52W High: ₹{d['high_52w']:.2f}")
    if d.get("low_52w"):
        lines.append(f"52W Low: ₹{d['low_52w']:.2f}")
    if d.get("avg_volume"):
        lines.append(f"Avg Volume: {d['avg_volume']:,.0f}")
    if d.get("volume_ratio") is not None:
        lines.append(f"Volume Ratio (today/avg): {d['volume_ratio']:.2f}x")
    if d.get("sma_50"):
        lines.append(f"SMA-50: ₹{d['sma_50']:.2f}")
    if d.get("sma_200"):
        lines.append(f"SMA-200: ₹{d['sma_200']:.2f}")
    if d.get("price_vs_sma50") is not None:
        vs50 = d["price_vs_sma50"]
        lines.append(f"Price vs SMA-50: {vs50:+.2f}%")
    if d.get("price_vs_sma200") is not None:
        vs200 = d["price_vs_sma200"]
        lines.append(f"Price vs SMA-200: {vs200:+.2f}%")
    if d.get("rsi_14") is not None:
        rsi = d["rsi_14"]
        label = "Overbought" if rsi > 70 else ("Oversold" if rsi < 30 else "Neutral")
        lines.append(f"RSI-14: {rsi:.2f} ({label})")
    if d.get("macd") is not None:
        lines.append(f"MACD: {d['macd']:.2f} / Signal: {d.get('macd_signal',0):.2f} / Hist: {d.get('macd_histogram',0):.2f}")
    if d.get("macd_cross") and d["macd_cross"] != "NO_CROSS":
        lines.append(f"Signal: {d['macd_cross']}")
    if d.get("bb_width") is not None:
        bw = d["bb_width"]
        label = "Expanding" if bw > 0.1 else ("Contracting" if bw < 0.04 else "Normal")
        lines.append(f"Bollinger Width: {bw:.3f} ({label})")
    if d.get("volatility") is not None:
        lines.append(f"ATR Volatility: {d['volatility']:.2f}%")
    if d.get("trend"):
        lines.append(f"Trend: {d['trend']}")
    if d.get("recommendation"):
        lines.append(f"Analyst Consensus: {d['recommendation'].upper()}")
    if d.get("target_price"):
        lines.append(f"Analyst Target: ₹{d['target_price']:.2f}")
    if d.get("sector"):
        lines.append(f"Sector: {d['sector']}")
    if d.get("industry"):
        lines.append(f"Industry: {d['industry']}")
    lines.append(f"As of: {datetime.now().strftime('%Y-%m-%d %H:%M IST')}")
    return "\n".join(lines)

def build_data_summary(ticker: str) -> dict:
    d = get_cached_snapshot(ticker)
    if not d:
        d = build_full_snapshot(ticker)
    if not d:
        return {}
    summary = {}
    for k in ["price","pe","pb","eps","market_cap","roe","debt_to_equity",
              "current_ratio","revenue_growth","profit_margin","operating_margin",
              "dividend_yield","sma_50","sma_200","rsi_14","macd","macd_signal",
              "trend","macd_cross","bb_width","volume","high_52w","low_52w",
              "day_change_pct","week_change_pct","month_change_pct","year_change_pct",
              "atr_14","volatility","promoter_holding","fii_holding","beta",
              "target_price","recommendation","sector","industry"]:
        v = d.get(k)
        if v is not None:
            if k in ("roe","revenue_growth","profit_margin","operating_margin","profit_growth"):
                summary[k] = f"{v*100:.2f}%"
            elif k in ("dividend_yield","payout_ratio"):
                summary[k] = f"{v*100:.3f}%"
            elif k in ("promoter_holding","fii_holding"):
                summary[k] = f"{v:.1f}%"
            elif k in ("market_cap",):
                summary[k] = f"₹{v/1e7:.2f}Cr"
            elif k in ("volume",):
                summary[k] = f"{v:,.0f}"
            else:
                summary[k] = round(v, 2) if isinstance(v, float) else v
    return summary

def fetch_news(ticker: str, max_items: int = 5) -> list[dict]:
    items = []
    try:
        import feedparser
        for q in [f"{ticker}+stock+NSE+India", f"{ticker}+BSE+India", f"{ticker}+share+market"]:
            url = f"https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en"
            feed = feedparser.parse(url)
            for entry in feed.entries[:max_items]:
                items.append({
                    "title": entry.title,
                    "source": entry.source.title if hasattr(entry, "source") else "News",
                    "date": entry.published if hasattr(entry, "published") else ""
                })
            if len(items) >= max_items:
                break
    except: pass
    if not items:
        items = [{"title": f"No recent news for {ticker.upper()}", "source": "", "date": ""}]
    return items[:max_items]

# ── Daily Cache Refresh ───────────────────────────────────────────────────
def refresh_daily_cache():
    print(f"[Cache] Starting daily refresh at {datetime.now()}")
    cached = 0
    failed = []
    for ticker in NSE_200:
        try:
            snap = build_full_snapshot(ticker)
            if snap and snap.get("price"):
                save_snapshot(ticker, snap)
                cached += 1
                if cached % 20 == 0:
                    print(f"[Cache] {cached}/{len(NSE_200)} cached")
            else:
                failed.append(ticker)
        except Exception as e:
            failed.append(f"{ticker}({e})")
        time.sleep(0.3)
    market_ctx = build_market_overview()
    if market_ctx:
        save_market_context(market_ctx)
    print(f"[Cache] Done: {cached} cached, {len(failed)} failed")
    if failed:
        print(f"[Cache] Failed: {failed[:10]}...")

def build_market_overview() -> dict:
    ctx = {}
    try:
        import yfinance as yf
        indices = {"^NSEI":"NIFTY 50","^BSESN":"SENSEX","^NSEBANK":"BANK NIFTY"}
        for symbol, name in indices.items():
            try:
                idx = yf.Ticker(symbol)
                info = idx.info or {}
                hist = idx.history(period="5d")
                price = info.get("regularMarketPrice") or info.get("currentPrice")
                if price:
                    ctx[name] = f"₹{price:.2f}"
                if not hist.empty and len(hist) >= 2:
                    ctx[f"{name}_change"] = f"{((hist['Close'].iloc[-1]/hist['Close'].iloc[-2])-1)*100:+.2f}%"
            except: pass
        ctx["updated_at"] = datetime.now().isoformat()
    except: pass
    return ctx

# ── Model Layer ────────────────────────────────────────────────────────────
model = None
tokenizer = None
adapter_loaded = False

async def load_model():
    global model, tokenizer, adapter_loaded
    try:
        print(f"Loading base model: {MODEL_ID}")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map=DEVICE
        )
        if ADAPTER_PATH.exists() and (ADAPTER_PATH / "adapter_config.json").exists():
            try:
                print(f"Loading LoRA adapter from {ADAPTER_PATH}")
                model = PeftModel.from_pretrained(model, str(ADAPTER_PATH))
                model = model.merge_and_unload()
                adapter_loaded = True
                print("Adapter loaded")
            except Exception as e:
                print(f"Adapter failed: {e}")
                adapter_loaded = False
        else:
            print("No adapter; base model only")
            adapter_loaded = False
    except Exception as e:
        print(f"Model load failed: {e}")
        raise

SYSTEM_PROMPT = """You are StockEX, India's most advanced AI stock research assistant. You analyze NSE/BSE stocks with institutional-grade depth using real-time market data.

Core capabilities:
1. Comprehensive Fundamental Analysis — P/E, P/B, EPS, ROE, ROCE, D/E, margins, growth rates, cash flow, debt structure
2. Technical Analysis — RSI, MACD, moving averages, Bollinger Bands, support/resistance, volume analysis, trend detection
3. Investment Research — thesis development, risk assessment, conviction scoring, peer benchmarking
4. Market Intelligence — sector trends, index movements, FII/DII activity, market breadth

Always:
- Ground every claim in specific numbers from the live data provided
- Structure responses with clear sections: Fundamentals / Technicals / Thesis
- For signals, explain the underlying data that supports your reasoning
- Acknowledge data limitations when appropriate
- Compare metrics against sector/industry averages when possible
- Keep responses under 250 words unless deep analysis is explicitly requested
Stay focused on Indian markets (NSE, BSE). Never give personalized financial advice."""

def generate(messages: list[dict], max_new_tokens: int = 300, temp: float = 0.3) -> str:
    if model is None or tokenizer is None:
        return "Model not loaded."
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=2048).to(DEVICE)
    with torch.no_grad():
        outputs = model.generate(
            **inputs, max_new_tokens=max_new_tokens,
            temperature=temp, top_p=0.90, top_k=40,
            repetition_penalty=1.1, do_sample=temp > 0
        )
    response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    if "assistant" in response_text:
        parts = response_text.split("assistant")
        response_text = parts[-1].strip()
        if response_text.startswith("\n"):
            response_text = response_text[1:].strip()
    return response_text

# ── Intent Classification ─────────────────────────────────────────────────
def classify_intent(query: str) -> str:
    q = query.lower()
    if any(kw in q for kw in ["explain","what is","what are","what does","how to","how does",
                              "define","meaning","means","tell me about","teach me","learn"]):
        return "chat"
    if any(kw in q for kw in ["compare","vs","versus","better","which one"]):
        return "compare"
    if any(kw in q for kw in ["news","headlines","what happened","latest","recent"]):
        return "news"
    if any(kw in q for kw in ["price","quote","current price","how much","rate"]) and len(q.split()) < 8:
        return "price"
    if any(kw in q for kw in ["screen","filter","find stocks","scan","screener","top stocks",
                              "undervalued","overvalued","high growth"]):
        return "screen"
    if any(kw in q for kw in ["analyze","analysis","research","fundamental","technical","chart",
                              "pe","roe","rsi","macd","moving average","support","resistance",
                              "thesis","conviction","risk","outlook","forecast","prediction"]):
        return "analyze"
    if len(q.split()) < 5:
        return "chat"
    return "analyze"

# ── Handlers ───────────────────────────────────────────────────────────────
def handle_price(ticker: str) -> str:
    d = get_cached_snapshot(ticker) or build_full_snapshot(ticker)
    if not d or not d.get("price"):
        return f"Price data unavailable for {ticker.upper()}."
    p = d["price"]
    chg = d.get("day_change_pct", 0) or 0
    arrow = "▲" if chg >= 0 else "▼"
    mc = d.get("market_cap", 0)
    mc_str = f"₹{mc/1e7:.2f}Cr" if mc else "N/A"
    prev_close = d.get('prev_close') or p
    low_52w = d.get('low_52w') or 0
    high_52w = d.get('high_52w') or 0
    pe_val = d.get('pe') or 'N/A'
    pb_val = d.get('pb') or 'N/A'
    eps_val = d.get('eps') or 'N/A'
    sector_str = f" | Sector: {d['sector']}" if d.get('sector') else ''
    return (
        f"**{ticker.upper()}** | {arrow} ₹{p:.2f} ({chg:+.2f}%)\n"
        f"Open: ₹{prev_close:.2f} | "
        f"52W: ₹{low_52w:.2f} - ₹{high_52w:.2f}\n"
        f"P/E: {pe_val} | P/B: {pb_val} | "
        f"EPS: {eps_val} | Mkt Cap: {mc_str}{sector_str}"
    )

def handle_compare(ticker: str, query: str) -> str:
    peers_raw = re.findall(r'\b[A-Z]{2,5}\b', query.upper())
    peers = [p for p in peers_raw if p != ticker.upper() and p not in STOP_WORDS][:4]
    tickers = [ticker.upper()] + peers
    lines = [f"**Peer Comparison: {' vs '.join(tickers)}**\n"]
    header = f"{'Ticker':<12} {'Price':>10} {'P/E':>8} {'ROE':>8} {'D/E':>8} {'M Cap(₹Cr)':>14} {'Sector':>20}"
    lines.append(header)
    lines.append("─" * len(header))
    for sym in tickers:
        d = get_cached_snapshot(sym) or build_full_snapshot(sym)
        if not d or not d.get("price"):
            lines.append(f"{sym:<12} {'N/A':>10} {'N/A':>8} {'N/A':>8} {'N/A':>8} {'N/A':>14} {'N/A':>20}")
            continue
        price = f"₹{d['price']:.2f}"
        pe = f"{d['pe']:.2f}" if d.get("pe") else "N/A"
        roe = f"{d['roe']*100:.1f}%" if d.get("roe") else "N/A"
        de = f"{d['debt_to_equity']:.2f}" if d.get("debt_to_equity") is not None else "N/A"
        mc = f"{d['market_cap']/1e7:.1f}" if d.get("market_cap") else "N/A"
        sec = d.get("sector", "N/A")[:20]
        lines.append(f"{sym:<12} {price:>10} {pe:>8} {roe:>8} {de:>8} {mc:>14} {sec:>20}")
    lines.append(f"\nData as of {datetime.now().strftime('%Y-%m-%d %H:%M IST')}")
    return "\n".join(lines)

def handle_news(ticker: str) -> str:
    news = fetch_news(ticker)
    lines = [f"**Recent News: {ticker.upper()}**\n"]
    for i, item in enumerate(news[:5], 1):
        src = f" — {item['source']}" if item.get("source") else ""
        date = f" ({item['date']})" if item.get("date") else ""
        lines.append(f"{i}. {item['title']}{date}{src}")
    return "\n".join(lines)

# ── API Routes ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_cache()
    init_memory()
    await load_model()
    # Check if cache is stale; refresh if needed
    today = datetime.now().strftime("%Y-%m-%d")
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM daily_snapshot WHERE snapshot_date=?", (today,)
        ).fetchone()
        if row and row[0] < 10:
            print("[Startup] Cache stale, refreshing...")
            refresh_daily_cache()

@app.get("/api/ai/status")
async def get_status():
    cached_count = 0
    today = datetime.now().strftime("%Y-%m-%d")
    with closing(sqlite3.connect(CACHE_DB)) as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM daily_snapshot WHERE snapshot_date=?", (today,)
        ).fetchone()
        cached_count = row[0] if row else 0
    ctx = get_market_context()
    market_hours = (datetime.now().weekday() < 5 and
                    "09:15" <= datetime.now().strftime("%H:%M") <= "15:30")
    return {
        "status": "ready" if model is not None else "not_ready",
        "model_id": MODEL_ID,
        "adapter_loaded": adapter_loaded,
        "device": DEVICE,
        "capabilities": ["analyze","chat","compare","technical","fundamental","news","price","daily_cache"],
        "market_data_fields": 45,
        "cache": {"nse_200_stocks_cached": cached_count, "date": today},
        "market_context": ctx,
        "market_open": market_hours,
        "adapter_path": str(ADAPTER_PATH) if ADAPTER_PATH.exists() else None
    }

@app.post("/api/ai/analyze", response_model=AnalyzeResponse)
async def analyze_stock(request: AnalyzeRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        market_context = build_market_context_str(request.ticker)
        news = fetch_news(request.ticker)
        news_text = "\n".join([f"- {n['title']}" for n in news[:3]])
        intent = classify_intent(request.query)

        if intent == "price":
            return AnalyzeResponse(
                response=handle_price(request.ticker),
                ticker=request.ticker.upper(),
                adapter_used=False, inference_type="data",
                data_summary=build_data_summary(request.ticker)
            )
        if intent == "compare":
            return AnalyzeResponse(
                response=handle_compare(request.ticker, request.query),
                ticker=request.ticker.upper(),
                adapter_used=False, inference_type="data",
                data_summary=build_data_summary(request.ticker)
            )
        if intent == "news":
            return AnalyzeResponse(
                response=handle_news(request.ticker),
                ticker=request.ticker.upper(),
                adapter_used=False, inference_type="data",
                data_summary=build_data_summary(request.ticker)
            )

        d = get_cached_snapshot(request.ticker) or build_full_snapshot(request.ticker)
        data_quality = "full" if d and d.get("price") else "limited"

        system_content = (
            f"{SYSTEM_PROMPT}\n\n"
            f"[LIVE MARKET DATA — {request.ticker.upper()}] (Quality: {data_quality})\n"
            f"{market_context}\n\n"
            f"[RECENT HEADLINES]\n{news_text}\n\n"
            f"Instructions: Use ONLY the data above. Do not invent numbers. "
            f"Structure: Fundamentals → Technicals → Thesis. "
            f"If data is unavailable, state it clearly."
        )

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": request.query}
        ]

        response_text = generate(messages, max_new_tokens=200, temp=0.3)
        inf_type = "fine-tuned" if (adapter_loaded and request.use_adapter) else "base"

        return AnalyzeResponse(
            response=response_text,
            ticker=request.ticker.upper(),
            adapter_used=adapter_loaded and request.use_adapter,
            inference_type=inf_type,
            data_summary=build_data_summary(request.ticker)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        messages = request.messages
        user_msg = messages[-1].content if messages else ""
        ticker = request.ticker
        if not ticker:
            found = [w for w in re.findall(r'\b[A-Z]{2,5}\b', user_msg.upper()) if w not in STOP_WORDS]
            if found:
                ticker = found[0]

        intent = classify_intent(user_msg)
        market_context = ""
        news_text = ""

        if ticker:
            market_context = build_market_context_str(ticker)
            news = fetch_news(ticker)
            news_text = "\n".join([f"- {n['title']}" for n in news[:3]])

        if intent == "price" and ticker:
            response_text = handle_price(ticker)
        elif intent == "news" and ticker:
            response_text = handle_news(ticker)
        elif intent == "compare" and ticker:
            response_text = handle_compare(ticker, user_msg)
        else:
            system_content = SYSTEM_PROMPT
            if market_context:
                system_content += f"\n\n[LIVE DATA — {ticker}]\n{market_context}\n{news_text}"
            msgs = [{"role": "system", "content": system_content}]
            for m in messages:
                if m.role in ("user", "assistant"):
                    msgs.append({"role": m.role, "content": m.content})
            response_text = generate(msgs, max_new_tokens=300, temp=0.5)

        return ChatResponse(
            response=response_text,
            ticker=ticker.upper() if ticker else None,
            adapter_used=adapter_loaded
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

# ── Daily Refresh Endpoint (triggered by cron) ──────────────────────────
@app.post("/api/ai/refresh-cache")
async def refresh_cache():
    refresh_daily_cache()
    ctx = get_market_context()
    return {
        "status": "ok",
        "cached": len(get_all_cached_tickers()),
        "market_context": ctx,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 3001)), workers=1)
