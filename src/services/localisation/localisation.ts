export type SupportedLocale = "en-IN" | "hi-IN";

const STORAGE_KEY = "ss_locale_v1";

const dictionary: Record<string, Record<SupportedLocale, string>> = {
  unavailable: { "en-IN": "Data unavailable", "hi-IN": "डेटा उपलब्ध नहीं है" },
  summaryPrefix: { "en-IN": "Summary", "hi-IN": "सारांश" },
  riskPrefix: { "en-IN": "Risk note", "hi-IN": "जोखिम नोट" },
};

export function loadLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en-IN";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "hi-IN" ? "hi-IN" : "en-IN";
}

export function saveLocale(locale: SupportedLocale): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new CustomEvent("ss:locale-changed", { detail: locale }));
  }
}

export function t(key: keyof typeof dictionary, locale: SupportedLocale): string {
  return dictionary[key]?.[locale] ?? dictionary[key]?.["en-IN"] ?? key;
}

export function buildHindiSummary(input: {
  companyName: string;
  classification?: string | null;
  confidence?: string | null;
  narrative?: string | null;
}): string {
  const classification = input.classification || t("unavailable", "hi-IN");
  const confidence = input.confidence || t("unavailable", "hi-IN");
  const narrative = input.narrative ? `मुख्य बात: ${input.narrative}` : "मुख्य बात उपलब्ध नहीं है।";
  return `${input.companyName}: स्वास्थ्य स्थिति ${classification} है। भरोसा स्तर ${confidence} है। ${narrative} यह शैक्षिक सारांश है, निवेश सलाह नहीं।`;
}

export function speakLocalSummary(text: string, locale: SupportedLocale): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
