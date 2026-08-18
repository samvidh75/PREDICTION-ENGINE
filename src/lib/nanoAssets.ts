/**
 * Nano Banana asset manifest for the StockEx public marketing pages.
 *
 * Each key maps to the real generated asset path under public/assets/nano-banana/.
 * The BananaBanner component that consumes these paths falls back to a CSS
 * gradient when the file does not exist yet, so the site never shows a broken
 * image before you generate the asset.
 *
 * Generate them with the bundled MCP tool in Claude Code (nano-banana server)
 * or via CLI:
 *   npm run nano:generate -- --generate "<prompt>" --filename stockex-landing-hero --aspect 16:9
 *
 * The canonical prompts live in src/lib/nanoPromptPack.ts.
 */
export const NANOBANANA_ASSETS = {
  landingHero: "/assets/nano-banana/stockex-landing-hero.png",
  pricingHero: "/assets/nano-banana/stockex-pricing-hero.png",
  trustHero: "/assets/nano-banana/stockex-trust-hero.png",
  ogCard: "/assets/nano-banana/stockex-og-card.png",
} as const;

export type NanoBananaAssetKey = keyof typeof NANOBANANA_ASSETS;
