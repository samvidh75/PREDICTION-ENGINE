const REFERRAL_KEY = "ss_referral_code";
const REFERRAL_SOURCE_KEY = "ss_referral_source";

export function getReferralCode(): string | null {
  try {
    // Check URL for referral code
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(REFERRAL_KEY, ref);
      return ref;
    }
    return localStorage.getItem(REFERRAL_KEY);
  } catch { return null; }
}

export function getShareUrl(symbol: string, companyName?: string): string {
  const base = `https://stockstory-india.com/?page=stock&id=${symbol}`;
  const ref = getReferralCode();
  if (ref) return `${base}&ref=${ref}`;
  return base;
}

export function shareStock(symbol: string, companyName?: string): void {
  const url = getShareUrl(symbol, companyName);
  const text = companyName
    ? `Check out AI-powered research on ${companyName} (${symbol}) on StockStory India 🚀\n\n${url}`
    : `Check out AI-powered research on ${symbol} on StockStory India 🚀\n\n${url}`;

  if (navigator.share) {
    navigator.share({ title: `${symbol} - StockStory India`, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast here
    }).catch(() => {});
  }
}

export function trackShare(symbol: string, platform: string): void {
  try {
    const shares = JSON.parse(localStorage.getItem("ss_shares") || "[]");
    shares.push({ symbol, platform, timestamp: new Date().toISOString() });
    localStorage.setItem("ss_shares", JSON.stringify(shares.slice(-50)));
  } catch { /* ignore */ }
}
