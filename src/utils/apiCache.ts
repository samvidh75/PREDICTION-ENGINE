const cache = new Map<string, { data: unknown; expiry: number }>()

const TTL: Record<string, number> = {
  quote:      30_000,   // 30 seconds
  snapshot:   300_000,  // 5 minutes
  financials: 3_600_000, // 1 hour
  news:       600_000,   // 10 minutes
  scanner:    60_000,    // 1 minute
}

export function getCached<T>(url: string, ttl: keyof typeof TTL | number = 'snapshot'): T | null {
  const duration = typeof ttl === 'number' ? ttl : TTL[ttl] || TTL.snapshot
  const entry = cache.get(url)
  if (entry && Date.now() < entry.expiry) return entry.data as T
  if (entry) cache.delete(url)
  return null
}

export function setCache(url: string, data: unknown, ttl: keyof typeof TTL | number = 'snapshot'): void {
  const duration = typeof ttl === 'number' ? ttl : TTL[ttl] || TTL.snapshot
  cache.set(url, { data, expiry: Date.now() + duration })
}

export function clearCache(pattern?: string): void {
  if (!pattern) { cache.clear(); return }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}
