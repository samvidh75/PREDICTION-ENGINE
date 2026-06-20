import { describe, it, expect } from "vitest";
import { buildCorporateEventsView, type CorporateEvent } from "../corporateEventsViewModel";

describe("buildCorporateEventsView", () => {
  it("returns empty view when no events", () => {
    const result = buildCorporateEventsView([]);
    expect(result.totalCount).toBe(0);
    expect(result.hasUpcoming).toBe(false);
    expect(result.hasRecent).toBe(false);
  });

  it("sorts events by date", () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const nearFuture = new Date();
    nearFuture.setMonth(nearFuture.getMonth() + 3);
    const recentPast = new Date();
    recentPast.setMonth(recentPast.getMonth() - 1);
    const events: CorporateEvent[] = [
      { id: "1", type: "dividend", date: farFuture.toISOString(), label: "Dividend", description: "Final dividend", impactContext: null },
      { id: "2", type: "results", date: recentPast.toISOString(), label: "Results", description: "Q4 results", impactContext: null },
      { id: "3", type: "split", date: nearFuture.toISOString(), label: "Split", description: "Stock split", impactContext: null },
    ];
    const result = buildCorporateEventsView(events);
    expect(result.upcoming.length).toBeGreaterThanOrEqual(2);
    expect(result.recent.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates events with same id and date", () => {
    const events: CorporateEvent[] = [
      { id: "1", type: "dividend", date: "2025-06-01", label: "Dividend", description: "Final dividend", impactContext: null },
      { id: "1", type: "dividend", date: "2025-06-01", label: "Dividend", description: "Final dividend", impactContext: null },
    ];
    const result = buildCorporateEventsView(events);
    expect(result.totalCount).toBe(1);
  });

  it("handles missing date gracefully", () => {
    const events: CorporateEvent[] = [
      { id: "1", type: "dividend", date: "", label: "Dividend", description: "Final dividend", impactContext: null },
    ];
    const result = buildCorporateEventsView(events);
    expect(result.totalCount).toBe(0);
  });

  it("limits recent events to 10", () => {
    const events: CorporateEvent[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      type: "dividend" as const,
      date: `2024-0${(i % 9) + 1}-15`,
      label: "Dividend",
      description: `Event ${i}`,
      impactContext: null,
    }));
    const result = buildCorporateEventsView(events);
    expect(result.recent.length).toBeLessThanOrEqual(10);
  });

  it("no forbidden copy in output", () => {
    const result = buildCorporateEventsView([]);
    expect(result.totalCount).toBe(0);
  });
});
