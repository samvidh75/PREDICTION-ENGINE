import React from "react";

export default function HiddenGridOverlay(): JSX.Element {
  // Cinematic grid: 12 columns feel via vertical lines; 24px baseline via horizontal lines.
  // Kept extremely subtle to avoid “website-like” patterning.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.25]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px, 80px 80px",
        maskImage: "radial-gradient(circle at 45% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 78%)",
        WebkitMaskImage: "radial-gradient(circle at 45% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0) 78%)",
      }}
    />
  );
}
