// src/components/discovery/MarketExplorer.tsx
import React from "react";
import { StockRegistry, RegisteredStock } from "../../services/stocks/StockRegistry";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

export const MarketExplorer: React.FC = () => {
  const all = StockRegistry.getAllStocks();

  // Categories
  const trending = all.slice(0, 4);
  const leaders = all.filter((s) => s.peRatio > 0 && s.peRatio < 25).slice(0, 4);
  const highestHealth = all.filter((s) => s.healthStatus === "veryHealthy").slice(0, 4);

  const renderStockRow = (stock: RegisteredStock) => (
    <button
      key={stock.symbol}
      onClick={() => {
        navigateToStock({ ticker: stock.symbol, mode: "push" });
      }}
      className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-[14px] flex items-center justify-between transition-all cursor-pointer text-left font-vos-interface"
    >
      <div>
        <div className="text-sm font-bold text-white font-vos-display">{stock.symbol}</div>
        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{stock.companyName}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-white font-vos-display">
          ₹{stock.fiftyTwoWeekRange.current.toLocaleString("en-IN")}
        </div>
        <span className="text-[9px] uppercase font-bold text-emerald-400">
          {stock.healthStatus}
        </span>
      </div>
    </button>
  );

  return (
    <div className="w-full flex flex-col space-y-6 font-vos-interface">
      <div>
        <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
          Market Explorer
        </span>
        <h3 className="vos-sec-title font-bold text-white font-vos-display">Market Opportunities</h3>
      </div>

      {/* Desktop: 3-column layout | Mobile: Vertical list stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Trending */}
        <div className="vos-card p-6 flex flex-col space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="text-md font-bold text-white font-vos-display">Trending Today</h4>
          </div>
          <div className="flex flex-col space-y-3">
            {trending.map(renderStockRow)}
          </div>
        </div>

        {/* Column 2: Highest Health */}
        <div className="vos-card p-6 flex flex-col space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="text-md font-bold text-white font-vos-display">Highest Health</h4>
          </div>
          <div className="flex flex-col space-y-3">
            {highestHealth.map(renderStockRow)}
          </div>
        </div>

        {/* Column 3: Sector Leaders */}
        <div className="vos-card p-6 flex flex-col space-y-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="text-md font-bold text-white font-vos-display">Sector Leaders</h4>
          </div>
          <div className="flex flex-col space-y-3">
            {leaders.map(renderStockRow)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketExplorer;
