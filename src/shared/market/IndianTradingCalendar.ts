const FIXED_NSE_HOLIDAYS = new Set(["01-26", "05-01", "08-15", "10-02"]);

/** Conservative NSE-session validation. Floating holidays must come from ingestion metadata. */
export function isIndianTradingSessionDate(value: string | Date): boolean {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !FIXED_NSE_HOLIDAYS.has(date.toISOString().slice(5, 10));
}

export function latestIndianTradingSession(now = new Date()): string {
  const cursor = new Date(now);
  cursor.setUTCHours(0, 0, 0, 0);
  while (!isIndianTradingSessionDate(cursor)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  return cursor.toISOString().slice(0, 10);
}
