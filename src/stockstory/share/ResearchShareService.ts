import type { SharedSnapshot } from "./ResearchShareTypes";

export function generateShareId(symbol: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ss-${symbol.toLowerCase()}-${timestamp}${random}`;
}

export function buildShareUrl(shareId: string): string {
  return `/share/research/${shareId}`;
}

export async function createShareSnapshot(snapshot: Omit<SharedSnapshot, "id" | "createdAt">): Promise<SharedSnapshot | null> {
  const id = generateShareId(snapshot.symbol);
  const full: SharedSnapshot = {
    ...snapshot,
    id,
    createdAt: new Date().toISOString(),
  };
  try {
    const resp = await fetch("/api/share/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(full),
    });
    if (!resp.ok) throw new Error("Failed to create share snapshot");
    return await resp.json();
  } catch {
    // Fallback: store in sessionStorage for demo purposes
    try {
      const existing = JSON.parse(sessionStorage.getItem("ss_shares") || "{}");
      existing[id] = full;
      sessionStorage.setItem("ss_shares", JSON.stringify(existing));
    } catch { /* ignore */ }
    return full;
  }
}

export async function getShareSnapshot(shareId: string): Promise<SharedSnapshot | null> {
  try {
    const resp = await fetch(`/api/share/${shareId}`);
    if (!resp.ok) throw new Error("Snapshot not found");
    return await resp.json();
  } catch {
    try {
      const existing = JSON.parse(sessionStorage.getItem("ss_shares") || "{}");
      return existing[shareId] || null;
    } catch {
      return null;
    }
  }
}
