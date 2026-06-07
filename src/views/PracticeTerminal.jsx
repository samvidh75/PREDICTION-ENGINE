import React, { useState, useMemo } from 'react';
import { WatchlistTelemetry } from '../components/WatchlistTelemetry';
import { OrderTicket } from '../components/OrderTicket';
import { SimulatedPortfolio } from '../components/SimulatedPortfolio';

// Default simulated capital (₹1 crore)
const DEFAULT_CAPITAL = 10_000_000;

export const PracticeTerminal: React.FC = () => {
  // Cash available for buying positions
  const [cashBalance, setCashBalance] = useState<number>(DEFAULT_CAPITAL);

  // Holdings tracked by SimulatedPortfolio – match its expected shape
  const [holdings, setHoldings] = useState<
    Array<{ ticker: string; quantity: number; averagePrice: number; currentPrice: number }>
  >([]);

  // Currently selected asset from the watchlist
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [selectedPrice, setSelectedPrice] = useState<number>(0);

  // Resolve the full asset record for display in the order ticket
  const selectedAsset = useMemo(() => {
    return selectedTicker ? { ticker: selectedTicker, price: selectedPrice } : null;
  }, [selectedTicker, selectedPrice]);

  // ---- Handlers ----------------------------------------------------------

  const handleSelectAsset = (asset: {
    ticker: string;
    price: number;
    name: string;
    exchange: string;
    change: number;
    changePercent: number;
    isPositive: boolean;
  }) => {
    setSelectedTicker(asset.ticker);
    setSelectedPrice(asset.price);
  };

  const handleExecuteOrder = async (order: {
    ticker: string;
    price: number;
    quantity: number;
    type: 'BUY' | 'SELL';
  }) => {
    const { ticker, price, quantity, type } = order;
    const total = price * quantity;

    if (type === 'BUY') {
      // Deduct cash
      setCashBalance((prev) => prev - total);

      setHoldings((prev) => {
        const existing = prev.find((h) => h.ticker === ticker);
        if (!existing) {
          return [...prev, { ticker, quantity, averagePrice: price, currentPrice: price }];
        }
        const newQty = existing.quantity + quantity;
        const newAvg =
          (existing.quantity * existing.averagePrice + quantity * price) / newQty;
        return prev.map((h) =>
          h.ticker === ticker
            ? { ...h, quantity: newQty, averagePrice: newAvg, currentPrice: price }
            : h
        );
      });
    } else {
      // SELL – add cash back and reduce holdings
      setCashBalance((prev) => prev + total);

      setHoldings((prev) => {
        const existing = prev.find((h) => h.ticker === ticker);
        if (!existing) return prev;
        const newQty = existing.quantity - quantity;
        if (newQty <= 0) {
          // Remove position entirely
          return prev.filter((h) => h.ticker !== ticker);
        }
        // Keep averagePrice unchanged (historical cost basis)
        return prev.map((h) =>
          h.ticker === ticker ? { ...h, quantity: newQty, currentPrice: price } : h
        );
      });
    }
  };

  // ----------------------------------------------------------------------

  return (
    <div className="w-[calc(100vw-260px)] h-[calc(100vh-72px)] mt-[72px] overflow-y-auto bg-[#FAFAFA] p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left side – watchlist and order ticket */}
        <div className="lg:col-span-2 space-y-6">
          <WatchlistTelemetry
            onSelectAsset={handleSelectAsset}
            selectedTicker={selectedTicker}
          />
          {selectedAsset && (
            <OrderTicket
              ticker={selectedAsset.ticker}
              currentPrice={selectedAsset.price}
              virtualBalance={cashBalance}
              onExecuteOrder={handleExecuteOrder}
            />
          )}
        </div>
        {/* Right side – portfolio overview */}
        <div>
          <SimulatedPortfolio virtualBalance={cashBalance} holdings={holdings} />
        </div>
      </div>
    </div>
  );
};
