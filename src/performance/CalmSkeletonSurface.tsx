import React from "react";

type Props = {
  /**
   * fixed height in px or tailwind class could be passed via className
   */
  heightPx?: number;

  className?: string;

  /**
   * optional label for screen readers only
   */
  ariaLabel?: string;
};

export default function CalmSkeletonSurface({
  heightPx = 280,
  className = "",
  ariaLabel = "Loading placeholder",
}: Props): JSX.Element {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={[
        "relative overflow-hidden rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-[20px]",
        className,
      ].join(" ")}
      style={{ height: heightPx }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            `linear-gradient(90deg, ${colors.hairlineSoft} 0%, ${colors.hairlineStrong} 50%, ${colors.hairlineSoft} 100%)`,
          transform: "translateX(-100%)",
          animation: "ss_skeleton_shimmer 1.25s ease-in-out infinite",
        }}
      />
      <style>
        {`
          @keyframes ss_skeleton_shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}
