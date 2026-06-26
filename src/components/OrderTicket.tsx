import React, { useState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";

interface OrderTicketProps {
  ticker: string;
  currentPrice: number;
  virtualBalance: number;
  onExecuteOrder: (order: {
    ticker: string;
    price: number;
    quantity: number;
    type: "BUY" | "SELL";
  }) => Promise<void>;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  ticker,
  currentPrice,
  virtualBalance,
  onExecuteOrder
}) => {
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState<number>(100);
  const [price, setPrice] = useState<number>(currentPrice);
  const [marginError, setMarginError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Sync inputs on select updates
  useEffect(() => {
    setPrice(currentPrice);
    setMarginError(null);
  }, [ticker, currentPrice]);

  const totalCost = quantity * price;

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarginError(null);

    // 1. Invariant integrity validations
    if (quantity <= 0 || price <= 0) {
      setMarginError("QUANTITY & PRICE MUST BE POSITIVE");
      return;
    }

    // 2. Portfolio buy exposure limits check
    if (orderType === "BUY" && totalCost > virtualBalance) {
      setMarginError("INSUFFICIENT SIMULATED MARGIN");
      return;
    }

    setIsExecuting(true);
    try {
      await onExecuteOrder({
        ticker,
        price,
        quantity,
        type: orderType
      });
    } catch (e: any) {
      setMarginError(e.message || "ORDER DISMISSED");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className={`bg-[var(--color-surface)] border rounded-none p-6 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all duration-300 ${
      marginError ? "border-[#D946EF]" : "border-[rgba(148,163,184,0.16)]"
    } select-none`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Simulated Order Ticket // {ticker}
          </span>
        </div>
        <span className="font-mono text-[9px] text-[#9AA7B5] bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] px-2 py-0.5 rounded">
          ZERO CAPITAL DEV NODE
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleExecute} className="space-y-4">
        {/* Toggle Switch */}
        <div className="grid grid-cols-2 h-11 border border-[rgba(148,163,184,0.16)] bg-[var(--color-surface)]">
          <button
            type="button"
            onClick={() => { setOrderType("BUY"); setMarginError(null); }}
            className={`w-full h-full flex items-center justify-center font-bold text-xs uppercase transition-colors rounded-none ${
              orderType === "BUY" ? "bg-[var(--text-900)] text-white" : "text-[var(--text-500)]"
            }`}
          >
            Buy Position
          </button>
          <button
            type="button"
            onClick={() => { setOrderType("SELL"); setMarginError(null); }}
            className={`w-full h-full flex items-center justify-center font-bold text-xs uppercase transition-colors rounded-none ${
              orderType === "SELL" ? "bg-[var(--text-900)] text-white" : "text-[var(--text-500)]"
            }`}
          >
            Sell Position
          </button>
        </div>

        {/* Entry fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-mono text-[#9AA7B5]">Share Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(Math.max(1, parseInt(e.target.value) || 0));
                setMarginError(null);
              }}
              className="font-mono text-sm tracking-tight text-[#E6EDF3] bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] h-11 px-4 focus:border-[#06B6D4] outline-none rounded-none"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[9px] uppercase font-mono text-[#9AA7B5]">Limit Price (₹)</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => {
                setPrice(Math.max(1, parseFloat(e.target.value) || 0));
                setMarginError(null);
              }}
              className="font-mono text-sm tracking-tight text-[#E6EDF3] bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] h-11 px-4 focus:border-[#06B6D4] outline-none rounded-none"
            />
          </div>
        </div>

        {/* Exposure math */}
        <div className="bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] p-3 flex justify-between items-center font-mono text-xs text-[#64748B]">
          <span>ESTIMATED VALUE:</span>
          <span className="font-bold text-[#E6EDF3]">
            ₹{totalCost.toLocaleString("en-IN")}
          </span>
        </div>

        {/* CTA Key button */}
        <button
          type="submit"
          disabled={isExecuting}
          className="w-full h-11 rounded-none bg-[var(--text-900)] text-white hover:bg-[#333] font-medium text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform duration-100 ease-out select-none min-h-[48px]"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <span>Execute Practice Order</span>
          )}
        </button>

        {/* Error / Alert banner */}
        {marginError && (
          <div className="text-[10px] font-mono text-[#D946EF] font-bold text-center mt-1 animate-pulse uppercase tracking-wider">
            {marginError}
          </div>
        )}
      </form>

    </div>
  );
};

export default OrderTicket;
