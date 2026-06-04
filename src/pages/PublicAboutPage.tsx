import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";

export const PublicAboutPage: React.FC = () => {
  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <main className="relative min-h-screen bg-[#020304] overflow-x-hidden text-white flex flex-col font-sans select-none pb-12">
      <TopNav />
      <MobileNav />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-16 md:pt-40 md:pb-24 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-[9px] tracking-[0.25em] font-mono text-cyan-400 font-semibold uppercase">
            OUR PHILOSOPHY
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-6 leading-[1.05]">
          Why StockStory Exists
        </h1>

        <p className="text-base md:text-lg text-gray-400 max-w-2xl mb-12 leading-relaxed tracking-wide">
          To raise the standard of company understanding by translating complex financial records into noise-free, readable metrics.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <button
            onClick={() => setPage("signup")}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-cyan-400 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150 text-sm uppercase tracking-wider cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            Get Started
          </button>
          <button
            onClick={() => setPage("login")}
            className="px-8 py-4 border border-white/10 text-white font-semibold rounded-full hover:bg-white/5 transition-all duration-150 text-sm uppercase tracking-wider bg-transparent cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Section 1: Mission & Vision */}
      <section className="relative z-10 py-16 border-t border-white/5 bg-[#07090d]/10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono text-cyan-400 font-semibold uppercase block mb-3">
              MISSION
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-4">
              Democratizing institutional-grade clarity
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-gray-400">
              Our mission is to empower individual investors by providing them with the same level of analytical clarity that institutional funds enjoy, stripped of sales pitch bias or promotional hype.
            </p>
          </div>
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono text-cyan-400 font-semibold uppercase block mb-3">
              VISION
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-4">
              Conviction over trends
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-gray-400">
              We envision a future where retail investing decisions are guided by long-term financial health and ownership structures rather than temporary market hype, internet chatrooms, and social media trends.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Methodology & Research Process */}
      <section className="relative z-10 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[9px] tracking-[0.2em] font-mono text-cyan-400 font-semibold uppercase block mb-3">
              OUR PROCESS
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              The Analytical Methodology
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "1. Data Acquisition",
                desc: "We monitor official exchange announcements to capture primary shareholding patterns, quarterly reports, and corporate updates instantly."
              },
              {
                title: "2. Noise Filtering",
                desc: "We ignore clickbait news, market rumors, and minor price fluctuations to isolate structural fundamental modifications."
              },
              {
                title: "3. Digest Drafting",
                desc: "Our analyst guidelines ensure all observations are compiled into highly specific, quantitative company booklets without buying or selling advice."
              }
            ].map((p, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3 font-mono">{p.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: How Scores & Analysis Work */}
      <section className="relative z-10 py-16 border-t border-white/5 bg-[#07090d]/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-[9px] tracking-[0.2em] font-mono text-cyan-400 font-semibold uppercase block mb-3">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Understanding StockStory Scores
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                title: "Business Quality Score",
                desc: "Calculated based on historical margins stability, return on capital employed (ROCE), and asset efficiency. High scores indicate robust business models with durable competitive moats."
              },
              {
                title: "Financial Health Score",
                desc: "Audits the leverage ratios, debt-to-equity compliance, and interest coverage. Higher scores reflect a strong balance sheet capable of withstanding macroeconomic downturns."
              },
              {
                title: "Ownership & Flow Analysis",
                desc: "Tracks the concentration of stakes. We monitor promoter pledging, DII accumulation, and FII exits. Changes here often flag early institutional shifts before they reflect in public sentiment."
              }
            ].map((s, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                <h3 className="text-sm font-semibold text-cyan-400 mb-2 font-mono">{s.title}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative z-10 py-12 border-t border-white/5 bg-[#020304] text-gray-600 text-xs mt-12">
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

export default PublicAboutPage;
