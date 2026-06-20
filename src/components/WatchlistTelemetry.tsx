import React from "react";
import { PlusCircle, Search, TrendingUp, AlertTriangle } from "lucide-react";

export type WatchlistAsset = {
  id: string;
  ticker: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
};

interface WatchlistTelemetryProps {
  onSelectAsset: (asset: WatchlistAsset) => void;
  selectedTicker: string;
}

export const WatchlistTelemetry: React.FC<WatchlistTelemetryProps> = ({
  onSelectAsset,
  selectedTicker
}) => {
  const assets: WatchlistAsset[] = [
    {
      id: "WL_INFY",
      ticker: "INFY",
      name: "Infosys Limited",
      exchange: "NSE",
      price: 1425,
      change: 12.4,
      changePercent: 0.88,
      isPositive: true
    },
    {
      id: "WL_TCS",
      ticker: "TCS",
      name: "Tata Consultancy",
      exchange: "NSE",
      price: 3820,
      change: 45.2,
      changePercent: 1.20,
      isPositive: true
    },
    {
      id: "WL_RELIANCE",
      ticker: "RELIANCE",
      name: "Reliance Industries",
      exchange: "BSE",
      price: 2450,
      change: -18.5,
      changePercent: -0.75,
      isPositive: false
    },
    {
      id: "WL_GRANULES",
      ticker: "GRANULES",
      name: "Granules India",
      exchange: "NSE",
      price: 420,
      change: -4.3,
      changePercent: -1.01,
      isPositive: false
    },
    {
      id: "WL_CHENTRADA",
      ticker: "CHENNPETRO",
      name: "Chennai Petroleum",
      exchange: "NSE",
      price: 840,
      change: 22.1,
      changePercent: 2.70,
      isPositive: true
    }
  ];

  return (
    <div className="bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] p-6 rounded-none flex flex-col space-y-4 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
        <div className="flex items-center space-x-2">
          <Search className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[var(--color-text-primary)]">
            Watchlist Market Feed
          </span>
        </div>
        <span className="font-mono text-[9px] text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] px-2 py-0.5 rounded">
          NSE // BSE SECTOR INDEX
        </span>
      </div>

      {/* Grid List */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="border-b border-[rgba(148,163,184,0.16)] text-[var(--color-text-secondary)] font-mono text-[9px] uppercase tracking-wider">
              <th className="pb-2 font-medium">Symbol // Name</th>
              <th className="pb-2 font-medium">Exchange</th>
              <th className="pb-2 font-medium text-right">Price</th>
              <th className="pb-2 font-medium text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(148,163,184,0.16)]">
            {assets.map((asset) => {
              const isSelected = selectedTicker === asset.ticker;

              return (
                <tr
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                  className={`hover:bg-[rgba(15,23,42,0.04)] transition-all duration-200 cursor-pointer ${
                    isSelected ? "bg-[var(--color-surface-raised)]" : ""
                  }`}
                >
                  {/* Symbol */}
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <div className="font-bold text-[var(--color-text-primary)] font-mono">{asset.ticker}</div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-secondary)] truncate max-w-[130px]">
                      {asset.name}
                    </div>
                  </td>

                  {/* Exchange */}
                  <td className="py-3 font-mono text-[#64748B]">
                    {asset.exchange}
                  </td>

                  {/* Price */}
                  <td className="py-3 font-mono text-right text-[var(--color-text-primary)] font-semibold">
                    ₹{asset.price.toLocaleString("en-IN")}
                  </td>

                  {/* Change */}
                  <td className={`py-3 font-mono text-right font-semibold ${
                    asset.isPositive ? "text-[#06B6D4]" : "text-[#D946EF]"
                  }`}>
                    {asset.isPositive ? "+" : ""}
                    {asset.changePercent}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] leading-relaxed text-[var(--color-text-secondary)] text-center font-mono uppercase tracking-widest pt-2 border-t border-[rgba(148,163,184,0.16)]">
        Click Row to Load Order Ticket
      </div>
    </div>
  );
};

export default WatchlistTelemetry;
