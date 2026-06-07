import React from "react";
import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;

  /**
   * Simple preset for hierarchy.
   */
  variant?: "neutral" | "accent";
};

export default function SSPill({ children, className, variant = "neutral" }: Props): JSX.Element {
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] ss-focus-outline",
        variant === "accent"
          ? "border-white/16 bg-black/20 text-white/90 hover:text-white/95"
          : "border-white/10 bg-black/30 text-white/70 hover:text-white/90",
        className,
      )}
    >
      {children}
    </span>
  );
}
