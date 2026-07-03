#!/usr/bin/env python3
"""
Real-time market data fetcher
- Live prices: yfinance, NSEPython
- Option chains: NSEPython, manual scraping
- Fundamentals: XBRL from BSE, Screener.in
- Technical indicators: pandas_ta
- Caching: SQLite + JSON

Rate limiting: 2-5s between requests (never in while True)
"""

import time
import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from pathlib import Path

import yfinance as yf
import requests
from bs4 import BeautifulSoup

try:
    import pandas_ta as ta
    HAS_PANDAS_TA = True
except ImportError:
    HAS_PANDAS_TA = False

try:
    from nsepython import nse_eq, nse_quote, nse_get_index_quote
    HAS_NSEPYTHON = True
except ImportError:
    HAS_NSEPYTHON = False

try:
    from scipy.stats import norm
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


class MarketDataCache:
    """Local SQLite cache for market data"""

    def __init__(self, db_path: str = "data/market_data.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY,
                symbol TEXT UNIQUE NOT NULL,
                price REAL,
                bid REAL,
                ask REAL,
                volume INTEGER,
                open REAL,
                high REAL,
                low REAL,
                prev_close REAL,
                timestamp TEXT,
                fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ohlcv (
                id INTEGER PRIMARY KEY,
                symbol TEXT NOT NULL,
                date TEXT NOT NULL,
                open REAL,
                high REAL,
                low REAL,
                close REAL,
                volume INTEGER,
                UNIQUE(symbol, date)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS option_chains (
                id INTEGER PRIMARY KEY,
                symbol TEXT NOT NULL,
                expiry TEXT NOT NULL,
                strike REAL NOT NULL,
                option_type TEXT NOT NULL,
                open_interest INTEGER,
                volume INTEGER,
                ltp REAL,
                iv REAL,
                delta REAL,
                gamma REAL,
                vega REAL,
                theta REAL,
                timestamp TEXT,
                UNIQUE(symbol, expiry, strike, option_type)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fundamentals (
                id INTEGER PRIMARY KEY,
                symbol TEXT UNIQUE NOT NULL,
                pe REAL,
                pb REAL,
                roe REAL,
                debt_equity REAL,
                market_cap TEXT,
                revenue_cagr REAL,
                fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS technical_indicators (
                id INTEGER PRIMARY KEY,
                symbol TEXT NOT NULL,
                date TEXT NOT NULL,
                sma_50 REAL,
                sma_200 REAL,
                ema_50 REAL,
                ema_200 REAL,
                rsi_14 REAL,
                macd REAL,
                macd_signal REAL,
                macd_histogram REAL,
                bb_upper REAL,
                bb_middle REAL,
                bb_lower REAL,
                atr_14 REAL,
                UNIQUE(symbol, date)
            )
        """)

        conn.commit()
        conn.close()

    def insert_quote(self, symbol: str, data: Dict):
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO quotes
            (symbol, price, bid, ask, volume, open, high, low, prev_close, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            symbol.upper(),
            data.get('price'),
            data.get('bid'),
            data.get('ask'),
            data.get('volume'),
            data.get('open'),
            data.get('high'),
            data.get('low'),
            data.get('prev_close'),
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()

    def get_quote(self, symbol: str) -> Optional[Dict]:
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quotes WHERE symbol = ?", (symbol.upper(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                'symbol': row[1],
                'price': row[2],
                'bid': row[3],
                'ask': row[4],
                'volume': row[5],
                'open': row[6],
                'high': row[7],
                'low': row[8],
                'prev_close': row[9],
                'timestamp': row[10],
            }
        return None

    def insert_ohlcv_batch(self, symbol: str, df: pd.DataFrame):
        conn = sqlite3.connect(str(self.db_path))
        if isinstance(df.columns, pd.MultiIndex):
            tickers = df.columns.get_level_values(1).unique()
            ticker_key = tickers[0] if len(tickers) > 0 else symbol.upper()
            flat = df.xs(ticker_key, axis=1, level=1)
        else:
            flat = df
        for idx, row in flat.iterrows():
            try:
                open_v = float(row['Open'])
                high_v = float(row['High'])
                low_v = float(row['Low'])
                close_v = float(row['Close'])
                volume_v = int(row['Volume'])
            except (TypeError, KeyError):
                continue
            conn.execute("""
                INSERT OR REPLACE INTO ohlcv
                (symbol, date, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                symbol.upper(),
                idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx),
                open_v, high_v, low_v, close_v, volume_v,
            ))
        conn.commit()
        conn.close()

    def get_ohlcv(self, symbol: str, days: int = 250) -> pd.DataFrame:
        conn = sqlite3.connect(str(self.db_path))
        query = f"""
            SELECT date, open, high, low, close, volume
            FROM ohlcv
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT {days}
        """
        df = pd.read_sql_query(query, conn, params=(symbol.upper(),), parse_dates=['date'])
        conn.close()
        if not df.empty:
            df = df.sort_values('date').reset_index(drop=True)
        return df


class LivePriceFetcher:
    """Fetch live prices from multiple sources with fallback"""

    def __init__(self, cache: MarketDataCache):
        self.cache = cache

    def fetch_yfinance(self, symbol: str) -> Optional[Dict]:
        try:
            ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
            data = yf.Ticker(ticker)
            info = data.info
            return {
                'price': info.get('currentPrice') or info.get('regularMarketPrice'),
                'bid': info.get('bid'),
                'ask': info.get('ask'),
                'volume': info.get('volume'),
                'open': info.get('open'),
                'high': info.get('dayHigh'),
                'low': info.get('dayLow'),
                'prev_close': info.get('previousClose'),
            }
        except Exception as e:
            logger.warning(f"yfinance failed for {symbol}: {e}")
            return None

    def fetch_indianapi(self, symbol: str) -> Optional[Dict]:
        try:
            time.sleep(2)
            url = f"https://data.indianapi.in/nse/quote/{symbol.upper()}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                return {
                    'price': data.get('price'),
                    'bid': data.get('bid'),
                    'ask': data.get('ask'),
                    'volume': data.get('volume'),
                    'open': data.get('open'),
                    'high': data.get('high'),
                    'low': data.get('low'),
                    'prev_close': data.get('prevClose'),
                }
        except Exception as e:
            logger.warning(f"IndianAPI failed for {symbol}: {e}")
        return None

    def fetch_nsepython(self, symbol: str) -> Optional[Dict]:
        if not HAS_NSEPYTHON:
            return None
        try:
            time.sleep(3)
            quote = nse_quote(symbol.upper())
            if quote:
                return {
                    'price': float(quote.get('lastPrice', 0)),
                    'bid': float(quote.get('bid', 0)),
                    'ask': float(quote.get('ask', 0)),
                    'volume': int(quote.get('totalTradedVolume', 0)),
                    'open': float(quote.get('open', 0)),
                    'high': float(quote.get('dayHigh', 0)),
                    'low': float(quote.get('dayLow', 0)),
                    'prev_close': float(quote.get('previousClose', 0)),
                }
        except Exception as e:
            logger.warning(f"NSEPython failed for {symbol}: {e}")
        return None

    def fetch_live_price(self, symbol: str) -> Dict:
        logger.info(f"Fetching {symbol}...")
        price_data = (
            self.fetch_yfinance(symbol)
            or self.fetch_indianapi(symbol)
            or self.fetch_nsepython(symbol)
        )
        if price_data:
            self.cache.insert_quote(symbol, price_data)
            return price_data
        cached = self.cache.get_quote(symbol)
        if cached:
            logger.warning(f"Using cached price for {symbol}")
            return cached
        return {'price': None, 'error': f"Could not fetch {symbol}"}


class HistoricalDataFetcher:
    """Fetch historical OHLCV for technical indicators"""

    def __init__(self, cache: MarketDataCache):
        self.cache = cache

    def fetch_from_yfinance(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        try:
            ticker = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
            df = yf.download(ticker, period=period, progress=False)
            return df
        except Exception as e:
            logger.error(f"Failed to fetch historical data for {symbol}: {e}")
            return pd.DataFrame()

    def fetch_and_cache(self, symbols: List[str]):
        for symbol in symbols:
            cached = self.cache.get_ohlcv(symbol, days=1)
            if not cached.empty:
                logger.info(f"Using cached OHLCV for {symbol}")
                continue
            logger.info(f"Downloading OHLCV for {symbol}...")
            df = self.fetch_from_yfinance(symbol, period="1y")
            if not df.empty:
                self.cache.insert_ohlcv_batch(symbol, df)
                logger.info(f"Cached {len(df)} days for {symbol}")
            time.sleep(3)


class TechnicalIndicatorCalculator:
    """Calculate RSI, EMA, MACD, Bollinger Bands, ATR"""

    def __init__(self, cache: MarketDataCache):
        self.cache = cache

    def calculate_indicators(self, symbol: str) -> pd.DataFrame:
        df = self.cache.get_ohlcv(symbol, days=250)
        if df.empty:
            logger.warning(f"No data for {symbol}")
            return pd.DataFrame()

        if HAS_PANDAS_TA:
            return self._calculate_pandas_ta(df)
        return self._calculate_native(df)

    def _calculate_pandas_ta(self, df: pd.DataFrame) -> pd.DataFrame:
        df['SMA_50'] = ta.sma(df['close'], length=50)
        df['SMA_200'] = ta.sma(df['close'], length=200)
        df['EMA_50'] = ta.ema(df['close'], length=50)
        df['EMA_200'] = ta.ema(df['close'], length=200)
        df['RSI_14'] = ta.rsi(df['close'], length=14)
        macd = ta.macd(df['close'], fast=12, slow=26, signal=9)
        if macd is not None:
            col_macd = [c for c in macd.columns if 'MACD_' in c and 'MACDh' not in c and 'MACDs' not in c]
            col_signal = [c for c in macd.columns if 'MACDs' in c]
            col_hist = [c for c in macd.columns if 'MACDh' in c]
            df['MACD'] = macd[col_macd[0]] if col_macd else None
            df['MACD_SIGNAL'] = macd[col_signal[0]] if col_signal else None
            df['MACD_HISTOGRAM'] = macd[col_hist[0]] if col_hist else None
        bb = ta.bbands(df['close'], length=20, std=2)
        if bb is not None:
            col_upper = [c for c in bb.columns if 'BBU_' in c]
            col_middle = [c for c in bb.columns if 'BBM_' in c]
            col_lower = [c for c in bb.columns if 'BBL_' in c]
            df['BB_UPPER'] = bb[col_upper[0]] if col_upper else None
            df['BB_MIDDLE'] = bb[col_middle[0]] if col_middle else None
            df['BB_LOWER'] = bb[col_lower[0]] if col_lower else None
        atr_result = ta.atr(df['high'], df['low'], df['close'], length=14)
        if atr_result is not None:
            df['ATR_14'] = atr_result
        return df

    def _calculate_native(self, df: pd.DataFrame) -> pd.DataFrame:
        close = df['close']
        high = df['high']
        low = df['low']

        df['SMA_50'] = close.rolling(window=50).mean()
        df['SMA_200'] = close.rolling(window=200).mean()
        df['EMA_50'] = close.ewm(span=50, adjust=False).mean()
        df['EMA_200'] = close.ewm(span=200, adjust=False).mean()

        delta = close.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = (-delta.where(delta < 0, 0.0))
        avg_gain = gain.rolling(window=14).mean()
        avg_loss = loss.rolling(window=14).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        df['RSI_14'] = 100 - (100 / (1 + rs))

        ema_fast = close.ewm(span=12, adjust=False).mean()
        ema_slow = close.ewm(span=26, adjust=False).mean()
        df['MACD'] = ema_fast - ema_slow
        df['MACD_SIGNAL'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_HISTOGRAM'] = df['MACD'] - df['MACD_SIGNAL']

        bb_mid = close.rolling(window=20).mean()
        bb_std = close.rolling(window=20).std()
        df['BB_MIDDLE'] = bb_mid
        df['BB_UPPER'] = bb_mid + 2 * bb_std
        df['BB_LOWER'] = bb_mid - 2 * bb_std

        tr = pd.concat([
            high - low,
            (high - close.shift()).abs(),
            (low - close.shift()).abs(),
        ], axis=1).max(axis=1)
        df['ATR_14'] = tr.rolling(window=14).mean()

        return df


class OptionGreeksCalculator:
    """Calculate Delta, Gamma, Vega, Theta using Black-Scholes"""

    def __init__(self):
        self.risk_free_rate = 0.06
        self.dividend_yield = 0.02

    def calculate_greeks(
        self,
        S: float,
        K: float,
        T: float,
        r: float = None,
        sigma: float = 0.25,
        option_type: str = "CALL",
        q: float = None,
    ) -> Dict[str, float]:
        r = r or self.risk_free_rate
        q = q or self.dividend_yield

        if HAS_SCIPY:
            return self._calculate_scipy(S, K, T, r, sigma, option_type, q)
        return self._approximate_greeks(S, K, T, r, sigma, option_type)

    def _calculate_scipy(self, S, K, T, r, sigma, option_type, q) -> Dict[str, float]:
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T)) if sigma > 0 and T > 0 else 0
        d2 = d1 - sigma * np.sqrt(T) if sigma > 0 and T > 0 else 0

        if option_type.upper() == "CALL":
            delta = np.exp(-q * T) * norm.cdf(d1)
            price = S * np.exp(-q * T) * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            delta = -np.exp(-q * T) * norm.cdf(-d1)
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * np.exp(-q * T) * norm.cdf(-d1)

        gamma = np.exp(-q * T) * norm.pdf(d1) / (S * sigma * np.sqrt(T)) if sigma > 0 and T > 0 else 0
        vega = S * np.exp(-q * T) * norm.pdf(d1) * np.sqrt(T) / 100 if T > 0 else 0
        theta_term_1 = -S * np.exp(-q * T) * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) if T > 0 else 0
        if option_type.upper() == "CALL":
            theta_term_2 = -r * K * np.exp(-r * T) * norm.cdf(d2)
        else:
            theta_term_2 = r * K * np.exp(-r * T) * norm.cdf(-d2)
        theta = (theta_term_1 + theta_term_2) / 365

        return {'price': price, 'delta': delta, 'gamma': gamma, 'vega': vega, 'theta': theta}

    def _approximate_greeks(self, S, K, T, r, sigma, option_type) -> Dict[str, float]:
        moneyness = S / K
        if option_type.upper() == "CALL":
            if moneyness > 1.1:
                delta = 0.9
            elif moneyness > 1.05:
                delta = 0.7
            elif moneyness > 0.95:
                delta = 0.5
            elif moneyness > 0.9:
                delta = 0.3
            else:
                delta = 0.1
        else:
            if moneyness > 1.1:
                delta = -0.1
            elif moneyness > 1.05:
                delta = -0.3
            elif moneyness > 0.95:
                delta = -0.5
            elif moneyness > 0.9:
                delta = -0.7
            else:
                delta = -0.9

        gamma = 0.01 / (S * sigma * np.sqrt(T)) if T > 0 and sigma > 0 else 0.01
        vega = S * sigma * np.sqrt(T) / 100 if T > 0 else 0
        theta = -S * sigma / (2 * np.sqrt(T)) / 365 if T > 0 else -0.01

        return {'price': None, 'delta': delta, 'gamma': gamma, 'vega': vega, 'theta': theta}


class MarketDataOrchestrator:
    """Main orchestrator: fetch once, cache, serve to frontend"""

    def __init__(self, db_path: str = "data/market_data.db"):
        self.cache = MarketDataCache(db_path)
        self.price_fetcher = LivePriceFetcher(self.cache)
        self.historical_fetcher = HistoricalDataFetcher(self.cache)
        self.indicators = TechnicalIndicatorCalculator(self.cache)
        self.greeks = OptionGreeksCalculator()

    def fetch_all_symbols(self, symbols: List[str]):
        logger.info(f"Starting data pipeline for {len(symbols)} symbols...")
        self.historical_fetcher.fetch_and_cache(symbols)
        for symbol in symbols:
            self.price_fetcher.fetch_live_price(symbol)
            time.sleep(3)
        logger.info("Data pipeline complete")

    def get_symbol_package(self, symbol: str) -> Dict:
        quote = self.cache.get_quote(symbol)
        indicators = self.indicators.calculate_indicators(symbol)
        ema_crosses = self._find_ema_crosses(indicators)

        latest_ind = indicators.iloc[-1] if not indicators.empty else {}

        current_price = quote.get('price') if quote else 0
        call_greeks, put_greeks = {}, {}
        if current_price and current_price > 0:
            strike = round(current_price / 10) * 10
            call_greeks = self.greeks.calculate_greeks(
                S=current_price, K=strike, T=30/365, option_type="CALL"
            )
            put_greeks = self.greeks.calculate_greeks(
                S=current_price, K=strike, T=30/365, option_type="PUT"
            )

        return {
            'symbol': symbol,
            'quote': quote,
            'technical_indicators': {
                'rsi_14': self._val(latest_ind, 'RSI_14'),
                'sma_50': self._val(latest_ind, 'SMA_50'),
                'sma_200': self._val(latest_ind, 'SMA_200'),
                'ema_50': self._val(latest_ind, 'EMA_50'),
                'ema_200': self._val(latest_ind, 'EMA_200'),
                'macd': self._val(latest_ind, 'MACD'),
                'macd_signal': self._val(latest_ind, 'MACD_SIGNAL'),
                'macd_histogram': self._val(latest_ind, 'MACD_HISTOGRAM'),
                'bb_upper': self._val(latest_ind, 'BB_UPPER'),
                'bb_middle': self._val(latest_ind, 'BB_MIDDLE'),
                'bb_lower': self._val(latest_ind, 'BB_LOWER'),
                'atr_14': self._val(latest_ind, 'ATR_14'),
            },
            'ema_crosses': ema_crosses,
            'options_greeks': {'call': call_greeks, 'put': put_greeks},
            'timestamp': datetime.now().isoformat(),
        }

    def _find_ema_crosses(self, df: pd.DataFrame) -> List[Dict]:
        if df.empty or len(df) < 2:
            return []
        crosses = []
        for i in range(1, len(df)):
            p50, c50 = df.iloc[i-1]['EMA_50'], df.iloc[i]['EMA_50']
            p200, c200 = df.iloc[i-1]['EMA_200'], df.iloc[i]['EMA_200']
            if pd.isna(p50) or pd.isna(c50) or pd.isna(p200) or pd.isna(c200):
                continue
            if p50 <= p200 and c50 > c200:
                crosses.append({'type': 'GOLDEN_CROSS', 'date': str(df.iloc[i].name)})
            if p50 >= p200 and c50 < c200:
                crosses.append({'type': 'DEATH_CROSS', 'date': str(df.iloc[i].name)})
        return crosses

    @staticmethod
    def _val(row, key):
        v = row.get(key)
        return float(v) if v is not None and not (isinstance(v, float) and np.isnan(v)) else None


if __name__ == "__main__":
    SYMBOLS = [
        "TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK",
        "BAJAJFINSV", "MARUTI", "LT", "AXISBANK", "SBIN",
        "BHARTIARTL", "KOTAKBANK", "HCLTECH", "ITC", "WIPRO",
        "ASIANPAINT", "DMART", "TITAN", "NESTLEIND", "HINDUNILVR",
    ]
    orchestrator = MarketDataOrchestrator()
    orchestrator.fetch_all_symbols(SYMBOLS)
    for symbol in SYMBOLS[:3]:
        package = orchestrator.get_symbol_package(symbol)
        print(json.dumps(package, indent=2, default=str))
        print("\n" + "=" * 80 + "\n")
