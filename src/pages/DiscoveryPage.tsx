import React, { useState } from "react";
import { TrendingUp, Sparkles, Trophy, Flame, PlusCircle, Search, ArrowRight } from "lucide-react";

import { CompanyCard } from "../components/company/CompanyCard";
import { StockRegistry } from "../services/stocks/StockRegistry";

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
    title: "High Quality",
    icon: <Trophy className="w-5 h-5 text-yellow-400" />,
    companies: [
      { symbol: "TCS", name: "Tata Consultancy Services", score: 93, price: "₹3,850.00", change: "+0.8%", isPositive: true, oneLiner: "Industry-leading return on capital and cash conversion." },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", score: 90, price: "₹2,350.10", change: "+0.3%", isPositive: true, oneLiner: "Unaligned consumer moat with 98% cash flow conversion." },
      { symbol: "NESTLEIND", name: "Nestle India", score: 88, price: "₹2,510.40", change: "+0.5%", isPositive: true, oneLiner: "Dominant brand power with high return on equity." },
      { symbol: "INFY", name: "Infosys", score: 87, price: "₹1,420.50", change: "-2.4%", isPositive: false, oneLiner: "Consistent execution and cash generation capability." },
      { symbol: "RELIANCE", name: "Reliance Industries", score: 86, price: "₹2,845.00", change: "+1.9%", isPositive: true, oneLiner: "Massive scale and digital/retail engine dominance." }
    ]
  },
  {
    title: "High Growth",
    icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
    companies: [
      { symbol: "HAL", name: "Hindustan Aeronautics", score: 84, price: "₹4,120.00", change: "+1.8%", isPositive: true, oneLiner: "Defense acquisition pipeline accelerating sales." },
      { symbol: "BEL", name: "Bharat Electronics", score: 82, price: "₹210.30", change: "+3.5%", isPositive: true, oneLiner: "Order book growth driven by defense electronics push." },
      { symbol: "TRENT", name: "Trent", score: 85, price: "₹4,200.00", change: "+5.2%", isPositive: true, oneLiner: "Westside and Zudio expansion fueling supernormal growth." },
      { symbol: "DIXON", name: "Dixon Technologies", score: 81, price: "₹7,210.00", change: "+2.7%", isPositive: true, oneLiner: "Electronics manufacturing services scaling rapidly." }
    ]
  },
  {
    title: "Value Opportunities",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    companies: [
      { symbol: "COALINDIA", name: "Coal India", score: 78, price: "₹450.40", change: "+2.1%", isPositive: true, oneLiner: "Compelling dividend yield and low price-to-earnings." },
      { symbol: "ONGC", name: "Oil & Natural Gas Corp", score: 75, price: "₹260.10", change: "-0.4%", isPositive: false, oneLiner: "Robust cash flows trading at discount to book value." },
      { symbol: "BPCL", name: "Bharat Petroleum", score: 74, price: "₹612.30", change: "+1.2%", isPositive: true, oneLiner: "High dividend yield and refining margin recovery." },
      { symbol: "IOC", name: "Indian Oil Corp", score: 72, price: "₹168.40", change: "-0.8%", isPositive: false, oneLiner: "Under-valued oil marketing business with stable demand." }
    ]
  },
  {
    title: "Momentum",
    icon: <Flame className="w-5 h-5 text-amber-400 animate-pulse" />,
    companies: [
      { symbol: "SUZLON", name: "Suzlon Energy", score: 64, price: "₹45.10", change: "+4.9%", isPositive: true, oneLiner: "Wind capacity orders hit record highs this quarter." },
      { symbol: "RVNL", name: "Rail Vikas Nigam", score: 72, price: "₹385.00", change: "+4.9%", isPositive: true, oneLiner: "Railway infrastructure contracts delivery momentum." },
      { symbol: "RECLTD", name: "REC Ltd.", score: 82, price: "₹512.40", change: "+4.2%", isPositive: true, oneLiner: "Power financing expansion driving momentum breakout." },
      { symbol: "PFC", name: "Power Finance Corp", score: 80, price: "₹465.10", change: "+3.8%", isPositive: true, oneLiner: "Loan book expansion tracks power sector grid upgrades." }
    ]
  },
  {
    title: "Turnarounds",
    icon: <PlusCircle className="w-5 h-5 text-sky-400" />,
    companies: [
      { symbol: "TATAMOTORS", name: "Tata Motors", score: 81, price: "₹924.50", change: "+3.2%", isPositive: true, oneLiner: "JLR profitability driving strong margin expansion." },
      { symbol: "BHEL", name: "Bharat Heavy Elec.", score: 68, price: "₹278.40", change: "+5.1%", isPositive: true, oneLiner: "Power equipment grid orders sparking revenue turnaround." },
      { symbol: "YESBANK", name: "Yes Bank", score: 55, price: "₹24.50", change: "-0.2%", isPositive: false, oneLiner: "Asset quality stabilizing with gradual loan book cleanup." }
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
                {category.companies.map((c) => {
                  const info = StockRegistry.getStock(c.symbol);
                  return (
                    <div key={c.symbol} className="flex-shrink-0 w-[280px] snap-start">
                      <CompanyCard
                        ticker={c.symbol}
                        name={c.name}
                        sector={info?.sector || "Conglomerate"}
                        marketCap={info?.marketCap.formatted || "₹50,000 Cr"}
                        score={c.score}
                        whyItMatters={c.oneLiner}
                        onClick={() => handleCompanyClick(c.symbol)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryPage;
