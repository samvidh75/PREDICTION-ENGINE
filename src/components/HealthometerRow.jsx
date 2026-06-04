import React, { useState, useEffect } from 'react';

/**
 * HealthometerRow — Tabular Asset Line Layout Item
 *
 * Individual row in the Healthometer scanner list.
 * Renders a lock-card row with asset identifier, exchange badge,
 * market cap, core ratio metrics, and health status badge.
 *
 * Props:
 *   id              — unique entity identifier
 *   ticker          — stock symbol string
 *   companyName     — full company name
 *   exchange        — exchange segment (NSE / BSE / SME)
 *   marketCapCr     — market cap in crores
 *   healthStatus    — VERY HEALTHY | HEALTHY | STABLE | WEAKENING | UNHEALTHY
 *   peRatio         — price-to-earnings ratio
 *   debtToEquity    — debt-to-equity ratio
 *   roe             — return on equity percentage
 *   promoterHolding — promoter holding percentage
 *   staggerIndex    — ordinal position for cascade delay
 *   onClick         — optional callback (id) => void
 */

const HEALTH_DICTIONARY = ['VERY HEALTHY', 'HEALTHY', 'STABLE', 'WEAKENING', 'UNHEALTHY'];

const evaluateHealth = (status) => {
  const upper = (status || '').toUpperCase().trim();
  return HEALTH_DICTIONARY.includes(upper) ? upper : 'STABLE';
};

const getHealthBadgeClasses = (status) => {
  switch (status) {
    case 'VERY HEALTHY':
      return 'text-[#06B6D4] bg-[#06B6D4]/5 border-[#06B6D4]/15';
    case 'HEALTHY':
      return 'text-[#06B6D4] bg-[#06B6D4]/5 border-[#06B6D4]/10';
    case 'STABLE':
      return 'text-[#525252] bg-neutral-50 border-neutral-200';
    case 'WEAKENING':
      return 'text-[#D946EF] bg-[#D946EF]/5 border-[#D946EF]/15';
    case 'UNHEALTHY':
      return 'text-[#D946EF] bg-[#D946EF]/5 border-[#D946EF]/10';
    default:
      return 'text-[#525252] bg-neutral-50 border-neutral-200';
  }
};

const getExchangeBadgeClasses = (exchange) => {
  switch (exchange) {
    case 'NSE':
      return 'text-[#06B6D4] border-[#06B6D4]/20 bg-[#06B6D4]/5';
    case 'BSE':
      return 'text-[#525252] border-neutral-200 bg-neutral-50';
    case 'SME':
      return 'text-[#D946EF] border-[#D946EF]/20 bg-[#D946EF]/5';
    default:
      return 'text-[#525252] border-neutral-200 bg-neutral-50';
  }
};

const formatMarketCap = (crores) => {
  if (crores >= 100000) return `₹${(crores / 100000).toFixed(1)}L Cr`;
  if (crores >= 1000) return `₹${(crores / 1000).toFixed(1)}K Cr`;
  return `₹${crores.toLocaleString('en-IN')} Cr`;
};

const HealthometerRow = ({
  id,
  ticker,
  companyName,
  exchange = 'NSE',
  marketCapCr = 0,
  healthStatus = 'STABLE',
  peRatio = null,
  debtToEquity = null,
  roe = null,
  promoterHolding = null,
  staggerIndex = 0,
  onClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const delay = 60 + staggerIndex * 40;
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [staggerIndex]);

  const validatedHealth = evaluateHealth(healthStatus);
  const healthClasses = getHealthBadgeClasses(validatedHealth);
  const exchangeClasses = getExchangeBadgeClasses(exchange);
  const isCyanHealth = validatedHealth === 'VERY HEALTHY' || validatedHealth === 'HEALTHY';
  const isMagentaHealth = validatedHealth === 'WEAKENING' || validatedHealth === 'UNHEALTHY';

  const handleClick = () => {
    if (onClick) onClick(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${ticker} — ${companyName} — ${validatedHealth}`}
      className={`
        w-full bg-white border border-[#E5E5E5] rounded-none
        px-6 py-4 min-h-[48px]
        flex items-center justify-between
        transition-all duration-500 ease-out
        hover:-translate-y-0.5
        hover:shadow-[0_6px_20px_rgba(0,0,0,0.02)]
        active:scale-[0.998]
        cursor-pointer select-none
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
      `}
    >
      {/* Left: Asset Identifier Block */}
      <div className="flex items-center space-x-4 min-w-0 flex-shrink-0">
        {/* Ticker + Name */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[13px] font-bold text-[#0A0A0A] tracking-tight">
              {ticker}
            </span>
            <span className={`
              text-[8px] font-mono font-bold tracking-widest uppercase
              px-1.5 py-0.5 border ${exchangeClasses}
            `}>
              {exchange}
            </span>
          </div>
          <span className="text-[10px] text-[#737373] truncate max-w-[180px] mt-0.5">
            {companyName}
          </span>
        </div>
      </div>

      {/* Center: Core Metrics Grid (hidden on mobile) */}
      <div className="hidden md:flex items-center space-x-6 text-center">
        {/* Market Cap */}
        <div className="flex flex-col items-center w-20">
          <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider uppercase">
            M.CAP
          </span>
          <span className="text-[12px] font-mono font-semibold text-[#0A0A0A]">
            {formatMarketCap(marketCapCr)}
          </span>
        </div>

        {/* P/E Ratio */}
        <div className="flex flex-col items-center w-14">
          <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider uppercase">
            P/E
          </span>
          <span className="text-[12px] font-mono font-semibold text-[#0A0A0A]">
            {peRatio !== null ? peRatio.toFixed(1) : '—'}
          </span>
        </div>

        {/* D/E Ratio */}
        <div className="flex flex-col items-center w-14">
          <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider uppercase">
            D/E
          </span>
          <span className={`text-[12px] font-mono font-semibold ${
            debtToEquity !== null && debtToEquity > 1.5 ? 'text-[#D946EF]' : 'text-[#0A0A0A]'
          }`}>
            {debtToEquity !== null ? debtToEquity.toFixed(2) : '—'}
          </span>
        </div>

        {/* ROE */}
        <div className="flex flex-col items-center w-14">
          <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider uppercase">
            ROE
          </span>
          <span className={`text-[12px] font-mono font-semibold ${
            roe !== null && roe > 15 ? 'text-[#06B6D4]' : 'text-[#0A0A0A]'
          }`}>
            {roe !== null ? `${roe.toFixed(1)}%` : '—'}
          </span>
        </div>

        {/* Promoter Holding */}
        <div className="flex flex-col items-center w-16">
          <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider uppercase">
            PROMOTER
          </span>
          <span className="text-[12px] font-mono font-semibold text-[#0A0A0A]">
            {promoterHolding !== null ? `${promoterHolding.toFixed(1)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Right: Health Status Badge */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Health dot indicator */}
        <span className={`
          w-2 h-2 rounded-full
          ${isCyanHealth ? 'bg-[#06B6D4]' : ''}
          ${isMagentaHealth ? 'bg-[#D946EF]' : ''}
          ${!isCyanHealth && !isMagentaHealth ? 'bg-[#A3A3A3]' : ''}
          ${isCyanHealth || isMagentaHealth ? 'animate-pulse' : ''}
        `} />

        <span className={`
          inline-flex items-center
          px-2.5 py-1
          text-[9px] font-mono font-bold
          tracking-widest uppercase
          border ${healthClasses}
        `}>
          {validatedHealth}
        </span>
      </div>
    </div>
  );
};

export default HealthometerRow;
