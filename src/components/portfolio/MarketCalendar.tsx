// src/components/portfolio/MarketCalendar.tsx
import React, { useEffect, useState } from "react";

type CalendarStatus = "loading" | "available" | "empty" | "error";

interface CalendarEvent {
  id: string;
  date: string | null;
  ticker: string | null;
  type: "Filing" | "Results" | "Dividend" | "Corporate Event" | "Split" | "Other";
  details: string | null;
  source: string | null;
  asOf: string | null;
}

interface CalendarEnvelope {
  status?: string;
  dataState?: {
    status?: string;
    asOf?: string | null;
    lineage?: Array<{ sourceTable?: string | null; provider?: string | null; asOf?: string | null }>;
    missingInputs?: string[];
  };
  data?: {
    events?: CalendarEvent[];
  };
  events?: CalendarEvent[];
}

const DATA_UNAVAILABLE = "Data unavailable";

function normalizeEvent(raw: Partial<CalendarEvent>, index: number): CalendarEvent {
  return {
    id: raw.id || `event-${index}`,
    date: raw.date || null,
    ticker: raw.ticker || null,
    type: raw.type || "Other",
    details: raw.details || null,
    source: raw.source || null,
    asOf: raw.asOf || null,
  };
}

export const MarketCalendar: React.FC = () => {
  const [status, setStatus] = useState<CalendarStatus>("loading");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/intelligence/calendar")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CalendarEnvelope>;
      })
      .then((body) => {
        if (cancelled) return;
        const rawEvents = body.data?.events ?? body.events ?? [];
        const normalized = rawEvents.map(normalizeEvent);
        const lineage = body.dataState?.lineage ?? [];
        setEvents(normalized);
        setAsOf(body.dataState?.asOf ?? normalized.find((event) => event.asOf)?.asOf ?? null);
        setSourceLabel(lineage.map((entry) => entry.sourceTable || entry.provider).filter(Boolean).join(", ") || null);
        setStatus(normalized.length > 0 ? "available" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="vos-card p-6 flex flex-col space-y-6 font-vos-interface text-white">
      <div>
        <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
          Market Intelligence Calendar // Sourced Corporate Events
        </span>
        <h4 className="vos-sec-title font-bold text-white font-vos-display">Corporate Calendar</h4>
        <p className="mt-2 text-[11px] text-gray-400">
          As of: {asOf || DATA_UNAVAILABLE} · Source: {sourceLabel || DATA_UNAVAILABLE}
        </p>
      </div>

      {status === "loading" && (
        <div className="border border-white/5 bg-white/5 p-4 text-[11px] text-gray-400">
          Loading sourced corporate events...
        </div>
      )}

      {status === "error" && (
        <div className="border border-red-500/20 bg-red-500/10 p-4 text-[11px] text-red-200">
          Corporate events are unavailable because the source request failed.
        </div>
      )}

      {status === "empty" && (
        <div className="border border-white/5 bg-white/5 p-4 text-[11px] text-gray-400">
          No sourced filings, results, dividends, or corporate events are available.
        </div>
      )}

      {status === "available" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-white/5 border border-white/5 p-4 rounded-[8px] flex flex-col space-y-2 hover:bg-white/10 transition-all"
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-cyan-400 font-vos-display">{ev.ticker || DATA_UNAVAILABLE}</span>
                <span className="text-gray-400">{ev.date || DATA_UNAVAILABLE}</span>
              </div>
              <h5 className="text-xs font-bold text-white uppercase">{ev.type}</h5>
              <p className="text-[11px] text-gray-400 font-vos-reading">{ev.details || DATA_UNAVAILABLE}</p>
              <p className="text-[10px] text-gray-500">Evidence: {ev.source || DATA_UNAVAILABLE}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketCalendar;
