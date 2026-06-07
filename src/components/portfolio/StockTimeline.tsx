// src/components/portfolio/StockTimeline.tsx
import React from "react";

interface TimelineEvent {
  id: string;
  time: string;
  type: "Price Event" | "News Event" | "Health Change" | "Trend Change" | "Telemetry Change";
  title: string;
  description: string;
}

const EVENTS: TimelineEvent[] = [
  { id: "e1", time: "10:30 AM", type: "Price Event", title: "Large Movement Proximity", description: "RELIANCE expanded beyond the 52-week support base, validating steady volume demand." },
  { id: "e2", time: "Yesterday", type: "Health Change", title: "Health Improved to Very Healthy", description: "HAL was recalibrated as Very Healthy following sustained positive operating margins." },
  { id: "e3", time: "May 28", type: "News Event", title: "Important News Detected", description: "BEL cleared significant regional modernization targets, securing project pipelines." },
  { id: "e4", time: "May 25", type: "Trend Change", title: "Trend Weakened to Sideways", description: "INFY adjusted into near-term consolidation zones, forming local accumulation floors." },
];

export const StockTimeline: React.FC = () => {
  return (
    <div className="vos-card p-6 flex flex-col space-y-6 font-vos-interface text-white">
      <div>
        <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
          Personal Intelligence Timeline // Chronological Events
        </span>
        <h4 className="vos-sec-title font-bold text-white font-vos-display">Timeline Events</h4>
      </div>

      <div className="relative border-l border-white/10 pl-6 space-y-6">
        {EVENTS.map((ev) => (
          <div key={ev.id} className="relative">
            {/* Timeline node marker */}
            <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border border-cyan-400 bg-[#020304] z-10" />
            
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{ev.type}</span>
                <span className="text-[10px] text-gray-500">{ev.time}</span>
              </div>
              <h5 className="text-sm font-bold text-white font-vos-display">{ev.title}</h5>
              <p className="text-xs text-gray-400 font-vos-reading leading-relaxed">{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockTimeline;
