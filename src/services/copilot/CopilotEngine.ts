// src/services/copilot/CopilotEngine.ts

export interface CopilotResponse {
  answer: string;
  category: string;
}

/**
 * KNOWN GAP: this previously returned fully fabricated "analysis" text
 * hardcoded to specific real Indian companies (Reliance, HAL, BEL, Tata
 * Motors) — invented commentary presented as if it were real research,
 * with no data backing it. Confirmed dead (no importers anywhere in src/
 * or api/). Rather than swap in equally-fabricated PSE company commentary,
 * this now only returns the honest fallback message; any real answer needs
 * to come from a data-backed engine (see src/services/intelligence/).
 */
export class CopilotEngine {
  public static ask(_query: string): CopilotResponse {
    return {
      answer: "I can help analyze company trends, compare assets, or summarize corporate updates in plain, SEC-safe English — but I need to be wired to a real data-backed engine first (see src/services/intelligence/) rather than fabricated commentary.",
      category: "General Intelligence",
    };
  }
}
