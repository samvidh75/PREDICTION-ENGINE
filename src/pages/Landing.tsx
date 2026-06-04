import React from "react";
import Navigation from "../components/Navigation";

export default function Landing() {
    return (
        <div className="min-h-screen bg-brand-void bg-planetary-haze bg-magenta-glow text-white pt-16">
            {/* Pinned Navigation Grid */}
            <Navigation />

            <main className="max-w-[1440px] mx-auto px-6 py-16 md:py-24 space-y-24">
                {/* Atmospheric Cinematic Core Hero Section */}
                <section className="flex flex-col items-center justify-center text-center space-y-16">
                    <div className="space-y-6">
                        <h1 className="text-4xl md:text-[56px] font-semibold tracking-[-0.04em] text-white leading-tight">
                            Intelligence without <br className="hidden md:block" />
                            <span className="text-brand-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                                the noise.
                            </span>
                        </h1>
                        <p className="text-brand-muted max-w-2xl mx-auto text-sm md:text-[15px] leading-relaxed tracking-wide">
                            Zero-advisory market documentaries. High-precision enterprise
                            analysis grounded in company data, valuation context, and ownership evidence.
                        </p>
                    </div>

                    {/* Company intelligence showcase */}
                    <div className="w-full max-w-4xl bg-brand-surface border border-gray-100 text-black p-8 md:p-10 rounded-[28px] shadow-premium-card text-left relative overflow-hidden">
                        {/* Volumetric ambient background in card */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-cyan/5 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted mb-3">
                            Enterprise Identity
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
                            Reliance Industries
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                            {/* Market Cap Info */}
                            <div className="space-y-2.5">
                                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted">
                                    Market Capitalization
                                </div>
                                <div className="text-xl font-semibold font-mono tracking-tight">
                                    ₹16,45,000 Crores
                                </div>
                                <div className="text-xs text-[#666666] leading-relaxed">
                                    Sixteen Lakh Forty-Five Thousand Crores
                                </div>
                            </div>

                            {/* Healthometer Gauge */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted">
                                        150-Parameter Review
                                    </div>
                                    <div className="text-[10px] font-mono font-bold tracking-widest text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-2 py-1 rounded">
                                        HEALTHY
                                    </div>
                                </div>
                                {/* Laser-Cyan Progress Bar */}
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-brand-cyan w-[82%] shadow-hologram-cyan rounded-full"></div>
                                </div>
                                <div className="text-[10px] font-mono uppercase tracking-widest text-brand-muted mt-2">
                                    Core Structural Assets Verified
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Cross-exchange market range module */}
                <section className="space-y-10 max-w-6xl mx-auto">
                    <div className="flex items-center space-x-4 border-b border-white/5 pb-4">
                        <div className="w-2 h-2 rounded-full bg-brand-cyan shadow-hologram-cyan animate-pulse"></div>
                        <h3 className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-white/80">
                            Cross-Exchange Spectrum
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ExchangeCard index="NSE" name="Nifty 50" current={22500} low={18800} high={22750} />
                        <ExchangeCard index="BSE" name="Sensex" current={74200} low={62000} high={75000} />
                        <ExchangeCard index="SME" name="SME Emerge" current={8100} low={4500} high={8500} />
                    </div>
                </section>
            </main>
        </div>
    );
}

/* -------------------------------------------------------------
   Exchange Card Sub-component
   ------------------------------------------------------------- */
function ExchangeCard({ index, name, current, low, high }: { index: string; name: string; current: number; low: number; high: number }) {
    const range = high - low;
    const position = Math.max(0, Math.min(100, ((current - low) / range) * 100));

    return (
        <div className="bg-white border border-gray-100 shadow-premium-card rounded-[22px] p-6 flex flex-col space-y-6 text-black">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted">{index}</div>
                    <div className="font-semibold tracking-tight text-lg mt-1">{name}</div>
                </div>
                <div className="text-xs font-mono font-bold text-black bg-[#fafafa] border border-gray-100 px-2 py-1 rounded">
                    {current.toLocaleString("en-IN")}
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#888888]">
                    52-Week Range Context
                </div>
                {/* Continuous Linear Track */}
                <div className="relative h-1.5 w-full bg-gray-100 rounded-full">
                    {/* Active indicator */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-brand-cyan rounded-full shadow-hologram-cyan z-10"
                        style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
                    ></div>
                    {/* Trailing baseline */}
                    <div className="absolute top-0 left-0 bottom-0 bg-[#e5e5e5] rounded-full" style={{ width: `${position}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#888888]">
                    <span>{low.toLocaleString("en-IN")}</span>
                    <span>{high.toLocaleString("en-IN")}</span>
                </div>
            </div>
        </div>
    );
}
