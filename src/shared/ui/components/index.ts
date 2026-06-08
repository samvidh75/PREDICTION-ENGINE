/**
 * Shared UI Components barrel.
 * Re-exports all migrated designSystem components.
 */
export { CardHeader, CardBody as CardAnatomyBody, CardTelemetryRow, CardActions, CardFooter } from "./IntelligenceCardAnatomy";
export { default as IntelligenceCardAnatomy } from "./IntelligenceCardAnatomy";

export { default as PremiumCard } from "./PremiumCard";
export type { PremiumCardVariant, PremiumCardProps } from "./PremiumCard";

export { ModuleKicker, ModuleTitle, NavLabel, WidgetSupport, MetricValue, MetricSubValue, MetricLabel } from "./PremiumTypography";

export { default as ProgressiveDisclosure } from "./ProgressiveDisclosure";
export type { ProgressiveDisclosureStep } from "./ProgressiveDisclosure";

export { default as SpatialFrame } from "./SpatialFrame";
export { getSpatialFrameClassNames } from "./SpatialFrame";
export type { SpatialFrameVariant } from "./SpatialFrame";

export { default as SpatialHierarchyEngine } from "./SpatialHierarchyEngine";
export type { SpatialSplit, SpatialAlign } from "./SpatialHierarchyEngine";

export { HeroKicker, HeroTitle, SectionTitle, MicroLabel, BodyText, CardLabel, CardHeading, CardBody } from "./TypographyIntelligence";
export { sanitizeTypographyNode } from "./typography/typographyLanguageGovernance";
export type { TypographySanitizationKind } from "./typography/typographyLanguageGovernance";

// Theme engine
export { ThemeCoordinator } from "./theme/ThemeCoordinator";
export { MarketMoodEngine } from "./theme/MarketMoodEngine";
export type { MarketMood } from "./theme/MarketMoodEngine";
export { MarketMoodThemeMapper } from "./theme/MarketMoodThemeMapper";
export { GlowCoordinator } from "./theme/GlowCoordinator";
export { SurfaceCoordinator } from "./theme/SurfaceCoordinator";
export { COLOUR_TOKENS } from "./theme/ColourTokenRegistry";
