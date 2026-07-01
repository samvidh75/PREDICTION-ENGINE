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
        <linearGradient id={strokeId} x1="18" y1="15" x2="47" y2="48" gradientUnits="userSpaceOnUse">
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

      <path
        d="M23.8 22.6C23.8 19.6 26.2 17.2 29.2 17.2H37.4C40.2 17.2 42.4 19.4 42.4 22.2C42.4 24.6 40.8 26.5 38.6 27.3L31.6 30.1C28.8 31.2 27 33.6 27 36.6C27 40.1 29.8 42.9 33.3 42.9H40.2"
        stroke={`url(#${strokeId})`}
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22.2 20.8L46.8 45.6" stroke={`url(#${strokeId})`} strokeWidth="4.15" strokeLinecap="round" opacity="1" />
      <path d="M43.9 17.6L23.4 41.6" stroke={`url(#${strokeId})`} strokeWidth="4.15" strokeLinecap="round" opacity="1" />
      <path d="M22.8 20.8H35.8C39.4 20.8 42.2 23.6 42.2 27.2" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="44.9" cy="21.1" r="3.7" fill="#2F80FF" />
      <circle cx="44.9" cy="21.1" r="1.15" fill="#FFFFFF" opacity="0.98" />
    </svg>
  );
}
