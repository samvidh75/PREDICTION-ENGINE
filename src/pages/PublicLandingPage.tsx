import React, { useState } from 'react';
import TopNav from '../components/navigation/TopNav';
import MobileNav from '../components/navigation/MobileNav';

export const PublicLandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <main className="ss-tv-app relative min-h-screen bg-[#0f0f0f] overflow-x-hidden text-[#f0f3fa] flex flex-col font-sans select-none pb-12">
      <TopNav />
      <MobileNav />

      {/* Hero Section */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.04)_0%,rgba(255,255,255,0.015)_48%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 md:pt-40 md:pb-28 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]" />
          <span className="text-[9px] tracking-[0.25em] font-mono text-[#7da0ff] font-semibold uppercase">
            STRICTLY NOISE-FREE
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-8 leading-[1.05]">
          Clear company intelligence <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7da0ff] via-[#2962ff] to-[#8f5cff]">
            for Indian investors.
          </span>
        </h1>

        <p className="text-base md:text-lg text-gray-400 max-w-2xl mb-12 leading-relaxed tracking-wide">
          StockStory parses complex financial statements and shareholding patterns into clear, short diagnostics.
          Understand what changed, why it matters, and what deserves attention today.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <button
            onClick={() => setPage("login")}
            className="px-8 py-4 bg-[#2962ff] text-white font-semibold rounded-full hover:bg-[#1e53e5] transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 text-sm uppercase tracking-wider cursor-pointer shadow-lg shadow-[#2962ff]/10"
          >
            Start Research
          </button>
          <button
            onClick={() => setPage("signup")}
            className="px-8 py-4 border border-white/10 text-white font-semibold rounded-full hover:bg-white/5 transition-all duration-150 text-sm uppercase tracking-wider bg-transparent cursor-pointer"
          >
            Create Account
          </button>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 border-t border-white/5 pt-8 w-full max-w-4xl">
          {[
            { label: "MARKET COVERAGE", value: "500+ INDIAN COMPANIES" },
            { label: "ANALYSIS METHOD", value: "QUALITY, VALUE, OWNERSHIP" },
            { label: "CONTENT STANDARD", value: "NO BUY OR SELL CALLS" },
            { label: "RESEARCH FOCUS", value: "COMPANY UNDERSTANDING" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-[9px] tracking-widest text-gray-500 uppercase font-mono mb-1">
                {item.label}
              </span>
              <span className="text-xs font-semibold text-gray-300 font-mono tracking-wider">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* The Problem Section */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-[#07090d]/10">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[9px] tracking-widest text-red-400 uppercase font-mono font-bold block mb-3 text-center">
            THE PROBLEM
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6 text-center">
            Modern investing is flooded with noise.
          </h2>
          <p className="text-sm md:text-base text-gray-400 text-center leading-relaxed max-w-2xl mx-auto mb-12">
            Most stock platforms bombard you with hyperactive price charts, speculative buy/sell tips, and endless streams of recycled news articles. They profit from your trading volume, not your understanding.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Buy/Sell Call Fatigue",
                desc: "Conflicting research signals from dozens of analysts create execution paralysis."
              },
              {
                title: "AI Chatbot Fluff",
                desc: "Generic generative AI models output generic paragraphs that don't add actual insights."
              },
              {
                title: "Data Overload",
                desc: "Endless scrolling through primary filings without context on what actually changed."
              }
            ].map((p, idx) => (
              <div key={idx} className="bg-red-950/10 border border-red-900/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-red-200 mb-2 font-mono">{p.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="relative z-10 py-20 border-t border-[#2a2e39] bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-6">
          <span className="text-[9px] tracking-widest text-[#7da0ff] uppercase font-mono font-bold block mb-3 text-center">
            THE SOLUTION
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6 text-center">
            A premium interface designed for clarity.
          </h2>
          <p className="text-sm md:text-base text-gray-400 text-center leading-relaxed max-w-2xl mx-auto mb-12">
            StockStory focuses entirely on deep, structural fundamentals. We strip away price volatility and give you the raw context of shareholding shifts, margins adjustments, and underlying business health.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "No Stock Calls",
                desc: "No price targets. No calls. We provide unbiased diagnostics so you remain the decision maker."
              },
              {
                title: "Concise Booklets",
                desc: "Every company's quarter, margin health, and risk profile summarized in short, clear sentences."
              },
              {
                title: "High-Contrast UI",
                desc: "A clean, dark interface optimized for reading dense data without eye strain."
              }
            ].map((s, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-[#7da0ff] mb-2 font-mono">{s.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-[#07090d]/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[9px] tracking-widest text-[#7da0ff] uppercase font-mono font-bold block mb-3">
              METHODOLOGY
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              How StockStory Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Primary Data Ingestion",
                desc: "We pull quarterly reports, annual balance sheets, and regulatory shareholding changes from primary Indian exchange portals."
              },
              {
                step: "02",
                title: "Factor Filtering",
                desc: "Our engine executes a checklist to filter out trivial noise and isolate critical shifts in Business Quality, Valuation, and Flows."
              },
              {
                step: "03",
                title: "Clear Presentation",
                desc: "We compile observations into high-contrast company reports, giving you instant clarity in less than 30 seconds."
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-[200px]">
                <span className="text-xl font-mono text-[#7da0ff] font-bold">{item.step}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Analysis Section */}
      <section className="relative z-10 py-20 border-t border-[#2a2e39] bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[9px] tracking-widest text-[#7da0ff] uppercase font-mono font-bold block mb-3">
              SAMPLE OUTPUT
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Standard Company Booklet
            </h2>
            <p className="text-xs text-gray-500 mt-2">
              This is how we present insights. Direct, clear, and quantitative.
            </p>
          </div>

          <div className="bg-[#0b0d11] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#7da0ff] block mb-1">NSE: RELIANCE // CONGLOMERATE</span>
                <h3 className="text-2xl font-bold text-white tracking-tight">Reliance Industries Ltd.</h3>
              </div>
              <span className="text-xs font-mono text-[#22ab94] bg-[#22ab94]/10 px-3 py-1 rounded-full border border-[#22ab94]/20">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Business Quality", value: "86%", desc: "Strong moat" },
                { label: "Financial Health", value: "92%", desc: "Excellent leverage" },
                { label: "Ownership Flow", value: "Neutral", desc: "Stable FII stakes" },
                { label: "Risk Assessment", value: "Low", desc: "No default indicators" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-center">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1 font-mono">{item.label}</span>
                  <span className="text-lg font-bold text-white font-mono block">{item.value}</span>
                  <span className="text-[10px] text-gray-400 mt-1 block">{item.desc}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2">
              <span className="text-[9px] font-mono text-[#7da0ff] uppercase tracking-wider block font-bold">Key Insight</span>
              <p className="text-xs text-gray-300 leading-relaxed">
                Operating margins expanded by 140 basis points in the latest quarter due to cost efficiency in digital services, compensating for minor volume declines in the oil-to-chemicals segment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-[#07090d]/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[9px] tracking-widest text-[#7da0ff] uppercase font-mono font-bold block mb-3">
              CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Built for high-end equity research
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Deep Business Quality",
                desc: "Understand margins stability, product moat, and historical return on capital metrics."
              },
              {
                title: "Ownership flow tracking",
                desc: "Monitor when domestic institutional investors (DII) and foreign funds (FII) buy or sell stakes."
              },
              {
                title: "Financial strength checks",
                desc: "Audit balance sheets for debt-to-equity compliance, interest cover, and capital structures."
              },
              {
                title: "Fast-Filter Discovery",
                desc: "Instantly slice the top 500 companies by growth momentum or valuation criteria."
              },
              {
                title: "Risk Indicators",
                desc: "Identify potential warning signals like promoter pledge increases or regulatory hurdles."
              },
              {
                title: "Clean Watchlists",
                desc: "Focus on stock developments that require attention, ignoring daily price ticks."
              }
            ].map((f, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                <h3 className="text-sm font-semibold text-white mb-2 font-mono">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals Section */}
      <section className="relative z-10 py-20 border-t border-[#2a2e39] bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[9px] tracking-widest text-[#22ab94] uppercase font-mono font-bold block mb-3">
            TRUST PRINCIPLES
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
            Zero Bias. No Affiliation.
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed mb-8">
            StockStory is 100% independent. We do not partner with brokerage firms, receive commissions on trades, or push speculative instruments. Our revenue comes entirely from direct premium memberships.
          </p>
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/5 text-xs text-gray-300 font-mono">
            <span>SEBI Compliant Research Layout</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22ab94]" />
            <span>500+ Indian Stocks</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-[#07090d]/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[9px] tracking-widest text-[#7da0ff] uppercase font-mono font-bold block mb-3">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Is StockStory a stock broker?",
                a: "No. StockStory is purely a research platform. You cannot trade shares directly on our interface. We exist solely to help you understand what you are buying."
              },
              {
                q: "Do you publish buy or sell calls?",
                a: "No. We never publish buy or sell alerts, price targets, or trading calls. We provide company health and research signals so investors can build their own conviction from the underlying evidence."
              },
              {
                q: "What data points do you analyze?",
                a: "We analyze quarterly filings, balance sheets, cash flow reports, shareholding patterns (promoter stakes, FII/DII allocations), and corporate governance updates."
              },
              {
                q: "Is this suitable for short-term day traders?",
                a: "No. StockStory is built for long-term investors, self-directed research builders, and fundamental analysts. We do not provide intraday price tracking or technical indicators."
              }
            ].map((item, idx) => (
              <div key={idx} className="border-b border-white/5 pb-4">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left flex justify-between items-center py-3 text-sm font-semibold text-white bg-transparent border-none cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className="text-[#7da0ff]">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 pl-1">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 py-20 border-t border-white/5 bg-gradient-to-b from-transparent to-[#07090d]/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
            Build your structural company intelligence today.
          </h2>
          <p className="text-xs text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Create an account to access deep qualitative dashboards on the top 500 Indian companies. No credit card required to start.
          </p>
          <button
            onClick={() => setPage("signup")}
            className="px-8 py-4 bg-[#2962ff] text-white font-semibold rounded-full hover:bg-[#1e53e5] transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 text-sm uppercase tracking-wider cursor-pointer shadow-lg shadow-[#2962ff]/10"
          >
            Create Your Account
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative z-10 py-12 border-t border-[#2a2e39] bg-[#0f0f0f] text-gray-600 text-xs">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="font-bold text-white font-mono tracking-widest uppercase">STOCKSTORY.INDIA</span>
            <p className="mt-1 text-[10px] text-gray-500">© 2026 StockStory. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-[10px] uppercase tracking-wider font-semibold">
            <button onClick={() => setPage("about")} className="hover:text-white transition bg-transparent border-none cursor-pointer text-gray-500">About</button>
            <button onClick={() => setPage("login")} className="hover:text-white transition bg-transparent border-none cursor-pointer text-gray-500">Login</button>
            <button onClick={() => setPage("signup")} className="hover:text-white transition bg-transparent border-none cursor-pointer text-gray-500">Signup</button>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default PublicLandingPage;
