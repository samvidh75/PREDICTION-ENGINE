import type { ReactNode } from "react";
import type { ProductLanguageFilterLevel } from "../../lib/compliance/productLanguageCopyFilter";
import { applyComplianceCopyFilter } from "../../lib/compliance/complianceCopyFilter";
import { applyProductLanguageCopyFilter } from "../../lib/compliance/productLanguageCopyFilter";

export type TypographySanitizationKind =
  | "heroKicker"
  | "sectionTitle"
  | "microLabel"
  | "bodyText"
  | "cardLabel"
  | "cardHeading"
  | "cardBody"
  | "navLabel"
  | "moduleKicker"
  | "moduleTitle"
  | "widgetSupport"
  | "metricValue"
  | "metricSubValue"
  | "metricLabel";

type KindConfig = {
  filterLevel: ProductLanguageFilterLevel;
  shouldTrim: boolean;
};

// Production governance: keep emotional-professional tone (“gentle”) for UI copy where it matters.
// IMPORTANT: Keep edits conservative (handled by applyProductLanguageCopyFilter).
const KIND_CONFIG: Record<TypographySanitizationKind, KindConfig> = {
  heroKicker: { filterLevel: "gentle", shouldTrim: true },
  sectionTitle: { filterLevel: "gentle", shouldTrim: true },
  microLabel: { filterLevel: "gentle", shouldTrim: true },
  bodyText: { filterLevel: "gentle", shouldTrim: false },

  cardLabel: { filterLevel: "gentle", shouldTrim: true },
  cardHeading: { filterLevel: "gentle", shouldTrim: true },
  cardBody: { filterLevel: "gentle", shouldTrim: false },

  navLabel: { filterLevel: "gentle", shouldTrim: true },

  moduleKicker: { filterLevel: "gentle", shouldTrim: true },

  moduleTitle: { filterLevel: "gentle", shouldTrim: true },
  widgetSupport: { filterLevel: "gentle", shouldTrim: true },

  metricValue: { filterLevel: "gentle", shouldTrim: true },
  metricSubValue: { filterLevel: "gentle", shouldTrim: true },
  metricLabel: { filterLevel: "gentle", shouldTrim: true },
};

function sanitizeString(input: string, kind: TypographySanitizationKind): string {
  const cfg = KIND_CONFIG[kind];

  const compliance = applyComplianceCopyFilter(input, "educational");
  const product = applyProductLanguageCopyFilter(compliance, cfg.filterLevel);

  return cfg.shouldTrim ? product.trim() : product;
}

export function sanitizeTypographyNode(children: ReactNode, kind: TypographySanitizationKind): ReactNode {
  if (typeof children !== "string") return children;
  return sanitizeString(children, kind);
}
