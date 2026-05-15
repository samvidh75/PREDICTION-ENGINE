import React, { useMemo } from "react";

export type PremiumCardVariant =
  | "hero"
  | "intelligence"
  | "chart"
  | "scanner"
  | "pulse"
  | "ai"
  | "infographic"
  | "macro"
  | "glass"
  | "glass2";

export type PremiumCardProps = {
  variant?: PremiumCardVariant;
  glow?: string; // rgba string (optional)
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  onClick?: () => void;
  role?: React.AriaRole;
};

function variantDefaults(variant: PremiumCardVariant | undefined): {
  baseClass: string;
  radiusClass: string;
  paddingClass: string;
  extraClass: string;
} {
  switch (variant) {
    case "hero":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[32px]", paddingClass: "p-6", extraClass: "overflow-hidden" };
    case "intelligence":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-6", extraClass: "" };
    case "chart":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-5", extraClass: "overflow-hidden" };
    case "scanner":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-5", extraClass: "overflow-hidden" };
    case "pulse":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-5", extraClass: "" };
    case "ai":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-6", extraClass: "overflow-hidden" };
    case "infographic":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-6", extraClass: "" };
    case "macro":
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[28px]", paddingClass: "p-6", extraClass: "" };
    case "glass":
      return { baseClass: "ss-glass", radiusClass: "rounded-[28px]", paddingClass: "p-6", extraClass: "" };
    case "glass2":
    default:
      return { baseClass: "ss-glass-2", radiusClass: "rounded-[22px]", paddingClass: "p-6", extraClass: "" };
  }
}

export default function PremiumCard(props: PremiumCardProps): JSX.Element {
  const { variant = "glass2", glow, className, children, ariaLabel, onClick, role } = props;

  const computed = useMemo(() => {
    const d = variantDefaults(variant);

    // Keep effects restrained; readability first.
    const glowStyle =
      glow && glow.trim().length
        ? {
            boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 0 120px ${glow}`,
          }
        : undefined;

    return { d, glowStyle };
  }, [variant, glow]);

  const clickable = typeof onClick === "function";

  const Comp: keyof JSX.IntrinsicElements = clickable ? "button" : "div";

  const commonProps = {
    className: `${computed.d.baseClass} ${computed.d.radiusClass} ${computed.d.paddingClass} ${computed.d.extraClass} ${
      clickable ? "text-left ss-focus-outline cursor-pointer" : ""
    } ${className ?? ""}`.trim(),
    style: computed.glowStyle,
    "aria-label": ariaLabel,
    role,
    onClick: onClick as unknown as (() => void) | undefined,
  };

  if (clickable) {
    // eslint-disable-next-line jsx-a11y/aria-props
    return <Comp type="button" {...(commonProps as Record<string, unknown>)}>{children}</Comp>;
  }

  return <Comp {...(commonProps as Record<string, unknown>)}>{children}</Comp>;
}
