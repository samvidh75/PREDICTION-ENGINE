import React from "react";
import { BookOpen, User, Sparkles, TrendingUp, Newspaper } from "lucide-react";

export const StoryDocumentary: React.FC = () => {
  const corporateNews = [
    { date: "May 2026", type: "PRODUCT", text: "Infosys expands enterprise-grade secure cloud systems for global clients." },
    { date: "April 2026", type: "PARTNERSHIP", text: "Global capital alliances expand cloud infrastructure capacity across Europe." },
    { date: "March 2026", type: "FINANCIAL", text: "Quarterly margin alignments exceed estimates, confirming high business quality." }
  ];

  return (
    <div className="flex flex-col space-y-8 select-none">
      
      {/* 1. Original Corporate Mission Statement */}
      <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] p-8 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[11px] font-mono font-medium tracking-wider text-[#9AA7B5] uppercase">
            Corporate Blueprint // Mission Statement
          </span>
        </div>
        <blockquote className="text-xl font-medium tracking-tight text-[#E6EDF3] leading-relaxed pl-4 border-l-2 border-[#06B6D4]">
          "To build reliable digital systems that help clients work with clearer data and disciplined execution."
        </blockquote>
      </div>

      {/* 2. Rich Corporate Timeline & History */}
      <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] p-8 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-6">
        <div className="flex items-center space-x-2 border-b border-[rgba(148,163,184,0.16)] pb-3">
          <BookOpen className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Founding Chronicles & Market Evolution
          </span>
        </div>

        <div className="space-y-6 text-[13px] leading-relaxed text-[#9AA7B5]">
          <div>
            <h4 className="text-[14px] font-semibold text-[#E6EDF3] mb-1">Origin & Initial Capitalization // 1981</h4>
            <p>
              Infosys was founded by seven visionary engineers in Pune, India, with an initial capital investment of ₹10,000. 
              The founders focused strictly on global software delivery processes, establishing pioneering benchmarks for corporate governance and asset accountability.
            </p>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-[#E6EDF3] mb-1">Global Scale & NASDAQ Listing // 1999</h4>
            <p>
              By institutionalizing rigorous software quality standards, the company expanded its global footprint, becoming the first Indian-registered corporate entity to list its securities on NASDAQ, proving high business resilience.
            </p>
          </div>

          <div>
            <h4 className="text-[14px] font-semibold text-[#E6EDF3] mb-1">22nd-Century Strategic Autonomy // 2026</h4>
            <p>
              Today, the enterprise operates at global scale in cloud, consulting, and digital transformation services for large corporate clients.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Executive CEO & Founder Profile */}
      <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] p-8 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-5">
        <div className="flex items-center space-x-2 border-b border-[rgba(148,163,184,0.16)] pb-3">
          <User className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Executive Leadership & Board Composition
          </span>
        </div>

        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-[#111827] border border-[rgba(148,163,184,0.16)] rounded-none flex items-center justify-center font-mono font-bold text-[#9AA7B5]">
            CEO
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-[14px] font-bold text-[#E6EDF3] leading-tight">Salil Parekh</h4>
            <span className="text-[10px] font-mono text-[#9AA7B5] uppercase tracking-widest block">
              Chief Executive Officer // Managing Director
            </span>
            <p className="text-[12px] leading-relaxed text-[#9AA7B5] mt-2">
              Salil Parekh leads the strategic vision across cloud services, digital transformation, and global software delivery with over three decades of international experience.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Filtered Asset-Specific Corporate News */}
      <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] p-8 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-5">
        <div className="flex items-center space-x-2 border-b border-[rgba(148,163,184,0.16)] pb-3">
          <Newspaper className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Filtered Company Activity Timeline
          </span>
        </div>

        <div className="space-y-4">
          {corporateNews.map((news, i) => (
            <div key={i} className="flex flex-col space-y-1 p-3 bg-[#0D1117] border border-[rgba(148,163,184,0.16)]">
              <div className="flex items-center justify-between font-mono text-[9px]">
                <span className="text-[#9AA7B5]">{news.date}</span>
                <span className="font-bold text-[#06B6D4]">{news.type}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#9AA7B5] mt-1">
                {news.text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StoryDocumentary;
