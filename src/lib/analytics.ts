const ANALYTICS_KEY = "ss_analytics_events";
const SESSION_KEY = "ss_session_id";
let _counter = 0;
function uid(): string { return `${Date.now()}_${(_counter++ % 10000).toString(36).padStart(3,'0')}`; }

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) { sid = `s_${uid()}`; sessionStorage.setItem(SESSION_KEY, sid); }
    return sid;
  } catch { return `s_${Date.now()}`; }
}

function getUserId(): string {
  try {
    let uid = localStorage.getItem("ss_user_id");
    if (!uid) { uid = `u_${Date.now()}_${(_counter++ % 1000000).toString(36)}`; localStorage.setItem("ss_user_id", uid); }
    return uid;
  } catch { return `u_${Date.now()}`; }
}

export function trackEvent(category: string, action: string, label?: string, value?: number) {
  try {
    const event = {
      category,
      action,
      label: label ?? '',
      value: value ?? 0,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      userId: getUserId(),
      url: window.location.href,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent.slice(0, 100),
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Store locally
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]");
    events.push(event);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-500)));

    // Send to GA4 if available
    if (typeof window !== "undefined" && "gtag" in window) {
      try {
        (window as any).gtag?.("event", action, {
          event_category: category,
          event_label: label,
          value: value,
          send_to: "G-XXXXXXXXXX",
        });
      } catch { /* ga not loaded */ }
    }
  } catch { /* analytics unavailable */ }
}

export function trackPageView(page: string, symbol?: string) {
  trackEvent("page_view", page, symbol);
}

export function getAnalyticsSummary(): {
  totalPageViews: number;
  uniqueUsers: number;
  topPages: [string, number][];
  topReferrers: [string, number][];
  recentEvents: number;
} {
  try {
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]") as any[];
    const pageViews = events.filter(e => e.category === "page_view");
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const pages: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    pageViews.forEach(e => {
      const page = e.label || e.url;
      pages[page] = (pages[page] || 0) + 1;
      if (e.referrer) referrers[e.referrer] = (referrers[e.referrer] || 0) + 1;
    });
    return {
      totalPageViews: pageViews.length,
      uniqueUsers,
      topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topReferrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 5),
      recentEvents: events.length,
    };
  } catch { return { totalPageViews: 0, uniqueUsers: 0, topPages: [], topReferrers: [], recentEvents: 0 }; }
}

export function trackUserAction(action: string, symbol?: string, details?: string) {
  trackEvent("user_action", action, details || symbol, undefined);
}
