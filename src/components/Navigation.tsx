import React from "react";

export default function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-[#030303] z-50 flex items-center justify-between px-6 border-b border-white/5">
            {/* Left: Branding */}
            <div className="text-white font-bold tracking-[0.2em] uppercase text-xs">
                StockStory India
            </div>

            {/* Center: Macro Ticker Tape */}
            <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-brand-muted uppercase">
                <div className="flex gap-2 items-center">
                    <span>NSE:</span>
                    <span className="text-brand-emerald animate-pulse">STABLE</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span>BSE:</span>
                    <span className="text-brand-emerald animate-pulse">HEALTHY</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span>SME:</span>
                    <span className="text-brand-amber animate-pulse">STABLE</span>
                </div>
            </div>

            {/* Right: Action Gate */}
            <div>
                <button className="relative px-6 py-2 text-[11px] font-mono font-bold uppercase tracking-widest text-white bg-transparent border border-brand-cyan/40 hover:bg-brand-cyan/10 transition-all duration-300 overflow-hidden group">
                    <span className="absolute inset-0 border border-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-ping"></span>
                    <span className="relative z-10">Sign in</span>
                </button>
            </div>
        </nav>
    );
}
