export type CorporateEventType =
  | "dividend"
  | "split"
  | "bonus"
  | "rights"
  | "board_meeting"
  | "results"
  | "announcement"
  | "listing";

export interface CorporateEvent {
  id: string;
  type: CorporateEventType;
  date: string;
  label: string;
  description: string;
  impactContext: string | null;
}

export interface CorporateEventsView {
  upcoming: CorporateEvent[];
  recent: CorporateEvent[];
  totalCount: number;
  hasUpcoming: boolean;
  hasRecent: boolean;
}

const EVENT_TYPE_LABELS: Record<CorporateEventType, string> = {
  dividend: "Dividend",
  split: "Split",
  bonus: "Bonus",
  rights: "Rights",
  board_meeting: "Board Meeting",
  results: "Results",
  announcement: "Announcement",
  listing: "Listing",
};

export function getEventTypeLabel(type: CorporateEventType): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

export function getEventTypeColor(type: CorporateEventType): string {
  switch (type) {
    case "dividend": return "#16A34A";
    case "split": return "#8B5CF6";
    case "bonus": return "#3B82F6";
    case "rights": return "#F59E0B";
    case "board_meeting": return "#64748B";
    case "results": return "#2962FF";
    case "announcement": return "#14B8A6";
    case "listing": return "#EC4899";
  }
}

export function buildCorporateEventsView(events: CorporateEvent[]): CorporateEventsView {
  const now = new Date();

  const deduped = events.filter(
    (event, index, self) =>
      index === self.findIndex((e) => e.id === event.id && e.date === event.date)
  );

  const upcoming: CorporateEvent[] = [];
  const recent: CorporateEvent[] = [];

  for (const event of deduped) {
    if (!event.date) continue;
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;
    if (eventDate >= now) {
      upcoming.push(event);
    } else {
      recent.push(event);
    }
  }

  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    upcoming,
    recent: recent.slice(0, 10),
    totalCount: upcoming.length + recent.length,
    hasUpcoming: upcoming.length > 0,
    hasRecent: recent.length > 0,
  };
}
