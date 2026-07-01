import { useId } from "react";
import { colors, radius } from "../design/tokens";

export function BrandMark({ size = 40 }: { size?: number }) {
  const uid = useId();
  const tileId = `${uid}-tile`;
  const tileInnerId = `${uid}-tile-inner`;
  const glowId = `${uid}-glow`;
  const xId = `${uid}-x`;
  const shadowId = `${uid}-shadow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flex: "0 0 auto", borderRadius: radius.lg }}
    >
      <defs>
        <linearGradient id={tileId} x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#161B23" />
          <stop offset="0.45" stopColor="#090B10" />
          <stop offset="1" stopColor="#050608" />
        </linearGradient>
        <linearGradient id={tileInnerId} x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.10" />
          <stop offset="0.32" stopColor="#FFFFFF" stopOpacity="0.02" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22 18) rotate(40) scale(34 34)">
          <stop stopColor="#DCE8FF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={xId} x1="17" y1="16" x2="49" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#ECF4FF" />
          <stop offset="1" stopColor="#C4D8FF" />
        </linearGradient>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4.5" floodColor="#000000" floodOpacity="0.52" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill={`url(#${tileId})`} stroke="#FFFFFF" strokeOpacity="0.18" />
      </g>
      <rect x="2.5" y="2.5" width="59" height="59" rx="16" fill={`url(#${glowId})`} opacity="0.72" />
      <rect x="5.5" y="5.5" width="53" height="53" rx="14" fill="none" stroke={colors.hairline} strokeOpacity="0.55" />
      <rect x="9" y="9" width="46" height="46" rx="12" fill={`url(#${tileInnerId})`} opacity="0.6" />

      <path d="M18 18L46 46" stroke={`url(#${xId})`} strokeWidth="4.8" strokeLinecap="round" />
      <path d="M46 18L18 46" stroke={`url(#${xId})`} strokeWidth="4.8" strokeLinecap="round" />
      <path d="M20.5 18.8H39.2C42.7 18.8 45.5 21.6 45.5 25.1" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="44" cy="22.3" r="3.4" fill={colors.primary} />
      <circle cx="44" cy="22.3" r="1.15" fill="#FFFFFF" opacity="0.98" />
    </svg>
  );
}
