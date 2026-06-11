export interface TipVerification {
  status: "low-risk" | "needs-verification" | "high-risk";
  flags: string[];
  safeText: string;
}

const HIGH_RISK_PATTERNS = [
  /guaranteed/i,
  /sure\s*shot/i,
  /inside(r)?\s*(news|tip|information)/i,
  /operator/i,
  /pump/i,
  /double\s+in/i,
  /upper\s+circuit/i,
  /buy\s+now/i,
];

export function verifyWhatsAppTip(text: string): TipVerification {
  const flags = HIGH_RISK_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replaceAll("\\s*", " ").replaceAll("\\s+", " "));
  const hasLink = /https?:\/\/|wa\.me|t\.me/i.test(text);
  const hasUrgency = /\b(today|tomorrow|urgent|before market|जल्दी|आज)\b/i.test(text);
  const allFlags = [...flags, ...(hasLink ? ["external link"] : []), ...(hasUrgency ? ["urgency language"] : [])];
  return {
    status: allFlags.length >= 3 ? "high-risk" : allFlags.length > 0 ? "needs-verification" : "low-risk",
    flags: allFlags,
    safeText: "Treat forwarded tips as unverified until matched with official exchange filings, company disclosures, or audited data.",
  };
}
