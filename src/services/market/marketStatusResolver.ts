import { MarketHours, PSE_SCHEDULE } from './MarketHours';

/**
 * Pure resolver for PSE market status — combines the Asia/Manila session
 * ladder (MarketHours) with an optional holiday flag into a single
 * serializable status payload. Kept framework-free so it can be unit
 * tested directly and reused by api/market-status.ts (server) and any
 * client that wants the same shape.
 */

export interface MarketStatusPayload {
  ok: boolean;
  asOf: string;
  timezone: 'Asia/Manila';
  status: 'holiday' | 'weekend' | 'auction' | 'open' | 'lunch' | 'closing' | 'post-market';
  label: string;
  detail: string;
  isOpen: boolean;
  minutesToClose: number | null;
  minutesToNextOpen: number | null;
  schedule: {
    preOpen: string;
    open: string;
    lunchStart: string;
    lunchEnd: string;
    close: string;
  };
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Calendar date in Manila (PHT = UTC+8), used to check the holiday list. */
export function phtDateString(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Milliseconds between 09:30 PHT and UTC midnight of the same calendar day:
 * 09:30 PHT = 01:30 UTC, so 1.5 hours. */
const OPEN_PHT_UTC_OFFSET_MS = 90 * 60 * 1000;

export function minutesUntilNextOpen(
  now: Date,
  isTradingDay: (date: Date) => boolean,
): number | null {
  const [y, m, d] = phtDateString(now).split('-').map(Number);
  const manilaMidnightUtc = Date.UTC(y, m - 1, d);

  for (let offset = 0; offset <= 7; offset++) {
    // Candidate open instant: (Manila calendar day + offset) at 09:30 PHT.
    // All date math is in UTC — PHT has no DST, so 09:30 PHT is always
    // 01:30 UTC on the same calendar date.
    const probe = new Date(manilaMidnightUtc + offset * 86_400_000 + OPEN_PHT_UTC_OFFSET_MS);
    if (probe.getTime() <= now.getTime()) continue;
    if (isTradingDay(probe)) {
      return Math.round((probe.getTime() - now.getTime()) / 60000);
    }
  }
  return null;
}

export function resolveMarketStatus(now: Date, isHoliday: boolean, isTradingDay: (d: Date) => boolean): MarketStatusPayload {
  const session = MarketHours.getStatus(now);

  let status: MarketStatusPayload['status'];
  let label: string;
  let detail: string;
  let isOpen: boolean;

  if (isHoliday) {
    status = 'holiday';
    label = 'Market closed';
    detail = 'PSE non-trading holiday';
    isOpen = false;
  } else if (session === 'open') {
    status = 'open';
    label = 'Market open';
    isOpen = true;
    detail = `Closes at ${formatMinutes(PSE_SCHEDULE.CLOSE)} PHT`;
  } else if (session === 'lunch') {
    status = 'lunch';
    label = 'Lunch break';
    detail = `Reopens at ${formatMinutes(PSE_SCHEDULE.LUNCH_END)} PHT`;
    isOpen = false;
  } else if (session === 'auction') {
    status = 'auction';
    label = 'Pre-open auction';
    detail = `Call auction until ${formatMinutes(PSE_SCHEDULE.OPEN)} PHT`;
    isOpen = false;
  } else if (session === 'closing') {
    status = 'closing';
    label = 'Market closed';
    detail = 'Session ended at 3:30 PM PHT';
    isOpen = false;
  } else if (session === 'weekend') {
    status = 'weekend';
    label = 'Market closed';
    detail = 'Weekend — PSE is closed';
    isOpen = false;
  } else {
    status = 'post-market';
    label = 'Market closed';
    detail = 'Outside trading hours';
    isOpen = false;
  }

  const minutesNow = sessionToMinutes(now);
  const minutesToClose = isOpen ? Math.max(0, PSE_SCHEDULE.CLOSE - minutesNow) : null;
  const minutesToNextOpen = isOpen ? 0 : minutesUntilNextOpen(now, isTradingDay);

  return {
    ok: true,
    asOf: now.toISOString(),
    timezone: 'Asia/Manila',
    status,
    label,
    detail,
    isOpen,
    minutesToClose,
    minutesToNextOpen,
    schedule: {
      preOpen: formatMinutes(PSE_SCHEDULE.PRE_OPEN),
      open: formatMinutes(PSE_SCHEDULE.OPEN),
      lunchStart: formatMinutes(PSE_SCHEDULE.LUNCH_START),
      lunchEnd: formatMinutes(PSE_SCHEDULE.LUNCH_END),
      close: formatMinutes(PSE_SCHEDULE.CLOSE),
    },
  };
}

function sessionToMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}
