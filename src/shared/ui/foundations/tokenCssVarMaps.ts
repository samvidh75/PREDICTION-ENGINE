import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { coloursCssVars } from "../foundations/token-bridge/colours";
import { fontRoleVars } from "../foundations/typography/fontRoles";

/**
 * tokenCssVarMaps
 * Central mapping from token modules -> existing CSS variable names in src/styles/index.css.
 *
 * This is intentionally incremental:
 * - We keep current class contracts (`ss-pad-*`, `ss-ty-*`, etc.)
 * - We migrate the *source-of-truth* to TS token modules
 * - We avoid "random hardcoded styling" outside token maps.
 */

export function buildSpacingCssVars(): Record<string, string> {
  return {
    "--ss-pad-4": spacing[4],
    "--ss-pad-8": spacing[8],
    "--ss-pad-12": spacing[12],
    "--ss-pad-16": spacing[16],
    "--ss-pad-24": spacing[24],
    "--ss-pad-32": spacing[32],
    "--ss-pad-48": spacing[48],
    "--ss-pad-72": spacing[72],
    "--ss-pad-96": spacing[96],
  };
}

export function buildTypographyCssVars(): Record<string, string> {
  return {
    "--ss-font-ui": typography.fonts.primary.join(", "),
    "--ss-font-mono": typography.fonts.mono.join(", "),

    // Display hero
    "--ss-ty-hero-title-size": `${typography.displayHero.size}px`,
    "--ss-ty-hero-title-weight": `${typography.displayHero.weight}`,
    "--ss-ty-hero-title-line-height": typography.displayHero.lineHeight,
    "--ss-ty-hero-title-tracking": typography.displayHero.letterSpacing,

    // Primary headline
    "--ss-ty-headline-size": `${typography.primaryHeadline.size}px`,
    "--ss-ty-headline-weight": `${typography.primaryHeadline.weight}`,
    "--ss-ty-headline-line-height": typography.primaryHeadline.lineHeight,
    "--ss-ty-headline-tracking": typography.primaryHeadline.letterSpacing,

    // Section title
    "--ss-ty-section-title-size": `${typography.sectionTitle.size}px`,
    "--ss-ty-section-title-weight": `${typography.sectionTitle.weight}`,
    "--ss-ty-section-title-line-height": typography.sectionTitle.lineHeight,
    "--ss-ty-section-title-tracking": typography.sectionTitle.letterSpacing,

    // Narrative / body text
    "--ss-ty-body-size": `${typography.narrativeText.size}px`,
    "--ss-ty-body-weight": `${typography.narrativeText.weight}`,
    "--ss-ty-body-line-height": typography.narrativeText.lineHeight,

    // Micro labels
    "--ss-ty-micro-label-size": `${typography.microLabel.size}px`,
    "--ss-ty-micro-label-letter-spacing": typography.microLabel.trackingEm,
    "--ss-ty-micro-label-weight": `${typography.microLabel.weight}`,

    // Font weights
    "--ss-ty-weight-body": `${typography.weight.body}`,
    "--ss-ty-weight-body-strong": `${typography.weight.bodyStrong}`,
    "--ss-ty-weight-headline": `${typography.weight.headline}`,
    "--ss-ty-weight-display": `${typography.weight.display}`,

    // Letter spacing
    "--ss-ty-letter-spacing-normal": typography.letterSpacing.normal,
    "--ss-ty-letter-spacing-label": typography.letterSpacing.label,
  };
}

export function buildColourCssVars(): Record<string, string> {
  return { ...coloursCssVars } as Record<string, string>;
}

export function buildTokenCssVars(): Record<string, string> {
  return {
    ...buildSpacingCssVars(),
    ...buildTypographyCssVars(),
    ...buildColourCssVars(),
    ...fontRoleVars,
  };
}
