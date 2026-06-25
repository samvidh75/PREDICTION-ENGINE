type EventName =
  | 'stock_viewed'
  | 'scanner_run'
  | 'broker_referral_click'
  | 'track_added'
  | 'compare_started'
  | 'pro_upsell_seen'
  | 'pro_email_submitted'

type EventProperties = Record<string, string | number | boolean | string[]>

const events: Array<{ name: EventName; props: EventProperties; ts: number }> = []

export function trackEvent(name: EventName, props: EventProperties = {}): void {
  const event = { name, props, ts: Date.now() }
  events.push(event)

  // Keep last 100 events in memory
  if (events.length > 100) events.shift()

  // Console log in development
  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${name}`, props)
  }

  // Send to analytics endpoint (no-op if endpoint doesn't exist yet)
  try {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => { /* analytics endpoint may not exist yet */ })
  } catch {
    // silently fail
  }
}

export function useAnalytics() {
  return { trackEvent, events }
}
