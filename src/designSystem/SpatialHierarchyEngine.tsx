import React from "react";
import { spacing } from "../styles";

export type SpatialSplit = "balanced" | "hero" | "editorial";
export type SpatialAlign = "start" | "center";

export type SpacingKey = keyof typeof spacing;

type SpatialHierarchyEngineProps = {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  supporting?: React.ReactNode;

  split?: SpatialSplit;
  align?: SpatialAlign;

  /** Key into spacing object. Default: "lg" (24px). */
  gap?: SpacingKey;

  className?: string;

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

export default function SpatialHierarchyEngine({
  primary,
  secondary,
  supporting,
  split = "balanced",
  align = "start",
  gap = "lg",
  className,
  debugLabel,
}: SpatialHierarchyEngineProps): JSX.Element {
  const { primary: primaryCol, secondary: secondaryCol } = splitClasses(split);

  return (
    <div
      className={["grid grid-cols-1 lg:grid-cols-12", alignClass(align), className ?? ""].join(" ").trim()}
      style={{ gap: spacing[gap] }}
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
        <div className="lg:col-span-12" style={{ marginTop: spacing.lg }} data-ss-zone="supporting">
          {supporting}
        </div>
      )}
    </div>
  );
}
