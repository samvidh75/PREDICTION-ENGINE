#!/usr/bin/env python3
"""
10-Year Historical Data Collector
Fetches comprehensive market data for Indian stocks
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any
import pandas as pd
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed


class HistoricalDataCollector:
    """Collect 10 years of historical data for stocks"""

    def __init__(self, years: int = 10):
        self.years = years
        self.start_date = (datetime.now() - timedelta(days=years*365)).strftime('%Y-%m-%d')
        self.end_date = datetime.now().strftime('%Y-%m-%d')

        # Major Indian stocks (BSE/NSE)
        self.major_stocks = [
            'TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCL.NS', 'LT.NS',  # IT
            'HDFC.NS', 'ICICIBANK.NS', 'AXISBANK.NS', 'KOTAK.NS',  # Banking
            'RELIANCE.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS',  # Metals
            'MARUTI.NS', 'BHARTIARTL.NS', 'ITC.NS',  # Auto/Consumer
        ]

    def fetch_ohlcv_data(self, ticker: str) -> pd.DataFrame:
        """Fetch OHLCV data for a ticker"""
        try:
            data = yf.download(ticker, start=self.start_date, end=self.end_date, progress=False)
            if data.empty:
                return pd.DataFrame()

            data = data.reset_index()
            data.columns = ['date', 'open', 'high', 'low', 'close', 'volume']
            data['date'] = data['date'].dt.strftime('%Y-%m-%d')
            return data[['date', 'open', 'high', 'low', 'close', 'volume']]
        except Exception as e:
            print(f"Error fetching {ticker}: {e}", file=sys.stderr)
            return pd.DataFrame()

    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate 10-year technical indicators"""
        if df.empty:
            return df

        # Moving averages
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['sma_50'] = df['close'].rolling(window=50).mean()
        df['sma_200'] = df['close'].rolling(window=200).mean()
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()

        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))

        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']

        # Bollinger Bands
        bb_middle = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = bb_middle + (bb_std * 2)
        df['bb_lower'] = bb_middle - (bb_std * 2)
        df['bb_middle'] = bb_middle

        # ATR
        df['tr'] = pd.concat([
            df['high'] - df['low'],
            abs(df['high'] - df['close'].shift()),
            abs(df['low'] - df['close'].shift())
        ], axis=1).max(axis=1)
        df['atr'] = df['tr'].rolling(window=14).mean()

        # Volume MA
        df['volume_ma'] = df['volume'].rolling(window=20).mean()

        return df

    def fetch_fundamental_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch fundamental data for a ticker"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            return {
                'market_cap': info.get('marketCap'),
                'pe_ratio': info.get('trailingPE'),
                'pb_ratio': info.get('priceToBook'),
                'dividend_yield': info.get('dividendYield'),
                'revenue': info.get('totalRevenue'),
                'net_income': info.get('netIncomeToCommon'),
                'total_debt': info.get('totalDebt'),
                'total_cash': info.get('totalCash'),
                'free_cash_flow': info.get('freeCashflow'),
                'roe': info.get('returnOnEquity'),
                'roa': info.get('returnOnAssets'),
                'debt_to_equity': info.get('debtToEquity'),
                '52_week_high': info.get('fiftyTwoWeekHigh'),
                '52_week_low': info.get('fiftyTwoWeekLow'),
            }
        except Exception as e:
            print(f"Error fetching fundamentals for {ticker}: {e}", file=sys.stderr)
            return {}

    def collect_all_data(self) -> Dict[str, Any]:
        """Collect all data for all stocks"""
        results = {}

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(self._collect_stock_data, ticker): ticker
                for ticker in self.major_stocks
            }

            for future in as_completed(futures):
                ticker = futures[future]
                try:
                    data = future.result()
                    results[ticker] = data
                    print(f"✅ {ticker}: {len(data.get('ohlcv', []))} records")
                except Exception as e:
                    print(f"❌ {ticker}: {e}", file=sys.stderr)

        return results

    def _collect_stock_data(self, ticker: str) -> Dict[str, Any]:
        """Collect OHLCV and fundamental data for a stock"""
        ohlcv = self.fetch_ohlcv_data(ticker)

        if not ohlcv.empty:
            ohlcv = self.calculate_technical_indicators(ohlcv)

        fundamentals = self.fetch_fundamental_data(ticker)

        return {
            'ticker': ticker,
            'ohlcv': ohlcv.to_dict('records') if not ohlcv.empty else [],
            'fundamentals': fundamentals,
            'data_points': len(ohlcv),
            'date_range': f"{self.start_date} to {self.end_date}" if not ohlcv.empty else "N/A"
        }


def main():
    """Main function"""
    try:
        print("📊 Starting 10-Year Historical Data Collection...")
        print(f"📅 Period: Last 10 years")

        collector = HistoricalDataCollector(years=10)
        data = collector.collect_all_data()

        output = {
            'status': 'success',
            'collected_at': datetime.now().isoformat(),
            'period': f"{collector.start_date} to {collector.end_date}",
            'stocks': data,
            'total_stocks': len(data),
            'summary': {
                'total_records': sum(d.get('data_points', 0) for d in data.values()),
                'stocks_with_data': sum(1 for d in data.values() if d.get('data_points', 0) > 0),
            }
        }

        print(f"\n✅ Collection Complete!")
        print(f"   Total stocks: {output['total_stocks']}")
        print(f"   Total records: {output['summary']['total_records']}")
        print(f"   Stocks with data: {output['summary']['stocks_with_data']}")

        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'failed'
        }, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
