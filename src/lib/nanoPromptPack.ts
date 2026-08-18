/**
 * nanoPromptPack.ts — ready-to-run Nano Banana prompts for the StockEx
 * public marketing pages. Each entry maps to an asset in NANOBANANA_ASSETS.
 *
 * How to use:
 *  1) Open Claude Code in this repo (MCP server "nano-banana" is registered in
 *     .mcp.json). Ask:  "Use the nano-banana generate_image tool with the
 *     prompt for landingHero below, filename stockex-landing-hero, 16:9."
 *  2) Or run directly without Claude Code:
 *       npm run nano:generate -- --generate "<prompt>" --filename stockex-landing-hero --aspect 16:9
 *
 * Brand notes the prompts encode:
 *   - PSE (Philippine Stock Exchange) equities research, the "Zerodha of the PH".
 *   - Editorial "ledger / paper" identity: warm paper, deep ink, rust/amber fox
 *     accents (#B5502E), precise hairline rules — not generic fintech blue.
 *   - Premium, still honest: no fake trading data, no fabricated tickers.
 */

export type NanoPromptEntry = {
  key: string;
  file: string;
  aspect: "16:9" | "3:4" | "1:1";
  prompt: string;
};

export const NANO_PROMPTS: NanoPromptEntry[] = [
  {
    key: "landingHero",
    file: "stockex-landing-hero",
    aspect: "16:9",
    prompt:
      "Cinematic 16:9 website hero background for a premium Philippine stock-market research " +
      "platform. A modern dark editorial 'research terminal' scene: an elegant open ledger on a " +
      "deep ink-navy surface, precise hairline grid lines and thin candlestick chart strokes in " +
      "rust-amber (#B5502E) and institutional green, a subtle warm Manila golden-hour glow from " +
      "the upper left, translucent glass panels with faint type. Clean generous negative space on " +
      "the left third for headline text. Mood: institutional, precise, premium, calm. Absolutely " +
      "no realistic text, logos, or photographed people.",
  },
  {
    key: "pricingHero",
    file: "stockex-pricing-hero",
    aspect: "16:9",
    prompt:
      "Premium 16:9 abstract hero for a stock-research pricing page. A calm dark navy " +
      "editorial canvas with layered translucent pricing-card silhouettes, faint ascending " +
      "candlestick lines, and a warm rust-amber accent glow. Neutral dark space on the right for " +
      "headline copy. No text, no numbers, no logos. Moody, precise, premium.",
  },
  {
    key: "trustHero",
    file: "stockex-trust-hero",
    aspect: "16:9",
    prompt:
      "Premium 16:9 abstract hero for a 'Trust & Disclosures' page. A dark editorial canvas " +
      "with a large faint watermark-style seal/shield outline, fine hairline rule patterns, a " +
      "soft warm rust-accent aperture, and balanced negative space in the center for a heading. " +
      "No text, no logos. Precise, institutional, trustworthy, premium.",
  },
  {
    key: "ogCard",
    file: "stockex-og-card",
    aspect: "16:9",
    prompt:
      "Minimal 16:9 social share card for a Philippine equities research brand. Dark navy " +
      "editorial background, a short thin ascending candlestick chart line in rust-amber and " +
      "green, subtle Manila bay glow, clean and legible, lots of empty space. No text.",
  },
];

/** Returns the MCP-ready invocation text for a given prompt key. */
export function nanoPromptScript(key: string): string {
  const entry = NANO_PROMPTS.find((p) => p.key === key);
  if (!entry) return `Unknown nano prompt key "${key}".`;
  return [
    `Use the "generate_image" tool in the nano-banana MCP server with:`,
    `  • prompt: ${entry.prompt}`,
    `  • filename: ${entry.file}`,
    `  • aspectRatio: ${entry.aspect}`,
  ].join("\n");
}