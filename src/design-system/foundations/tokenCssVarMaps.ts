import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import { coloursCssVars } from "../tokens/colours";
import { fontRoleVars } from "../typography/fontRoles";

/**
 * tokenCssVarMaps
 * Central mapping from token modules -> existing CSS variable names in src/styles/index.css.
 *
 * This is intentionally incremental:
 * - We keep current class contracts (`ss-pad-*`, `ss-ty-*`, etc.)
 * - We migrate the *source-of-truth* to TS token modules
 * - We avoid “random hardcoded styling” outside token maps.
 */

export function buildSpacingCssVars(): Record<string, string> {
  return {
    "--ss-pad-4": `${spacing.padXs}px`,
    "--ss-pad-5": `${spacing.padSm}px`,
    "--ss-pad-6": `${spacing.padMd}px`,

    "--ss-space-20": `${spacing.layout20}px`,
    "--ss-space-64": `${spacing.layout64}px`,
    "--ss-space-72": `${spacing.layout72}px`,
    "--ss-space-80": `${spacing.layout80}px`,
    "--ss-space-96": `${spacing.layout96}px`,
    "--ss-space-110": `${spacing.layout110}px`,
  };
}

export function buildTypographyCssVars(): Record<string, string> {
  return {
    "--ss-font-ui": typography.fontUi.join(", "),
    "--ss-font-mono": typography.fontMonoUi.join(", "),

    // Shared kicker (legacy CSS uses these vars too)
    "--ss-ty-kicker-size": `${typography.kicker.sizePx}px`,
    "--ss-ty-kicker-letter-spacing": `${typography.kicker.letterSpacingEm}em`,
    "--ss-ty-kicker-color": typography.kicker.color,
    "--ss-ty-kicker-weight": `${typography.kicker.weight}`,
    "--ss-ty-shadow-soft": typography.kicker.shadowSoft,

    // Hero titles
    "--ss-ty-hero-title-size": `${typography.heroTitle.sizePx}px`,
    "--ss-ty-hero-title-size-sm": `${typography.heroTitle.sizePxSm}px`,
    "--ss-ty-hero-title-weight": `${typography.heroTitle.weight}`,
    "--ss-ty-hero-title-line-height": `${typography.heroTitle.lineHeight}`,
    "--ss-ty-hero-title-tracking": `${typography.heroTitle.trackingEm}em`,
    "--ss-ty-hero-title-shadow": typography.heroTitle.shadow,

    // Section titles (legacy-compatible; some components map SectionTitle -> module classes)
    "--ss-ty-section-title-size": `${typography.sectionTitle.sizePx}px`,
    "--ss-ty-section-title-size-sm": `${typography.sectionTitle.sizePxSm}px`,
    "--ss-ty-section-title-weight": `${typography.sectionTitle.weight}`,
    "--ss-ty-section-title-line-height": `${typography.sectionTitle.lineHeight}`,
    "--ss-ty-section-title-tracking": `${typography.sectionTitle.trackingEm}em`,
    "--ss-ty-section-title-color": typography.sectionTitle.color,

    // Module headings (used by ModuleTitle / SectionTitle components)
    "--ss-ty-module-kicker-size": `${typography.moduleKicker.sizePx}px`,
    "--ss-ty-module-kicker-letter-spacing": `${typography.moduleKicker.letterSpacingEm}em`,
    "--ss-ty-module-kicker-color": typography.moduleKicker.color,
    "--ss-ty-module-kicker-weight": `${typography.moduleKicker.weight}`,
    "--ss-ty-module-kicker-shadow-soft": typography.moduleKicker.shadowSoft,

    "--ss-ty-module-title-size": `${typography.moduleTitle.sizePx}px`,
    "--ss-ty-module-title-size-sm": `${typography.moduleTitle.sizePxSm}px`,
    "--ss-ty-module-title-weight": `${typography.moduleTitle.weight}`,
    "--ss-ty-module-title-line-height": `${typography.moduleTitle.lineHeight}`,
    "--ss-ty-module-title-tracking": `${typography.moduleTitle.trackingEm}em`,
    "--ss-ty-module-title-color": typography.moduleTitle.color,

    // Body + widget support
    "--ss-ty-body-size": `${typography.bodyText.sizePx}px`,
    "--ss-ty-body-size-sm": `${typography.bodyText.sizePxSm}px`,
    "--ss-ty-body-weight": `${typography.bodyText.weight}`,
    "--ss-ty-body-line-height": `${typography.bodyText.lineHeight}`,
    "--ss-ty-body-color": typography.bodyText.color,

    "--ss-ty-widget-support-size": `${typography.widgetSupport.sizePx}px`,
    "--ss-ty-widget-support-size-sm": `${typography.widgetSupport.sizePxSm}px`,
    "--ss-ty-widget-support-weight": `${typography.widgetSupport.weight}`,
    "--ss-ty-widget-support-line-height": `${typography.widgetSupport.lineHeight}`,
    "--ss-ty-widget-support-color": typography.widgetSupport.color,

    // Micro labels
    "--ss-ty-micro-label-size": `${typography.microLabel.sizePx}px`,
    "--ss-ty-micro-label-letter-spacing": `${typography.microLabel.letterSpacingEm}em`,
    "--ss-ty-micro-label-weight": `${typography.microLabel.weight}`,
    "--ss-ty-micro-label-color": typography.microLabel.color,

    // Navigation labels
    "--ss-ty-nav-label-size": `${typography.navLabel.sizePx}px`,
    "--ss-ty-nav-label-letter-spacing": `${typography.navLabel.letterSpacingEm}em`,
    "--ss-ty-nav-label-color": typography.navLabel.color,
    "--ss-ty-nav-label-weight": `${typography.navLabel.weight}`,
    "--ss-ty-nav-label-line-height": `${typography.navLabel.lineHeight}`,

    // Card labeling hierarchy
    "--ss-ty-card-label-size": `${typography.cardLabel.sizePx}px`,
    "--ss-ty-card-label-letter-spacing": `${typography.cardLabel.letterSpacingEm}em`,
    "--ss-ty-card-label-color": typography.cardLabel.color,
    "--ss-ty-card-label-weight": `${typography.cardLabel.weight}`,

    "--ss-ty-card-heading-size": `${typography.cardHeading.sizePx}px`,
    "--ss-ty-card-heading-size-sm": `${typography.cardHeading.sizePxSm}px`,
    "--ss-ty-card-heading-weight": `${typography.cardHeading.weight}`,
    "--ss-ty-card-heading-line-height": `${typography.cardHeading.lineHeight}`,
    "--ss-ty-card-heading-tracking": `${typography.cardHeading.trackingEm}em`,
    "--ss-ty-card-heading-color": typography.cardHeading.color,

    "--ss-ty-card-body-size": `${typography.cardBody.sizePx}px`,
    "--ss-ty-card-body-size-sm": `${typography.cardBody.sizePxSm}px`,
    "--ss-ty-card-body-line-height": `${typography.cardBody.lineHeight}`,
    "--ss-ty-card-body-color": typography.cardBody.color,

    // Telemetry numeric typography
    "--ss-ty-metric-value-size": `${typography.metricValue.sizePx}px`,
    "--ss-ty-metric-value-size-sm": `${typography.metricValue.sizePxSm}px`,
    "--ss-ty-metric-value-weight": `${typography.metricValue.weight}`,
    "--ss-ty-metric-value-line-height": `${typography.metricValue.lineHeight}`,
    "--ss-ty-metric-value-tracking": `${typography.metricValue.trackingEm}em`,
    "--ss-ty-metric-value-color": typography.metricValue.color,

    "--ss-ty-metric-subvalue-size": `${typography.metricSubValue.sizePx}px`,
    "--ss-ty-metric-subvalue-size-sm": `${typography.metricSubValue.sizePxSm}px`,
    "--ss-ty-metric-subvalue-weight": `${typography.metricSubValue.weight}`,
    "--ss-ty-metric-subvalue-line-height": `${typography.metricSubValue.lineHeight}`,
    "--ss-ty-metric-subvalue-tracking": `${typography.metricSubValue.trackingEm}em`,
    "--ss-ty-metric-subvalue-color": typography.metricSubValue.color,

    "--ss-ty-metric-label-size": `${typography.metricLabel.sizePx}px`,
    "--ss-ty-metric-label-letter-spacing": `${typography.metricLabel.letterSpacingEm}em`,
    "--ss-ty-metric-label-color": typography.metricLabel.color,
    "--ss-ty-metric-label-weight": `${typography.metricLabel.weight}`,
    "--ss-ty-metric-label-line-height": `${typography.metricLabel.lineHeight}`,
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
