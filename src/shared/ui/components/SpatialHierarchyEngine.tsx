import React from "react";

export type SpatialSplit = "balanced" | "hero" | "editorial";
export type SpatialAlign = "start" | "center";

type SpatialHierarchyEngineProps = {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  supporting?: React.ReactNode;

  /**
   * Controls column split only for >= lg screens.
   * Mobile/tablet always stack vertically.
   */
  split?: SpatialSplit;

  align?: SpatialAlign;
  gapClassName?: string;
  className?: string;

  /**
   * Optional debug label to help enforce “primary/secondary/support” discipline.
   * Adds `data-ss-hierarchy`.
   */
  debugLabel?: string;
};

function splitClasses(split: SpatialSplit | undefined): { primary: string; secondary: string } {
  switch (split) {
    case "hero":
      return { primary: "lg:col-span-7", secondary: "lg:col-span-5" };
    case "editorial":
      return { primary: "lg:col-span-8", secondary: "lg:col-span-4" };
    case "balanced":
    default:
      return { primary: "lg:col-span-6", secondary: "lg:col-span-6" };
  }
}

function alignClass(align: SpatialAlign | undefined): string {
  return align === "center" ? "items-center" : "items-start";
}

/**
 * Spatial Hierarchy Engine (foundation primitive)
 * - Enforces: primary focus, secondary focus, supporting intelligence, background context (optional via caller).
 * - Arranges zones spatially with a consistent 12-col grid.
 * - DOES NOT apply background/atmosphere; screens own the atmosphere layer order.
 */
export default function SpatialHierarchyEngine({
  primary,
  secondary,
  supporting,
  split = "balanced",
  align = "start",
  gapClassName = "gap-6",
  className,
  debugLabel,
}: SpatialHierarchyEngineProps): JSX.Element {
  const { primary: primaryCol, secondary: secondaryCol } = splitClasses(split);

  return (
    <div
      className={["grid grid-cols-1 lg:grid-cols-12", gapClassName, alignClass(align), className ?? ""].join(" ").trim()}
      data-ss-hierarchy={debugLabel ?? undefined}
    >
      <div className={[primaryCol, "min-w-0"].join(" ")} data-ss-zone="primary">
        {primary}
      </div>

      {secondary !== undefined && (
        <div className={[secondaryCol, "min-w-0"].join(" ")} data-ss-zone="secondary">
          {secondary}
        </div>
      )}

      {supporting !== undefined && (
        <div className={["lg:col-span-12", "mt-6"].join(" ")} data-ss-zone="supporting">
          {supporting}
        </div>
      )}
    </div>
  );
}
