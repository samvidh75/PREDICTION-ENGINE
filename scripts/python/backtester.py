#!/usr/bin/env python3
"""
Strategy Backtester
Validate trading strategies on historical data
"""

import json
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class TradeResult:
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    quantity: int
    profit_loss: float
    profit_loss_pct: float
    days_held: int


class Backtester:
    """Backtest trading strategies"""

    def __init__(self, ohlcv_data: List[Dict], initial_capital: float = 100000):
        self.data = pd.DataFrame(ohlcv_data)
        self.data['close'] = pd.to_numeric(self.data['close'])
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.trades = []
        self.equity_curve = [initial_capital]

    def moving_average_crossover_strategy(self, short_ma: int = 20, long_ma: int = 50) -> Dict[str, Any]:
        """
        MA Crossover Strategy
        Buy when short MA > long MA
        Sell when short MA < long MA
        """
        self.data['sma_short'] = self.data['close'].rolling(window=short_ma).mean()
        self.data['sma_long'] = self.data['close'].rolling(window=long_ma).mean()

        self.data['signal'] = 0
        self.data.loc[self.data['sma_short'] > self.data['sma_long'], 'signal'] = 1  # BUY
        self.data.loc[self.data['sma_short'] <= self.data['sma_long'], 'signal'] = -1  # SELL

        self.data['position'] = self.data['signal'].diff()

        # Execute trades
        in_position = False
        entry_price = 0
        entry_date = None

        for idx, row in self.data.iterrows():
            if row['position'] == 1 and not in_position:  # Buy signal
                in_position = True
                entry_price = row['close']
                entry_date = row['date']
                quantity = int(self.capital * 0.95 / entry_price)  # Use 95% capital

            elif row['position'] == -1 and in_position:  # Sell signal
                in_position = False
                exit_price = row['close']
                exit_date = row['date']
                profit_loss = (exit_price - entry_price) * quantity
                profit_loss_pct = (exit_price - entry_price) / entry_price * 100

                self.trades.append({
                    'entry_date': entry_date,
                    'exit_date': exit_date,
                    'entry_price': round(entry_price, 2),
                    'exit_price': round(exit_price, 2),
                    'quantity': quantity,
                    'profit_loss': round(profit_loss, 2),
                    'profit_loss_pct': round(profit_loss_pct, 2),
                    'type': 'LONG'
                })

                self.capital += profit_loss
                self.equity_curve.append(self.capital)

        return self._generate_report()

    def rsi_mean_reversion_strategy(self, rsi_period: int = 14, oversold: int = 30, overbought: int = 70) -> Dict[str, Any]:
        """
        RSI Mean Reversion
        Buy when RSI < 30 (oversold)
        Sell when RSI > 70 (overbought)
        """
        delta = self.data['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
        rs = gain / loss
        self.data['rsi'] = 100 - (100 / (1 + rs))

        in_position = False
        entry_price = 0
        entry_date = None

        for idx, row in self.data.iterrows():
            if row['rsi'] < oversold and not in_position:  # Oversold - BUY
                in_position = True
                entry_price = row['close']
                entry_date = row['date']
                quantity = int(self.capital * 0.95 / entry_price)

            elif row['rsi'] > overbought and in_position:  # Overbought - SELL
                in_position = False
                exit_price = row['close']
                exit_date = row['date']
                profit_loss = (exit_price - entry_price) * quantity
                profit_loss_pct = (exit_price - entry_price) / entry_price * 100

                self.trades.append({
                    'entry_date': entry_date,
                    'exit_date': exit_date,
                    'entry_price': round(entry_price, 2),
                    'exit_price': round(exit_price, 2),
                    'quantity': quantity,
                    'profit_loss': round(profit_loss, 2),
                    'profit_loss_pct': round(profit_loss_pct, 2),
                    'type': 'LONG'
                })

                self.capital += profit_loss
                self.equity_curve.append(self.capital)

        return self._generate_report()

    def _generate_report(self) -> Dict[str, Any]:
        """Generate backtest report"""
        if not self.trades:
            return {
                'error': 'No trades generated'
            }

        trades_df = pd.DataFrame(self.trades)

        total_return = (self.capital - self.initial_capital) / self.initial_capital
        num_trades = len(self.trades)
        winning_trades = len(trades_df[trades_df['profit_loss'] > 0])
        losing_trades = len(trades_df[trades_df['profit_loss'] < 0])

        win_rate = winning_trades / num_trades if num_trades > 0 else 0
        avg_win = trades_df[trades_df['profit_loss'] > 0]['profit_loss'].mean() if winning_trades > 0 else 0
        avg_loss = trades_df[trades_df['profit_loss'] < 0]['profit_loss'].mean() if losing_trades > 0 else 0
        profit_factor = abs(avg_win * winning_trades / (avg_loss * losing_trades)) if losing_trades > 0 else np.inf

        # Equity curve metrics
        equity_array = np.array(self.equity_curve)
        returns = np.diff(equity_array) / equity_array[:-1]
        sharpe_ratio = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0

        # Max drawdown
        cummax = np.maximum.accumulate(equity_array)
        drawdown = (equity_array - cummax) / cummax
        max_drawdown = np.min(drawdown)

        return {
            'summary': {
                'initial_capital': round(self.initial_capital, 2),
                'final_capital': round(self.capital, 2),
                'total_return_pct': round(total_return * 100, 2),
                'total_return_amount': round(self.capital - self.initial_capital, 2)
            },
            'trades': {
                'total_trades': num_trades,
                'winning_trades': winning_trades,
                'losing_trades': losing_trades,
                'win_rate': round(win_rate * 100, 2)
            },
            'performance': {
                'avg_win': round(avg_win, 2),
                'avg_loss': round(avg_loss, 2),
                'profit_factor': round(profit_factor, 2),
                'avg_trade_return': round(trades_df['profit_loss_pct'].mean(), 2)
            },
            'risk_metrics': {
                'sharpe_ratio': round(sharpe_ratio, 2),
                'max_drawdown_pct': round(max_drawdown * 100, 2),
                'max_drawdown_amount': round(max_drawdown * self.initial_capital, 2)
            },
            'trades_detail': self.trades[:10]  # First 10 trades
        }


def main():
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = json.load(sys.stdin)

        ohlcv_data = data.get('ohlcv_data', [])
        strategy = data.get('strategy', 'ma_crossover')
        initial_capital = data.get('initial_capital', 100000)

        if not ohlcv_data:
            raise ValueError("No OHLCV data provided")

        backtester = Backtester(ohlcv_data, initial_capital)

        if strategy == 'ma_crossover':
            result = backtester.moving_average_crossover_strategy()
        elif strategy == 'rsi_mean_reversion':
            result = backtester.rsi_mean_reversion_strategy()
        else:
            raise ValueError(f"Unknown strategy: {strategy}")

        output = {
            'strategy': strategy,
            'backtest_results': result,
            'status': 'success'
        }

        print(json.dumps(output, indent=2))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'status': 'failed'
        }, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
