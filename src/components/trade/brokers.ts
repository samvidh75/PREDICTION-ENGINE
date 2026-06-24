export interface BrokerPartner {
  id: string;
  name: string;
  shortName: string;
  description: string;
  referralUrl: string;
  logo: string; // emoji placeholder, replace with real logo SVGs
  color: string;
  features: string[];
  accountOpenUrl: string;
}

export const BROKER_PARTNERS: BrokerPartner[] = [
  {
    id: "zerodha",
    name: "Zerodha",
    shortName: "Zerodha",
    description: "India's largest stock broker. ₹0 brokerage on equity delivery.",
    referralUrl: "https://zerodha.com/open-account?c=STOCKSTORY",
    accountOpenUrl: "https://zerodha.com/open-account?c=STOCKSTORY",
    logo: "Z",
    color: "#387ed1",
    features: ["₹0 brokerage on delivery", "Kite trading platform", "Coin mutual funds", "Fast account opening"],
  },
  {
    id: "groww",
    name: "Groww",
    shortName: "Groww",
    description: "India's most user-friendly investing app. Start with ₹0.",
    referralUrl: "https://groww.in/partner/STOCKSTORY",
    accountOpenUrl: "https://groww.in/partner/STOCKSTORY",
    logo: "G",
    color: "#00d09c",
    features: ["Zero account opening fee", "Mutual funds + stocks", "Paperless KYC", "5-min account setup"],
  },
  {
    id: "angelone",
    name: "Angel One",
    shortName: "Angel One",
    description: "Full-service broker with research support and 3-in-1 accounts.",
    referralUrl: "https://angel-one.onelink.me/STOCKSTORY",
    accountOpenUrl: "https://angel-one.onelink.me/STOCKSTORY",
    logo: "A",
    color: "#ff6344",
    features: ["Free equity delivery", "ARQ investment engine", "SIP in stocks", "Demat + trading + bank"],
  },
  {
    id: "upstox",
    name: "Upstox",
    shortName: "Upstox",
    description: "Powerful trading platform with flat ₹20 per trade.",
    referralUrl: "https://upstox.com/open-account/?f=STOCKSTORY",
    accountOpenUrl: "https://upstox.com/open-account/?f=STOCKSTORY",
    logo: "U",
    color: "#6c3fc4",
    features: ["Flat ₹20 per order", "Pro Web platform", "Margin trading facility", "API access for algo"],
  },
  {
    id: "dhan",
    name: "Dhan",
    shortName: "Dhan",
    description: "Modern trading platform by India Infoline. ₹0 brokerage options.",
    referralUrl: "https://dhan.co/partner/STOCKSTORY",
    accountOpenUrl: "https://dhan.co/partner/STOCKSTORY",
    logo: "D",
    color: "#1a2b4a",
    features: ["₹0 on delivery trading", "Dhan Web + Mobile", "Smart investment tools", "Free account opening"],
  },
  {
    id: "icici",
    name: "ICICI Direct",
    shortName: "ICICI Direct",
    description: "India's largest full-service broker with integrated banking.",
    referralUrl: "https://www.icicidirect.com/open-demat-account?ref=STOCKSTORY",
    accountOpenUrl: "https://www.icicidirect.com/open-demat-account?ref=STOCKSTORY",
    logo: "ID",
    color: "#f58220",
    features: ["3-in-1 account", "Research reports", "IPO financing", "Margin against shares"],
  },
];

export function getBrokerUrl(symbol: string, brokerId: string): string {
  const broker = BROKER_PARTNERS.find(b => b.id === brokerId);
  if (!broker) return "#";
  const base = broker.referralUrl;
  const encodedSymbol = encodeURIComponent(symbol);
  return `${base}&symbol=${encodedSymbol}`;
}

export function trackReferralClick(brokerId: string, symbol: string): void {
  try {
    const clicks = JSON.parse(localStorage.getItem("ss_referral_clicks") || "[]");
    clicks.push({ brokerId, symbol, timestamp: new Date().toISOString() });
    localStorage.setItem("ss_referral_clicks", JSON.stringify(clicks.slice(-100)));
    if (typeof window !== "undefined" && "gtag" in window) {
      (window as any).gtag?.("event", "referral_click", { broker: brokerId, symbol });
    }
  } catch { /* localStorage not available */ }
}
