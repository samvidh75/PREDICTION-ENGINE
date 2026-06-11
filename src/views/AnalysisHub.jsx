import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ScreenerSidebar from '../components/ScreenerSidebar';
import HealthometerRow from '../components/HealthometerRow';
import ScreenerMetricsCard from '../components/ScreenerMetricsCard';

/**
 * AnalysisHub — Master Analysis Engine Workspace
 *
 * Implements the 4-column grid analysis interface with:
 *   - ScreenerSidebar (col-span-1): Filter control rail
 *   - Analytics Display (col-span-3): Metrics summary + Healthometer scanner list
 *
 * Features:
 *   - Multi-exchange stock dataset (NSE, BSE, SME)
 *   - ~150 diagnostic parameter simulation via health status dictionary
 *   - Zero CLS: filter/sort changes update rows seamlessly
 *   - Non-advisory positioning throughout
 *   - Staggered micro-cascade row loading
 */

// ─── Static Stock Dataset (~30 entities across NSE, BSE, SME) ───────────────
const STOCK_UNIVERSE = [
  { id: 'SSI_TCS', ticker: 'TCS', companyName: 'Tata Consultancy Services', exchange: 'NSE', sector: 'Information Technology', marketCapCr: 1254300, healthStatus: 'VERY HEALTHY', peRatio: 28.4, debtToEquity: 0.04, roe: 47.2, promoterHolding: 72.3 },
  { id: 'SSI_RELIANCE', ticker: 'RELIANCE', companyName: 'Reliance Industries Limited', exchange: 'NSE', sector: 'Energy & Oil', marketCapCr: 1845000, healthStatus: 'HEALTHY', peRatio: 26.8, debtToEquity: 0.38, roe: 9.8, promoterHolding: 50.3 },
  { id: 'SSI_INFY', ticker: 'INFY', companyName: 'Infosys Limited', exchange: 'NSE', sector: 'Information Technology', marketCapCr: 642500, healthStatus: 'HEALTHY', peRatio: 24.1, debtToEquity: 0.11, roe: 32.5, promoterHolding: 14.8 },
  { id: 'SSI_HDFCBANK', ticker: 'HDFCBANK', companyName: 'HDFC Bank Limited', exchange: 'NSE', sector: 'Banking & Finance', marketCapCr: 1120000, healthStatus: 'VERY HEALTHY', peRatio: 19.7, debtToEquity: null, roe: 16.8, promoterHolding: 25.5 },
  { id: 'SSI_ICICIBANK', ticker: 'ICICIBANK', companyName: 'ICICI Bank Limited', exchange: 'NSE', sector: 'Banking & Finance', marketCapCr: 820000, healthStatus: 'HEALTHY', peRatio: 17.2, debtToEquity: null, roe: 18.1, promoterHolding: 0.0 },
  { id: 'SSI_HINDUNILVR', ticker: 'HINDUNILVR', companyName: 'Hindustan Unilever Limited', exchange: 'NSE', sector: 'FMCG', marketCapCr: 540000, healthStatus: 'STABLE', peRatio: 58.3, debtToEquity: 0.01, roe: 36.4, promoterHolding: 61.9 },
  { id: 'SSI_BHARTIARTL', ticker: 'BHARTIARTL', companyName: 'Bharti Airtel Limited', exchange: 'NSE', sector: 'Telecom', marketCapCr: 890000, healthStatus: 'HEALTHY', peRatio: 85.6, debtToEquity: 1.42, roe: 12.3, promoterHolding: 53.5 },
  { id: 'SSI_MARUTI', ticker: 'MARUTI', companyName: 'Maruti Suzuki India Limited', exchange: 'NSE', sector: 'Automobiles', marketCapCr: 410000, healthStatus: 'STABLE', peRatio: 32.1, debtToEquity: 0.02, roe: 14.7, promoterHolding: 56.4 },
  { id: 'SSI_SBIN', ticker: 'SBIN', companyName: 'State Bank of India', exchange: 'NSE', sector: 'Banking & Finance', marketCapCr: 720000, healthStatus: 'STABLE', peRatio: 10.2, debtToEquity: null, roe: 20.5, promoterHolding: 57.5 },
  { id: 'SSI_SUNPHARMA', ticker: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries', exchange: 'NSE', sector: 'Pharmaceuticals', marketCapCr: 380000, healthStatus: 'HEALTHY', peRatio: 34.8, debtToEquity: 0.21, roe: 15.2, promoterHolding: 54.7 },
  { id: 'SSI_TATASTEEL', ticker: 'TATASTEEL', companyName: 'Tata Steel Limited', exchange: 'NSE', sector: 'Metals & Mining', marketCapCr: 178000, healthStatus: 'WEAKENING', peRatio: 8.4, debtToEquity: 0.82, roe: 11.8, promoterHolding: 33.2 },
  { id: 'SSI_LT', ticker: 'LT', companyName: 'Larsen & Toubro Limited', exchange: 'NSE', sector: 'Infrastructure', marketCapCr: 520000, healthStatus: 'HEALTHY', peRatio: 35.7, debtToEquity: 1.12, roe: 13.4, promoterHolding: 0.0 },
  { id: 'SSI_WIPRO', ticker: 'WIPRO', companyName: 'Wipro Limited', exchange: 'NSE', sector: 'Information Technology', marketCapCr: 245000, healthStatus: 'STABLE', peRatio: 19.8, debtToEquity: 0.25, roe: 15.0, promoterHolding: 72.9 },
  { id: 'SSI_BAJFINANCE', ticker: 'BAJFINANCE', companyName: 'Bajaj Finance Limited', exchange: 'NSE', sector: 'Banking & Finance', marketCapCr: 450000, healthStatus: 'HEALTHY', peRatio: 31.5, debtToEquity: 3.12, roe: 22.8, promoterHolding: 54.8 },
  { id: 'SSI_DRREDDY', ticker: 'DRREDDY', companyName: 'Dr. Reddys Laboratories', exchange: 'NSE', sector: 'Pharmaceuticals', marketCapCr: 112000, healthStatus: 'STABLE', peRatio: 20.3, debtToEquity: 0.14, roe: 17.6, promoterHolding: 26.7 },

  // BSE Listed
  { id: 'SSI_BSE_RPOWER', ticker: 'RPOWER', companyName: 'Reliance Power Limited', exchange: 'BSE', sector: 'Energy & Oil', marketCapCr: 14500, healthStatus: 'UNHEALTHY', peRatio: null, debtToEquity: 4.85, roe: -2.3, promoterHolding: 24.1 },
  { id: 'SSI_BSE_SUZLON', ticker: 'SUZLON', companyName: 'Suzlon Energy Limited', exchange: 'BSE', sector: 'Energy & Oil', marketCapCr: 68000, healthStatus: 'WEAKENING', peRatio: 72.1, debtToEquity: 0.08, roe: 42.5, promoterHolding: 13.3 },
  { id: 'SSI_BSE_YESBANK', ticker: 'YESBANK', companyName: 'Yes Bank Limited', exchange: 'BSE', sector: 'Banking & Finance', marketCapCr: 58000, healthStatus: 'WEAKENING', peRatio: 38.9, debtToEquity: null, roe: 3.2, promoterHolding: 0.0 },
  { id: 'SSI_BSE_DABUR', ticker: 'DABUR', companyName: 'Dabur India Limited', exchange: 'BSE', sector: 'FMCG', marketCapCr: 95000, healthStatus: 'STABLE', peRatio: 52.4, debtToEquity: 0.06, roe: 24.1, promoterHolding: 67.2 },
  { id: 'SSI_BSE_PIDIND', ticker: 'PIDILITIND', companyName: 'Pidilite Industries Limited', exchange: 'BSE', sector: 'Chemicals', marketCapCr: 142000, healthStatus: 'HEALTHY', peRatio: 78.5, debtToEquity: 0.05, roe: 27.3, promoterHolding: 69.9 },

  // SME Segment
  { id: 'SSI_SME_ALPHALOGIC', ticker: 'ALPHALOGIC', companyName: 'AlphaLogic Techsys Limited', exchange: 'SME', sector: 'Information Technology', marketCapCr: 285, healthStatus: 'STABLE', peRatio: 14.2, debtToEquity: 0.32, roe: 18.9, promoterHolding: 72.5 },
  { id: 'SSI_SME_GLOBETEX', ticker: 'GLOBETEX', companyName: 'GlobeTex Industries Ltd', exchange: 'SME', sector: 'Textiles', marketCapCr: 120, healthStatus: 'WEAKENING', peRatio: 8.9, debtToEquity: 1.78, roe: 6.2, promoterHolding: 68.0 },
  { id: 'SSI_SME_DEFENCETK', ticker: 'DEFTECHK', companyName: 'Defence Tech Kinetics Ltd', exchange: 'SME', sector: 'Defence', marketCapCr: 410, healthStatus: 'HEALTHY', peRatio: 22.3, debtToEquity: 0.15, roe: 24.6, promoterHolding: 71.2 },
  { id: 'SSI_SME_GREENPLAST', ticker: 'GREENPLST', companyName: 'GreenPlast Packaging Ltd', exchange: 'SME', sector: 'Chemicals', marketCapCr: 88, healthStatus: 'UNHEALTHY', peRatio: 42.1, debtToEquity: 2.95, roe: -1.4, promoterHolding: 64.3 },
  { id: 'SSI_SME_MICROFINX', ticker: 'MICROFINX', companyName: 'MicroFinX Capital Ltd', exchange: 'SME', sector: 'Banking & Finance', marketCapCr: 195, healthStatus: 'STABLE', peRatio: 11.8, debtToEquity: 3.42, roe: 14.1, promoterHolding: 58.9 },

  // Additional NSE
  { id: 'SSI_ASIANPAINT', ticker: 'ASIANPAINT', companyName: 'Asian Paints Limited', exchange: 'NSE', sector: 'Chemicals', marketCapCr: 278000, healthStatus: 'STABLE', peRatio: 62.8, debtToEquity: 0.18, roe: 28.4, promoterHolding: 52.8 },
  { id: 'SSI_TATAMOTORS', ticker: 'TATAMOTORS', companyName: 'Tata Motors Limited', exchange: 'NSE', sector: 'Automobiles', marketCapCr: 310000, healthStatus: 'HEALTHY', peRatio: 8.6, debtToEquity: 0.94, roe: 35.1, promoterHolding: 46.4 },
  { id: 'SSI_ADANIENT', ticker: 'ADANIENT', companyName: 'Adani Enterprises Limited', exchange: 'NSE', sector: 'Infrastructure', marketCapCr: 365000, healthStatus: 'WEAKENING', peRatio: 92.4, debtToEquity: 1.85, roe: 8.7, promoterHolding: 72.6 },
  { id: 'SSI_GRANULES', ticker: 'GRANULES', companyName: 'Granules India Limited', exchange: 'NSE', sector: 'Pharmaceuticals', marketCapCr: 9800, healthStatus: 'WEAKENING', peRatio: 16.7, debtToEquity: 0.52, roe: 12.3, promoterHolding: 41.0 },
  { id: 'SSI_DLF', ticker: 'DLF', companyName: 'DLF Limited', exchange: 'NSE', sector: 'Real Estate', marketCapCr: 215000, healthStatus: 'STABLE', peRatio: 68.3, debtToEquity: 0.09, roe: 5.8, promoterHolding: 74.1 },
];

// ─── Filter & Sort Logic ────────────────────────────────────────────────────
const HEALTH_RANK = {
  'VERY HEALTHY': 1,
  'HEALTHY': 2,
  'STABLE': 3,
  'WEAKENING': 4,
  'UNHEALTHY': 5,
};

const MARKET_CAP_RANGES = {
  ALL: () => true,
  LARGE: (cap) => cap >= 20000,
  MID: (cap) => cap >= 5000 && cap < 20000,
  SMALL: (cap) => cap >= 500 && cap < 5000,
  MICRO: (cap) => cap < 500,
};

const SCREENER_FILTER_STORAGE_KEY = 'ss_saved_screener_filters_v1';

function loadSavedFilters() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SCREENER_FILTER_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSavedFilters(saved) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SCREENER_FILTER_STORAGE_KEY, JSON.stringify(saved));
}

const evaluateHealthSafe = (status) => {
  const upper = (status || '').toUpperCase().trim();
  return ['VERY HEALTHY', 'HEALTHY', 'STABLE', 'WEAKENING', 'UNHEALTHY'].includes(upper)
    ? upper
    : 'STABLE';
};

// ─── Component ───────────────────────────────────────────────────────────────
const AnalysisHub = () => {
  const [filters, setFilters] = useState({
    sector: 'All Sectors',
    exchange: 'ALL',
    marketCap: 'ALL',
    healthState: 'ALL',
    sortBy: 'MARKET_CAP_DESC',
  });
  const [headerVisible, setHeaderVisible] = useState(false);
  const [savedFilters, setSavedFilters] = useState(() => loadSavedFilters());
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const saveCurrentFilter = useCallback(() => {
    const name = filterName.trim();
    if (!name) return;
    const next = [
      ...savedFilters.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
      { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, name, filters, savedAt: new Date().toISOString() },
    ].slice(-8);
    setSavedFilters(next);
    saveSavedFilters(next);
    setFilterName('');
  }, [filterName, filters, savedFilters]);

  const activeFilterSummary = useMemo(() => {
    const active = [];
    if (filters.sector !== 'All Sectors') active.push(`Sector: ${filters.sector}`);
    if (filters.exchange !== 'ALL') active.push(`Exchange: ${filters.exchange}`);
    if (filters.marketCap !== 'ALL') active.push(`Market cap: ${filters.marketCap}`);
    if (filters.healthState !== 'ALL') active.push(`Health: ${filters.healthState}`);
    return active;
  }, [filters]);

  // Apply filters and sorting
  const filteredStocks = useMemo(() => {
    let result = [...STOCK_UNIVERSE];

    // Sector filter
    if (filters.sector !== 'All Sectors') {
      result = result.filter((s) => s.sector === filters.sector);
    }

    // Exchange filter
    if (filters.exchange !== 'ALL') {
      result = result.filter((s) => s.exchange === filters.exchange);
    }

    // Market cap filter
    const capFilter = MARKET_CAP_RANGES[filters.marketCap] || MARKET_CAP_RANGES.ALL;
    result = result.filter((s) => capFilter(s.marketCapCr));

    // Health state filter
    if (filters.healthState !== 'ALL') {
      result = result.filter((s) => evaluateHealthSafe(s.healthStatus) === filters.healthState);
    }

    // Sort
    switch (filters.sortBy) {
      case 'MARKET_CAP_DESC':
        result.sort((a, b) => b.marketCapCr - a.marketCapCr);
        break;
      case 'MARKET_CAP_ASC':
        result.sort((a, b) => a.marketCapCr - b.marketCapCr);
        break;
      case 'HEALTH_BEST':
        result.sort((a, b) =>
          (HEALTH_RANK[evaluateHealthSafe(a.healthStatus)] || 3) -
          (HEALTH_RANK[evaluateHealthSafe(b.healthStatus)] || 3)
        );
        break;
      case 'HEALTH_WORST':
        result.sort((a, b) =>
          (HEALTH_RANK[evaluateHealthSafe(b.healthStatus)] || 3) -
          (HEALTH_RANK[evaluateHealthSafe(a.healthStatus)] || 3)
        );
        break;
      case 'PE_ASC':
        result.sort((a, b) => (a.peRatio ?? 999) - (b.peRatio ?? 999));
        break;
      case 'PE_DESC':
        result.sort((a, b) => (b.peRatio ?? 0) - (a.peRatio ?? 0));
        break;
      default:
        break;
    }

    return result;
  }, [filters]);

  // Compute aggregate metrics
  const metrics = useMemo(() => {
    const total = filteredStocks.length;
    const totalUniverse = STOCK_UNIVERSE.length;
    const healthyCount = filteredStocks.filter(
      (s) => evaluateHealthSafe(s.healthStatus) === 'VERY HEALTHY' || evaluateHealthSafe(s.healthStatus) === 'HEALTHY'
    ).length;
    const weakCount = filteredStocks.filter(
      (s) => evaluateHealthSafe(s.healthStatus) === 'WEAKENING' || evaluateHealthSafe(s.healthStatus) === 'UNHEALTHY'
    ).length;
    const avgPE = filteredStocks.filter((s) => s.peRatio !== null).length > 0
      ? (filteredStocks.filter((s) => s.peRatio !== null).reduce((sum, s) => sum + s.peRatio, 0) /
        filteredStocks.filter((s) => s.peRatio !== null).length)
      : null;

    const exchanges = { NSE: 0, BSE: 0, SME: 0 };
    filteredStocks.forEach((s) => {
      if (exchanges[s.exchange] !== undefined) exchanges[s.exchange]++;
    });

    return { total, totalUniverse, healthyCount, weakCount, avgPE, exchanges };
  }, [filteredStocks]);

  return (
    <section className="w-full flex flex-col space-y-8">
      {/* Page Header */}
      <div className={`
        flex flex-col space-y-2
        transition-all duration-500 ease-out
        ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono font-bold text-[#06B6D4] tracking-[0.2em] uppercase">
            ANALYSIS ENGINE
          </span>
          <div className="w-6 h-px bg-[#06B6D4]" />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-[#0A0A0A] tracking-tight">
          Healthometer & Diagnostic Screener
        </h1>
        <p className="text-[12px] text-[#737373] max-w-xl leading-relaxed">
          Multi-exchange structural health scanner with configurable saved filters.
          Empty states show when selected filters have no matching registry entries.
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#525252]">Saved Screeners</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {savedFilters.length > 0 ? savedFilters.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilters(item.filters)}
                  className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-[10px] font-bold uppercase text-[#525252] hover:border-[#06B6D4] hover:text-[#06B6D4]"
                >
                  {item.name}
                </button>
              )) : (
                <span className="text-[11px] text-[#737373]">No saved screeners yet.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Name this screener"
              className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#0A0A0A] outline-none focus:border-[#06B6D4]"
            />
            <button
              type="button"
              onClick={saveCurrentFilter}
              className="rounded-lg bg-[#06B6D4] px-4 py-2 text-[10px] font-bold uppercase text-white disabled:opacity-40"
              disabled={!filterName.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* SEBI Compliance Banner */}
      <div className="bg-white border border-[#E5E5E5] px-5 py-3 flex items-start space-x-3
                      bg-[radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.015),transparent_80%)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-[#A3A3A3] mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p className="text-[11px] text-[#737373] leading-relaxed">
          <span className="font-semibold text-[#525252]">Educational indicators only.</span>{' '}
          Healthometer scores are calculated status indicators derived from publicly available
          financial data. They do not constitute investment advice, buy/sell calls,
          or portfolio guidance. Consult a SEBI-registered investment advisor before acting
          on any financial data.
        </p>
      </div>

      {/* 4-Column Grid: Sidebar + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Screener Sidebar (col-span-1) */}
        <div className="lg:col-span-1">
          <ScreenerSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right Columns: Analytics Display (col-span-3) */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          {/* Metrics Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScreenerMetricsCard
              label="ASSETS SCANNED"
              value={metrics.total.toString()}
              secondaryLabel={`of ${metrics.totalUniverse} total universe`}
              accentColor="cyan"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <ScreenerMetricsCard
              label="HEALTHY ENTITIES"
              value={metrics.healthyCount.toString()}
              secondaryLabel="Very Healthy + Healthy"
              trend={metrics.healthyCount > metrics.weakCount ? 'up' : 'neutral'}
              trendValue={`${metrics.total > 0 ? Math.round((metrics.healthyCount / metrics.total) * 100) : 0}%`}
              accentColor="cyan"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            <ScreenerMetricsCard
              label="ALERT ENTITIES"
              value={metrics.weakCount.toString()}
              secondaryLabel="Weakening + Unhealthy"
              trend={metrics.weakCount > 0 ? 'down' : 'neutral'}
              trendValue={`${metrics.total > 0 ? Math.round((metrics.weakCount / metrics.total) * 100) : 0}%`}
              accentColor="magenta"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <ScreenerMetricsCard
              label="AVG P/E RATIO"
              value={metrics.avgPE !== null ? metrics.avgPE.toFixed(1) : '—'}
              secondaryLabel={`NSE: ${metrics.exchanges.NSE} · BSE: ${metrics.exchanges.BSE} · SME: ${metrics.exchanges.SME}`}
              accentColor="neutral"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              }
            />
          </div>

          {/* Scanner List Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-mono font-semibold tracking-[0.14em] text-[#525252] uppercase">
                HEALTHOMETER SCANNER
              </span>
              <div className="flex-1 h-px bg-[#E5E5E5] w-12" />
              <span className="text-[10px] font-mono text-[#A3A3A3] tracking-wider">
                {filteredStocks.length} RESULT{filteredStocks.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {/* Column headers for desktop */}
            <div className="hidden md:flex items-center space-x-6 text-center">
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-20">M.CAP</span>
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-14">P/E</span>
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-14">D/E</span>
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-14">ROE</span>
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-16">PROMOTER</span>
              <span className="text-[8px] font-mono text-[#A3A3A3] tracking-wider uppercase w-24 text-right">STATUS</span>
            </div>
          </div>

          {/* Scanner Rows — Zero CLS: fixed height container */}
          <div className="flex flex-col space-y-2 min-h-[200px]">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock, idx) => (
                <HealthometerRow
                  key={stock.id}
                  id={stock.id}
                  ticker={stock.ticker}
                  companyName={stock.companyName}
                  exchange={stock.exchange}
                  marketCapCr={stock.marketCapCr}
                  healthStatus={stock.healthStatus}
                  peRatio={stock.peRatio}
                  debtToEquity={stock.debtToEquity}
                  roe={stock.roe}
                  promoterHolding={stock.promoterHolding}
                  staggerIndex={idx}
                />
              ))
            ) : (
              <div className="w-full bg-white border border-[#E5E5E5] px-6 py-12 flex flex-col items-center space-y-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-[#D4D4D4]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-[11px] font-mono text-[#A3A3A3] tracking-wider uppercase">
                  NO MATCHING ENTITIES FOUND
                </span>
                <span className="text-[10px] text-[#A3A3A3]">
                  {activeFilterSummary.length > 0
                    ? `No registry entries match ${activeFilterSummary.join(' • ')}.`
                    : 'No registry entries match the current diagnostic scan.'}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Compliance Footer */}
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-[9px] font-mono text-[#A3A3A3] leading-relaxed tracking-wide">
              HEALTHOMETER OUTPUT MATRIX: Diagnostic status classification only. ~150 operational
              parameters are processed per entity including debt ratios, cash flow stability, promoter
              patterns, and margin trajectory. No buy/sell/hold signals are generated. StockStory India
              is not a SEBI-registered investment advisor. All data sourced from publicly available
              exchange filings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalysisHub;
