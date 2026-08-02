export class CompanyNarrativeEngine {
  /**
   * Generates plain-English narrative summaries for companies (Section 124).
   * Restricts summary output strictly to a maximum of 120 words.
   */
  static generateStory(companyName: string, sector: string, status: string): string {
    const raw = `${companyName} represents a key player inside the active ${sector} sector. Under current market conditions, its operations maintain a steady posture showing ${status.toLowerCase()} characteristics. Capital investments and fundamentals remain aligned, contributing to its ongoing business journey.`;
    return this.limitWords(raw, 120);
  }

  private static limitWords(str: string, maxWords: number): string {
    const words = str.trim().split(/\s+/);
    if (words.length <= maxWords) return str;
    return words.slice(0, maxWords).join(" ") + "...";
  }
}
