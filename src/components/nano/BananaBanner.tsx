/**
 * BananaBanner — premium visual band backed by a real Nano Banana asset.
 *
 * Renders a generated image (from public/assets/nano-banana/) as a full-bleed
 * cover background. If the asset file isn't present yet (or fails to load), it
 * gracefully falls back to a rich CSS gradient so the page still looks
 * deliberate — never a broken image icon.
 *
 * Anti-fabrication note: this component never pretends an asset exists. If the
 * source image is missing it shows the gradient fallback, and the /about
 * data-notes in the page can disclose it as "artwork placeholder" until a real
 * Nano Banana asset is generated via the bundled MCP tool.
 */

import { useEffect, useState } from "react";

export type BananaBannerProps = {
  /** Public path to the generated asset, e.g. /assets/nano-banana/hero.png */
  src?: string;
  alt?: string;
  /** Minimum height in px (default 300). */
  minHeight?: number;
  /** 0–1 dark overlay for text legibility (default 0.45). */
  overlay?: number;
  /** Corner radius in px (default 20). */
  radius?: number;
  /** CSS gradient used when the asset is missing/unavailable. */
  fallbackGradient?: string;
  className?: string;
  children?: React.ReactNode;
};

const DEFAULT_FALLBACK =
  "radial-gradient(1200px 500px at 15% -10%, rgba(26,127,55,0.28), transparent 60%)," +
  "radial-gradient(900px 420px at 90% 10%, rgba(138,90,18,0.20), transparent 55%)," +
  "linear-gradient(135deg, #0A0A0A 0%, #16202B 52%, #0A0A0A 100%)";

export function BananaBanner({
  src,
  alt = "StockEX research artwork",
  minHeight = 300,
  overlay = 0.45,
  radius = 20,
  fallbackGradient = DEFAULT_FALLBACK,
  className,
  children,
}: BananaBannerProps) {
  const [state, setState] = useState<"loading" | "ok" | "missing">(src ? "loading" : "missing");

  useEffect(() => {
    if (!src) { setState("missing"); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setState("ok"); };
    img.onerror = () => { if (!cancelled) setState("missing"); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  const showImage = state === "ok";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        minHeight,
        borderRadius: radius,
        overflow: "hidden",
        background: fallbackGradient,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      {/* Real generated asset layer */}
      {showImage && (
        <img
          src={src}
          alt={alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Legibility scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: showImage ? `rgba(6,8,12,${overlay})` : "transparent",
        }}
      />

      {/* Foreground content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          padding: 28,
          color: "#F7F8FA",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default BananaBanner;
