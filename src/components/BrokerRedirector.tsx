import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";

interface BrokerRedirectorProps {
  ticker: string;
}

export const BrokerRedirector: React.FC<BrokerRedirectorProps> = ({ ticker }) => {
  const [redirecting, setRedirecting] = useState<boolean>(false);

  /**
   * Safe Execution Out-routing Protocol
   * Blocks local transaction states and redirects cleanly.
   */
  const handleRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    setRedirecting(true);

    setTimeout(() => {
      setRedirecting(false);
    }, 350);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] p-6 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-4 select-none">
      
      {/* Title */}
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-4.5 h-4.5 text-[#D946EF]" />
        <span className="text-[11px] font-mono font-medium tracking-wider text-[#9AA7B5] uppercase">
          External Analytical Out-Routing
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-[#9AA7B5]">
        StockStory India is a research platform. Brokerage execution is not connected in this app.
      </p>

      {/* Redirect Trigger */}
      <div className="flex flex-col">
        <button
          type="button"
          onClick={handleRedirect}
          disabled
          className="h-11 w-full rounded-none bg-neutral-950 hover:bg-neutral-900 text-white font-medium text-xs uppercase tracking-wider flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform duration-100 ease-out select-none"
        >
          {redirecting ? (
            <span>Checking connection...</span>
          ) : (
            <span>Broker execution unavailable</span>
          )}
        </button>
      </div>

      {/* Safety Notice Segment */}
      <div className="flex items-center justify-center space-x-1 font-mono text-[9px] text-[#9AA7B5] uppercase tracking-widest pt-2 border-t border-[rgba(148,163,184,0.16)]">
        <span>Research only. No order routing.</span>
      </div>

    </div>
  );
};

export default BrokerRedirector;
