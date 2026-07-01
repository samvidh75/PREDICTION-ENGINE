import { useId } from "react";
import { radius } from "../design/tokens";

export function BrandMark({ size = 40 }: { size?: number }) {
  const uid = useId();
  const tileId = `${uid}-tile`;
  const tileInnerId = `${uid}-tile-inner`;
  const glowId = `${uid}-glow`;
  const strokeId = `${uid}-stroke`;
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
        <linearGradient id={tileId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#232936" />
          <stop offset="0.46" stopColor="#090B10" />
          <stop offset="1" stopColor="#050608" />
        </linearGradient>
        <linearGradient id={tileInnerId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="0.28" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22 18) rotate(40) scale(34 34)">
          <stop stopColor="#DCE8FF" stopOpacity="0.24" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={strokeId} x1="18" y1="14" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FCFDFF" />
          <stop offset="1" stopColor="#D4E2FF" />
        </linearGradient>
        <filter id={shadowId} x="-12%" y="-12%" width="124%" height="124%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.62" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill={`url(#${tileId})`} stroke="#FFFFFF" strokeOpacity="0.24" />
      </g>
      <rect x="2.5" y="2.5" width="59" height="59" rx="16" fill={`url(#${glowId})`} opacity="0.9" />
      <rect x="5.5" y="5.5" width="53" height="53" rx="14" fill={`url(#${tileInnerId})`} opacity="1" />
      <rect x="9" y="9" width="46" height="46" rx="12" fill="none" stroke="#FFFFFF" strokeOpacity="0.08" />

      <path d="M21.9 19.9C24.3 17.1 28.1 15.6 32.2 15.6H39.1" stroke={`url(#${strokeId})`} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M39.1 15.6V22.4" stroke={`url(#${strokeId})`} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M21.8 42.3L46.1 18.1" stroke={`url(#${strokeId})`} strokeWidth="4.15" strokeLinecap="round" />
      <path d="M22.8 20.6C22.8 18.1 24.9 16 27.4 16H34.6C37.3 16 39.4 18.1 39.4 20.8C39.4 23.1 37.8 24.9 35.7 25.6L29.2 28.1C26.7 29.1 25.1 31.3 25.1 34C25.1 37.1 27.6 39.6 30.7 39.6H39.5" stroke={`url(#${strokeId})`} strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      <circle cx="45" cy="20.1" r="3.8" fill="#2F80FF" />
      <circle cx="45" cy="20.1" r="1.15" fill="#FFFFFF" opacity="0.98" />
    </svg>
  );
}
