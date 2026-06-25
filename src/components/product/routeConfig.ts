export const ROUTES = {
  home: { path: '/', label: 'Home', icon: 'Home' },
  scanner: { path: '/scanner', label: 'Scanner', icon: 'BarChart3' },
  search: { path: '/search', label: 'Search', icon: 'Search' },
  compare: { path: '/compare', label: 'Compare', icon: 'GitCompare' },
  watchlist: { path: '/watchlist', label: 'Watchlist', icon: 'Bookmark' },
  portfolio: { path: '/portfolio', label: 'Portfolio', icon: 'Briefcase' },
  alerts: { path: '/alerts', label: 'Alerts', icon: 'Bell' },
  pricing: { path: '/pricing', label: 'Pricing', icon: 'Crown' },
} as const;

export function navigate(path: string, symbol?: string) {
  const p = symbol ? `/${path}/${symbol}` : path.startsWith('/') ? path : `/${path}`;
  window.history.pushState({}, '', p);
  window.dispatchEvent(new Event('urlchange'));
}

export function currentRoute(): string {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  return path || 'home';
}
