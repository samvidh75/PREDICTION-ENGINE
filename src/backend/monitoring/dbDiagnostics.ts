declare global {
  interface Window {
    __ss_db_diag_buffer?: Array<unknown>;
  }
}

export type DbDiagEvent =
  | { type: "query"; at: number; ok: true; ms: number; rows: number }
  | { type: "query"; at: number; ok: false; ms: number; error: string }
  | { type: "ping"; at: number; ok: boolean; detail?: string };

export function pushDbDiag(ev: DbDiagEvent, maxEntries = 120): void {
  if (typeof window === "undefined") return;

  const g = window as Window;
  if (!g.__ss_db_diag_buffer) g.__ss_db_diag_buffer = [];
  g.__ss_db_diag_buffer.push(ev);

  if (g.__ss_db_diag_buffer.length > maxEntries) {
    g.__ss_db_diag_buffer.splice(0, g.__ss_db_diag_buffer.length - maxEntries);
  }
}
