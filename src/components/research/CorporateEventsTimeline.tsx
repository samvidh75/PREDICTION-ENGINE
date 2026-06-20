import React from "react";
import { Calendar, Clock } from "lucide-react";
import { buildCorporateEventsView, getEventTypeLabel, getEventTypeColor, type CorporateEvent } from "../../lib/product/corporateEventsViewModel";
import { ProductPanel } from "../product/ProductUI";

interface CorporateEventsTimelineProps {
  events?: CorporateEvent[];
  view?: ReturnType<typeof buildCorporateEventsView>;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function CorporateEventsTimeline({ events = [], view }: CorporateEventsTimelineProps) {
  const timeline = view ?? buildCorporateEventsView(events);

  if (timeline.totalCount === 0) {
    return (
      <ProductPanel className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Calendar className="h-4 w-4" /> Corporate Events
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          No recent corporate events recorded.
        </p>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
        <Calendar className="h-4 w-4" /> Corporate Events
      </div>

      {timeline.hasUpcoming && (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <Clock className="h-3.5 w-3.5" /> Upcoming
          </h3>
          <div className="mt-2 space-y-2">
            {timeline.upcoming.slice(0, 5).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {timeline.hasRecent && (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <Calendar className="h-3.5 w-3.5" /> Recent
          </h3>
          <div className="mt-2 space-y-2">
            {timeline.recent.slice(0, 8).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </ProductPanel>
  );
}

function EventRow({ event }: { event: CorporateEvent }) {
  const color = getEventTypeColor(event.type);
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)] px-3 py-2.5">
      <span
        className="mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {getEventTypeLabel(event.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-[var(--color-text-primary)]">
          {event.description || event.label}
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
          {formatDate(event.date)}
          {event.impactContext && ` · ${event.impactContext}`}
        </div>
      </div>
    </div>
  );
}
