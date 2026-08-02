/**
 * Privacy-first consent management.
 * Users must opt in before analytics/telemetry data is collected.
 */

export type ConsentChoice = "accepted" | "declined" | "undecided";

const COPSENT_STORAGE_KEY = "stockstory:privacy-consent";

export function getConsent(): ConsentChoice {
  if (typeof window === "undefined") return "undecided";
  return (localStorage.getItem(COPSENT_STORAGE_KEY) as ConsentChoice) || "undecided";
}

export function setConsent(choice: "accepted" | "declined"): void {
  localStorage.setItem(COPSENT_STORAGE_KEY, choice);
}

export function hasConsented(): boolean {
  return getConsent() === "accepted";
}
