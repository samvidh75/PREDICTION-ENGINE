import React from 'react';

/**
 * ScreenerMetricsCard — Volumetric Summary Tracker Card
 *
 * Displays an aggregate statistical metric in a premium lock-card
 * with optional trend indicator and secondary label.
 *
 * Props:
 *   label          — metric title (e.g. "TOTAL ASSETS SCANNED")
 *   value          — primary display value (e.g. "1,247")
 *   secondaryLabel — optional subtitle (e.g. "Across NSE, BSE, SME")
 *   trend          — optional "up" | "down" | "neutral"
 *   trendValue     — optional trend delta string (e.g. "+12.4%")
 *   accentColor    — "cyan" | "magenta" | "neutral" (defaults to "cyan")
 *   icon           — optional SVG element
 */

const ScreenerMetricsCard = ({
  label = '',
  value = '—',
  secondaryLabel = '',
  trend = 'neutral',
  trendValue = '',
  accentColor = 'cyan',
  icon = null,
}) => {
  const accentMap = {
    cyan: {
      dot: 'bg-[#06B6D4]',
      text: 'text-[#06B6D4]',
      gradient: 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.02),transparent_70%)]',
    },
    magenta: {
      dot: 'bg-[#D946EF]',
      text: 'text-[#D946EF]',
      gradient: 'bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.02),transparent_70%)]',
    },
    neutral: {
      dot: 'bg-[#A3A3A3]',
      text: 'text-[#525252]',
      gradient: '',
    },
  };

  const accent = accentMap[accentColor] || accentMap.cyan;

  const trendIcon = {
    up: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ),
    down: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    ),
    neutral: null,
  };

  const trendColor = {
    up: 'text-[#06B6D4]',
    down: 'text-[#D946EF]',
    neutral: 'text-[#A3A3A3]',
  };

  return (
    <div className={`
      bg-white border border-[#E5E5E5] rounded-none
      p-5 flex flex-col space-y-3 select-none
      transition-all duration-300 ease-out
      hover:shadow-[0_6px_20px_rgba(0,0,0,0.02)]
      ${accent.gradient}
    `}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && (
            <div className={`${accent.text}`}>
              {icon}
            </div>
          )}
          <span className="text-[10px] font-mono font-semibold tracking-[0.14em] text-[#525252] uppercase">
            {label}
          </span>
        </div>
        <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
      </div>

      {/* Primary Value */}
      <div className="flex items-end space-x-2">
        <span className="text-2xl font-bold text-[#0A0A0A] tracking-tight leading-none font-mono">
          {value}
        </span>
        {trendValue && (
          <div className={`flex items-center space-x-0.5 ${trendColor[trend]}`}>
            {trendIcon[trend]}
            <span className="text-[10px] font-mono font-bold tracking-wider">
              {trendValue}
            </span>
          </div>
        )}
      </div>

      {/* Secondary Label */}
      {secondaryLabel && (
        <span className="text-[10px] text-[#A3A3A3] leading-relaxed">
          {secondaryLabel}
        </span>
      )}
    </div>
  );
};

export default ScreenerMetricsCard;
