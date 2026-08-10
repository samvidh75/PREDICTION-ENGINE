import { useCallback, useEffect, useRef, useState } from "react";
import { MarketHours, PSE_SCHEDULE } from "../services/market/MarketHours";

/**
 * Live PSE market session status for the browser.
 *
 * Hybrid source of truth:
 *  - The session ladder (auction / open / lunch / closing / post-market /
 *    weekend) is derived client-side from `MarketHours` in Asia/Manila for
 *    instant, offline-safe rendering.
 *  - Holiday status is fetched once per PHT day from `/api/market-status`
 *    (the holiday-aware server endpoint), so a PSE non-trading day never
 *    renders as "Market open". If the fetch fails, the client ladder is used
 *    as the fallback — the badge stays correct for trading days.
 */

export type MarketSession =
  | "pre-market"
  | "auction"
  | "open"
  | "lunch"
  | "closing"
  | "post-market"
  | "weekend"
  | "holiday";

export interface MarketStatusState {
  session: MarketSession;
  isOpen: boolean;
  phtTime: string;
  label: string;
  detail: string;
}

function sessionMeta(session: MarketSession): { isOpen: boolean; label: string; detail: string } {
  switch (session) {
    case "holiday":
      return { isOpen: false, label: "Market closed", detail: "PSE non-trading holiday" };
    case "open":
      return { isOpen: true, label: "Market open", detail: "Live trading 09:30 – 15:30 PHT" };
    case "auction":
      return { isOpen: false, label: "Pre-open auction", detail: "Pre-open auction" };
    case "lunch":
      return { isOpen: false, label: "Lunch break", detail: "Lunch break" };
    case "closing":
      return { isOpen: false, label: "Session closed", detail: "Trading ended at 15:30 PHT" };
    case "post-market":
      return { isOpen: false, label: "Market closed", detail: "Outside trading hours" };
    case "weekend":
      return { isOpen: false, label: "Weekend", detail: "PSE is closed on weekends" };
    default:
      return { isOpen: false, label: "Market closed", detail: "Outside trading hours" };
  }
}

/** Calendar date in Manila (PHT = UTC+8, no DST). */
function phtDateString(at: Date): string {
  return new Date(at.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatPhtTime(at: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(at);
}

/** Current minutes-since-midnight in Manila (PHT = UTC+8, no DST). */
function nowMinutesInPht(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function formatDuration(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Appends a live countdown to intraday session details (open / lunch / auction). */
function withCountdown(session: MarketSession, at: Date, detail: string): string {
  const nowMin = nowMinutesInPht(at);
  switch (session) {
    case "open":
      return `${detail} · closes in ${formatDuration(PSE_SCHEDULE.CLOSE - nowMin)}`;
    case "lunch":
      return `${detail} · reopens in ${formatDuration(PSE_SCHEDULE.LUNCH_END - nowMin)}`;
    case "auction":
      return `${detail} · opens in ${formatDuration(PSE_SCHEDULE.OPEN - nowMin)}`;
    default:
      return detail;
  }
}

function computeStatus(at: Date = new Date(), isHoliday = false): MarketStatusState {
  if (isHoliday) {
    const meta = sessionMeta("holiday");
    return { session: "holiday", phtTime: formatPhtTime(at), ...meta };
  }
  const session = MarketHours.getStatus(at);
  const meta = sessionMeta(session);
  return { session, phtTime: formatPhtTime(at), ...meta, detail: withCountdown(session, at, meta.detail) };
}

interface MarketStatusServerPayload {
  ok: boolean;
  status: "holiday" | "weekend" | "auction" | "open" | "lunch" | "closing" | "post-market";
}

/** True only when the server calendar reports today as a PSE holiday. */
async function fetchHolidayFlag(): Promise<boolean> {
  try {
    const res = await fetch("/api/market-status", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as MarketStatusServerPayload;
    return payload.status === "holiday";
  } catch {
    return false; // server unreachable → fall back to the client ladder
  }
}

export function useMarketStatus(refreshMs = 30000): MarketStatusState {
  const [status, setStatus] = useState<MarketStatusState>(() => computeStatus());
  // The PHT date (YYYY-MM-DD) the holiday flag applies to — null when the
  // server says the current day is a trading day. Guards against applying a
  // stale holiday flag after midnight.
  const [holidayForDate, setHolidayForDate] = useState<string | null>(null);
  const fetchedDateRef = useRef<string | null>(null);

  const checkHoliday = useCallback(async () => {
    const today = phtDateString(new Date());
    if (fetchedDateRef.current === today) return; // already resolved for this PHT day
    fetchedDateRef.current = today;
    const isHoliday = await fetchHolidayFlag();
    setHolidayForDate(isHoliday ? today : null);
  }, []);

  // Initial calendar check on mount.
  useEffect(() => {
    void checkHoliday();
  }, [checkHoliday]);

  // Refresh the session ladder every interval; also re-check the calendar
  // when the PHT day rolls over while the page stays open.
  const tick = useCallback(() => {
    const now = new Date();
    const today = phtDateString(now);
    if (fetchedDateRef.current !== today) void checkHoliday();
    setStatus(computeStatus(now, holidayForDate === today));
  }, [checkHoliday, holidayForDate]);

  useEffect(() => {
    tick();
    const id = window.setInterval(tick, refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs, tick]);

  // Force a re-compute on tab visibility change so the badge doesn't sit
  // stale after the user returns from a background tab around open/close.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [tick]);

  return status;
}

