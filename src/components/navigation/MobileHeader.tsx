import React from "react";
import { Menu } from "lucide-react";

export const MobileHeader: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-15 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-[#2a2e39] flex items-center justify-between px-4 z-50 md:hidden select-none">
      {/* Core Corporate Logo Mark */}
      <span className="text-[13px] font-semibold tracking-widest text-[#f0f3fa] uppercase font-sans">
        StockStory India
      </span>

      {/* Menu target wrapped in an explicit 48px x 48px touch target hit-box */}
      <button
        type="button"
        onClick={onMenuClick}
        className="w-[48px] h-[48px] flex items-center justify-center text-[#b2b5be] active:scale-90 transition-transform duration-100 ease-out"
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="w-5 h-5 text-[#f0f3fa]" />
      </button>
    </header>
  );
};

export default MobileHeader;
