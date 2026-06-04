// src/components/portfolio/MarketCalendar.tsx
import React from "react";

interface CalendarEvent {
  id: string;
  date: string;
  ticker: string;
  type: "Earnings" | "Dividend" | "Split" | "Results";
  details: string;
}

const EVENTS: CalendarEvent[] = [
  { id: "c1", date: "June 12", ticker: "RELIANCE", type: "Earnings", details: "Q1 corporate operational metrics disclosure" },
  { id: "c2", date: "June 18", ticker: "INFY", type: "Dividend", details: "Interim dividend payouts resolution check" },
  { id: "c3", date: "June 25", ticker: "HAL", type: "Results", details: "Yearly audited structural revenue margins release" },
  { id: "c4", date: "July 02", ticker: "BEL", type: "Split", details: "Equity split execution safety window" },
];

export const MarketCalendar: React.FC = () => {
  return (
    <div className="vos-card p-6 flex flex-col space-y-6 font-vos-interface text-white">
      <div>
        <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
          Market Intelligence Calendar // Corporate Actions
        </span>
        <h4 className="vos-sec-title font-bold text-white font-vos-display">Corporate Calendar</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EVENTS.map((ev) => (
          <div
            key={ev.id}
            className="bg-white/5 border border-white/5 p-4 rounded-[14px] flex flex-col space-y-2 hover:bg-white/10 transition-all"
          >
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-cyan-400 font-vos-display">{ev.ticker}</span>
              <span className="text-gray-400">{ev.date}</span>
            </div>
            <h5 className="text-xs font-bold text-white uppercase">{ev.type}</h5>
            <p className="text-[11px] text-gray-400 font-vos-reading">{ev.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketCalendar;
