import { useId } from "react";
import { colors, radius } from "../design/tokens";

export function BrandMark({ size = 40 }: { size?: number }) {
  const uid = useId();
  const stroke = Math.max(1.8, Math.round(size * 0.052));
  const fine = Math.max(1.15, Math.round(size * 0.034));
  const tileId = `${uid}-tile`;
  const glowId = `${uid}-glow`;
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
        <linearGradient id={tileId} x1="12" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1A1A1A" />
          <stop offset="1" stopColor="#070707" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(22 18) rotate(42) scale(30 30)">
          <stop stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect x="1.5" y="1.5" width="61" height="61" rx="15" fill={`url(#${tileId})`} stroke={colors.hairline} />
      </g>
      <rect x="2.5" y="2.5" width="59" height="59" rx="14" fill={`url(#${glowId})`} opacity="0.72" />

      <path
        d="M18 16.5H28.6C31.9 16.5 34.6 19.1 34.6 22.4C34.6 25.3 32.7 27.6 29.9 28.3L34.6 38.4H29.8L25.6 29.3H22.1V38.4H18V16.5Z"
        fill="none"
        stroke={colors.onDark}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 16.5V38.4" stroke={colors.onDark} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M18 16.5H31.2" stroke={colors.onDark} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M18 27.4H30.2" stroke={colors.onDark} strokeWidth={stroke} strokeLinecap="round" />
      <path d="M18 38.4H29.9" stroke={colors.onDark} strokeWidth={stroke} strokeLinecap="round" />

      <circle cx="39.1" cy="30" r="9.5" stroke={colors.onDark} strokeWidth={fine} />
      <path d="M33.6 30.1C35.1 27.2 37.6 25.5 40.8 25.5C44.5 25.5 47.4 28.1 48.2 31.5" stroke={colors.onDark} strokeWidth={fine} strokeLinecap="round" opacity="0.9" />
      <circle cx="46.8" cy="23.4" r="2.9" fill={colors.primary} />
      <circle cx="46.8" cy="23.4" r="1.15" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}
