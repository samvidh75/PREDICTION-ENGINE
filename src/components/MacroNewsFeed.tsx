import React from "react";
import { Bell, Rss } from "lucide-react";

export type MacroUpdate = {
  id: string;
  time: string;
  source: string;
  title: string;
  description: string;
};

export const MacroNewsFeed: React.FC = () => {
  // Banned company updates/earnings. strictly macro-level exchange and economic notices.
  const macroUpdates: MacroUpdate[] = [
    {
      id: "MC_01",
      time: "09:30",
      source: "RBI BULLETIN",
      title: "Monetary Policy Review Schedule Formulated",
      description: "The Reserve Bank of India has announced the formal timeline parameters for the upcoming interest rate alignment sessions."
    },
    {
      id: "MC_02",
      time: "10:15",
      source: "SEBI SYSTEM",
      title: "FPI Registration Onboarding Interface Upgraded",
      description: "SEBI simplifies digital onboarding rules, which may reduce friction for institutional international capital flows."
    },
    {
      id: "MC_03",
      time: "11:45",
      source: "NSE NOTICE",
      title: "Index Rebalancing Metrics Calculated",
      description: "NSE index calculators complete standard algorithmic weight modifications across structural segment indices."
    },
    {
      id: "MC_04",
      time: "13:10",
      source: "MINISTRY FIN",
      title: "Infrastructure Outlay Disbursals Authorized",
      description: "Central ministries authorize funding for regional high-speed connectivity projects."
    }
  ];

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-none p-6 flex flex-col space-y-5 select-none">
      
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center space-x-2">
          <Rss className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#0A0A0A]">
            Macro System Notices
          </span>
        </div>
        <Bell className="w-4 h-4 text-neutral-400" />
      </div>

      {/* Announcements Timeline List */}
      <div className="space-y-4">
        {macroUpdates.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col space-y-1.5 p-3.5 border border-[#E5E5E5] bg-[#FAFAFA] hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.01)] transition-all duration-200"
          >
            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-neutral-400">SYS.TIME // {item.time}</span>
              <span className="font-semibold text-neutral-500 uppercase tracking-widest">
                {item.source}
              </span>
            </div>
            
            <h4 className="text-[13px] font-semibold text-[#0A0A0A] leading-tight">
              {item.title}
            </h4>
            
            <p className="text-[11px] leading-relaxed text-[#525252]">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="pt-2 text-[10px] font-mono text-neutral-400 text-center tracking-widest uppercase">
        MACRO FEED ONLY // NO INDIVIDUAL TICKERS
      </div>
    </div>
  );
};

export default MacroNewsFeed;
