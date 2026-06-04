import React, { useState } from "react";
import { TrendingUp, Sparkles, Trophy, Flame, PlusCircle, Search, ArrowRight } from "lucide-react";

interface DiscoverCompany {
  symbol: string;
  name: string;
  score: number;
  price: string;
  change: string;
  isPositive: boolean;
  oneLiner: string;
}

interface DiscoverCategory {
  title: string;
  icon: React.ReactNode;
  companies: DiscoverCompany[];
}

const CATEGORIES: DiscoverCategory[] = [
  {
    title: "Trending Companies",
    icon: <Flame className="w-5 h-5 text-amber-400 animate-pulse" />,
    companies: [
      { symbol: "TATAMOTORS", name: "Tata Motors Ltd.", score: 81, price: "₹924.50", change: "+3.2%", isPositive: true, oneLiner: "JLR profitability driving strong margins expansions." },
      { symbol: "SUZLON", name: "Suzlon Energy Ltd.", score: 64, price: "₹45.10", change: "+4.9%", isPositive: true, oneLiner: "Wind capacity orders hit record highs this quarter." },
      { symbol: "HAL", name: "Hindustan Aeronautics", score: 84, price: "₹4,120.00", change: "+1.8%", isPositive: true, oneLiner: "Defense acquisition council signs off on new orders." },
      { symbol: "ADANIENT", name: "Adani Enterprises", score: 71, price: "₹3,150.20", change: "-1.5%", isPositive: false, oneLiner: "FII holding consolidates after run-up." }
    ]
  },
  {
    title: "Popular Searches",
    icon: <Search className="w-5 h-5 text-cyan-400" />,
    companies: [
      { symbol: "RELIANCE", name: "Reliance Industries", score: 86, price: "₹2,845.00", change: "+1.9%", isPositive: true, oneLiner: "Retail margins expansion driving conglomerate multiples." },
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", score: 82, price: "₹1,510.20", change: "-0.5%", isPositive: false, oneLiner: "Interest coverage stable at historic levels." },
      { symbol: "INFY", name: "Infosys Ltd.", score: 88, price: "₹1,420.50", change: "-2.4%", isPositive: false, oneLiner: "BFSI software deals pipeline showing moderate slowdown." },
      { symbol: "ITC", name: "ITC Ltd.", score: 85, price: "₹428.40", change: "+0.8%", isPositive: true, oneLiner: "FMCG margins stable despite raw material index swings." }
    ]
  },
  {
    title: "High Quality Businesses",
    icon: <Trophy className="w-5 h-5 text-yellow-400" />,
    companies: [
      { symbol: "TCS", name: "Tata Consultancy", score: 93, price: "₹3,850.00", change: "+0.8%", isPositive: true, oneLiner: "Industry-leading return on capital and cash conversion." },
      { symbol: "LT", name: "Larsen & Toubro Ltd.", score: 87, price: "₹3,540.00", change: "+1.2%", isPositive: true, oneLiner: "Pristine capital deployment in infrastructure segment." },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", score: 90, price: "₹2,350.10", change: "+0.3%", isPositive: true, oneLiner: "Unaligned consumer moat with 98% cash flows conversion." },
      { symbol: "COALINDIA", name: "Coal India Ltd.", score: 78, price: "₹450.40", change: "+2.1%", isPositive: true, oneLiner: "Strong dividend yield supported by direct mining flow." }
    ]
  },
  {
    title: "Momentum Leaders",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    companies: [
      { symbol: "BHEL", name: "Bharat Heavy Elec.", score: 68, price: "₹278.40", change: "+5.1%", isPositive: true, oneLiner: "Power equipment grid orders spark massive volumes." },
      { symbol: "PFC", name: "Power Finance Corp", score: 80, price: "₹465.10", change: "+3.8%", isPositive: true, oneLiner: "Loan book expansion tracks national power grids updates." },
      { symbol: "RECLTD", name: "REC Ltd.", score: 82, price: "₹512.40", change: "+4.2%", isPositive: true, oneLiner: "Clean energy financing velocity driving margins." },
      { symbol: "RVNL", name: "Rail Vikas Nigam", score: 72, price: "₹385.00", change: "+4.9%", isPositive: true, oneLiner: "Railway infrastructure contracts delivery timeline." }
    ]
  },
  {
    title: "Sector Leaders",
    icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
    companies: [
      { symbol: "NTPC", name: "NTPC Ltd.", score: 81, price: "₹355.20", change: "+1.4%", isPositive: true, oneLiner: "Leads national power generation capacity upgrades." },
      { symbol: "MARUTI", name: "Maruti Suzuki India", score: 80, price: "₹12,420.00", change: "+1.5%", isPositive: true, oneLiner: "Dominates passenger vehicles market with premium mix." },
      { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", score: 85, price: "₹1,540.00", change: "-0.2%", isPositive: false, oneLiner: "Specialty pharmaceutical portfolio records double-digit gains." },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", score: 89, price: "₹1,110.40", change: "+1.1%", isPositive: true, oneLiner: "Core retail deposit growth outperforms peer group averages." }
    ]
  },
  {
    title: "Recently Added",
    icon: <PlusCircle className="w-5 h-5 text-sky-400" />,
    companies: [
      { symbol: "JIOFIN", name: "Jio Financial Services", score: 75, price: "₹354.20", change: "+2.1%", isPositive: true, oneLiner: "Digital payment and retail lending solutions rollout." },
      { symbol: "IREDA", name: "IREDA Ltd.", score: 77, price: "₹185.40", change: "+4.8%", isPositive: true, oneLiner: "State-backed clean energy funding infrastructure." },
      { symbol: "TATASTEEL", name: "Tata Steel Ltd.", score: 74, price: "₹174.20", change: "+4.8%", isPositive: true, oneLiner: "Global supply contracts update drives steel capacity." },
      { symbol: "ZOMATO", name: "Zomato Ltd.", score: 70, price: "₹192.10", change: "-1.1%", isPositive: false, oneLiner: "Quick commerce delivery network achieves EBITDA breakeven." }
    ]
  }
];

export const DiscoveryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleCompanyClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const filteredCategories = CATEGORIES.map(category => {
    const filtered = category.companies.filter(c => 
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...category, companies: filtered };
  }).filter(category => category.companies.length > 0);

  return (
    <div className="w-full flex flex-col space-y-10 select-none pb-16 bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      {/* Header & Simple Search Bar */}
      <div className="border-b border-white/5 pb-6 space-y-6">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
            DISCOVER
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Netflix for Research
          </h1>
          <p className="mt-2 text-xs md:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Discover investment ideas effortlessly. Scroll horizontally through factor-filtered companies.
          </p>
        </div>

        {/* Local Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search symbol or company name in discovery..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/[0.02] border border-white/5 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/30 transition-all font-mono"
          />
        </div>
      </div>

      {/* Horizontal Netflix Rails */}
      <div className="space-y-10">
        {filteredCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              {category.icon}
              <h2 className="text-lg font-bold text-white tracking-tight">{category.title}</h2>
            </div>

            {/* Horizontal Scroll Rail */}
            <div className="relative w-full">
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent snap-x">
                {category.companies.map((c) => (
                  <div
                    key={c.symbol}
                    onClick={() => handleCompanyClick(c.symbol)}
                    className="flex-shrink-0 w-[280px] bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-cyan-500/20 rounded-2xl p-5 cursor-pointer transition-all snap-start flex flex-col justify-between h-[180px] group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block">
                            {c.symbol}
                          </span>
                          <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors leading-tight line-clamp-1">
                            {c.name}
                          </h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[9px] font-mono text-gray-500 uppercase block font-semibold">Score</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">{c.score}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 leading-normal line-clamp-3">
                        {c.oneLiner}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2 text-[10px] font-mono">
                      <span className="text-white/80">{c.price}</span>
                      <span className={c.isPositive ? "text-emerald-400" : "text-rose-400"}>
                        {c.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryPage;
