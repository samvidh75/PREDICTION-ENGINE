import React, { useState, useCallback } from 'react';

/**
 * ScreenerSidebar — Filter Selector Engine Rail
 *
 * Left-column screener control panel for the Analysis Engine.
 * Renders filter groups for Sector, Exchange (NSE/BSE/SME),
 * Market Cap Class, and Core Ratio thresholds.
 *
 * Props:
 *   filters         — current filter state object
 *   onFilterChange  — callback (updatedFilters) => void
 */

// ─── Static Filter Definitions ──────────────────────────────────────────────
const SECTOR_OPTIONS = [
  'All Sectors',
  'Banking & Finance',
  'Information Technology',
  'Pharmaceuticals',
  'Automobiles',
  'FMCG',
  'Energy & Oil',
  'Metals & Mining',
  'Infrastructure',
  'Chemicals',
  'Telecom',
  'Real Estate',
  'Defence',
  'Textiles',
];

const EXCHANGE_OPTIONS = [
  { id: 'ALL', label: 'All Exchanges' },
  { id: 'NSE', label: 'NSE' },
  { id: 'BSE', label: 'BSE' },
  { id: 'SME', label: 'SME' },
];

const MARKET_CAP_OPTIONS = [
  { id: 'ALL', label: 'All Caps' },
  { id: 'LARGE', label: 'Large Cap (₹20,000 Cr+)' },
  { id: 'MID', label: 'Mid Cap (₹5,000–20,000 Cr)' },
  { id: 'SMALL', label: 'Small Cap (₹500–5,000 Cr)' },
  { id: 'MICRO', label: 'Micro Cap (< ₹500 Cr)' },
];

const HEALTH_FILTER_OPTIONS = [
  { id: 'ALL', label: 'All Health States' },
  { id: 'VERY HEALTHY', label: 'Very Healthy' },
  { id: 'HEALTHY', label: 'Healthy' },
  { id: 'STABLE', label: 'Stable' },
  { id: 'WEAKENING', label: 'Weakening' },
  { id: 'UNHEALTHY', label: 'Unhealthy' },
];

const SORT_OPTIONS = [
  { id: 'MARKET_CAP_DESC', label: 'Market Cap ↓' },
  { id: 'MARKET_CAP_ASC', label: 'Market Cap ↑' },
  { id: 'HEALTH_BEST', label: 'Healthiest First' },
  { id: 'HEALTH_WORST', label: 'Weakest First' },
  { id: 'PE_ASC', label: 'P/E Ratio ↑' },
  { id: 'PE_DESC', label: 'P/E Ratio ↓' },
];

// ─── Filter Group Sub-Component ─────────────────────────────────────────────
const FilterGroup = ({ label, children }) => (
  <div className="flex flex-col space-y-2.5">
    <span className="text-[10px] font-mono font-semibold tracking-[0.14em] text-[#525252] uppercase">
      {label}
    </span>
    {children}
  </div>
);

const SelectFilter = ({ value, options, onChange, idKey = 'id', labelKey = 'label' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="
      w-full h-10 min-h-[48px] px-3
      bg-[#FAFAFA] border border-[#E5E5E5]
      text-[12px] text-[#0A0A0A] font-medium
      rounded-none appearance-none
      focus:outline-none focus:border-[#06B6D4]
      transition-colors duration-200
      cursor-pointer
    "
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
    }}
  >
    {options.map((opt) => {
      const id = typeof opt === 'string' ? opt : opt[idKey];
      const label = typeof opt === 'string' ? opt : opt[labelKey];
      return (
        <option key={id} value={id}>
          {label}
        </option>
      );
    })}
  </select>
);

// ─── Component ───────────────────────────────────────────────────────────────
const ScreenerSidebar = ({ filters = {}, onFilterChange }) => {
  const currentFilters = {
    sector: filters.sector || 'All Sectors',
    exchange: filters.exchange || 'ALL',
    marketCap: filters.marketCap || 'ALL',
    healthState: filters.healthState || 'ALL',
    sortBy: filters.sortBy || 'MARKET_CAP_DESC',
    ...filters,
  };

  const updateFilter = useCallback(
    (key, value) => {
      if (onFilterChange) {
        onFilterChange({ ...currentFilters, [key]: value });
      }
    },
    [currentFilters, onFilterChange]
  );

  const resetFilters = useCallback(() => {
    if (onFilterChange) {
      onFilterChange({
        sector: 'All Sectors',
        exchange: 'ALL',
        marketCap: 'ALL',
        healthState: 'ALL',
        sortBy: 'MARKET_CAP_DESC',
      });
    }
  }, [onFilterChange]);

  const hasActiveFilters =
    currentFilters.sector !== 'All Sectors' ||
    currentFilters.exchange !== 'ALL' ||
    currentFilters.marketCap !== 'ALL' ||
    currentFilters.healthState !== 'ALL';

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-none p-6 flex flex-col space-y-6 select-none
                    bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.012),transparent_80%)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-[#06B6D4]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-[12px] font-semibold text-[#0A0A0A] uppercase tracking-wider">
            Screener Filters
          </span>
        </div>
        <span className="text-[9px] font-mono text-[#A3A3A3] tracking-wider">
          DIAGNOSTIC
        </span>
      </div>

      {/* Sector Filter */}
      <FilterGroup label="SECTOR">
        <SelectFilter
          value={currentFilters.sector}
          options={SECTOR_OPTIONS}
          onChange={(v) => updateFilter('sector', v)}
        />
      </FilterGroup>

      {/* Exchange Filter */}
      <FilterGroup label="EXCHANGE SEGMENT">
        <div className="grid grid-cols-2 gap-1.5">
          {EXCHANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => updateFilter('exchange', opt.id)}
              className={`
                min-h-[40px] px-3 py-2
                text-[10px] font-mono font-bold tracking-wider uppercase
                border transition-all duration-200 ease-out
                active:scale-[0.96]
                ${currentFilters.exchange === opt.id
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#525252] border-[#E5E5E5] hover:bg-[#FAFAFA]'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      {/* Market Cap Filter */}
      <FilterGroup label="MARKET CAP CLASS">
        <SelectFilter
          value={currentFilters.marketCap}
          options={MARKET_CAP_OPTIONS}
          onChange={(v) => updateFilter('marketCap', v)}
        />
      </FilterGroup>

      {/* Health State Filter */}
      <FilterGroup label="HEALTH STATUS">
        <SelectFilter
          value={currentFilters.healthState}
          options={HEALTH_FILTER_OPTIONS}
          onChange={(v) => updateFilter('healthState', v)}
        />
      </FilterGroup>

      {/* Sort Order */}
      <FilterGroup label="SORT ORDER">
        <SelectFilter
          value={currentFilters.sortBy}
          options={SORT_OPTIONS}
          onChange={(v) => updateFilter('sortBy', v)}
        />
      </FilterGroup>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="
            w-full min-h-[48px] px-4 py-2.5
            text-[10px] font-mono font-bold tracking-[0.12em] uppercase
            border border-[#E5E5E5] text-[#737373]
            hover:bg-[#FAFAFA] hover:text-[#0A0A0A]
            active:scale-[0.97]
            transition-all duration-200 ease-out
          "
        >
          RESET ALL FILTERS
        </button>
      )}

      {/* Compliance Footer */}
      <div className="pt-3 border-t border-[#E5E5E5]">
        <p className="text-[9px] font-mono text-[#A3A3A3] leading-relaxed tracking-wide text-center uppercase">
          SCREENING PARAMETERS ARE DIAGNOSTIC ONLY — NO INVESTMENT ADVICE GENERATED
        </p>
      </div>
    </div>
  );
};

export default ScreenerSidebar;
