export const ROUTES = {
  home: { page: '', label: 'Home', icon: 'Home' },
  scanner: { page: 'scanner', label: 'Scanner', icon: 'BarChart3' },
  rankings: { page: 'rankings', label: 'Rankings', icon: 'Award' },
  search: { page: 'search', label: 'Search', icon: 'Search' },
  compare: { page: 'compare', label: 'Compare', icon: 'GitCompare' },
  watchlist: { page: 'watchlist', label: 'Watchlist', icon: 'Bookmark' },
  portfolio: { page: 'portfolio', label: 'Portfolio', icon: 'Briefcase' },
  alerts: { page: 'alerts', label: 'Alerts', icon: 'Bell' },
  methodology: { page: 'methodology', label: 'Methodology', icon: 'BookOpen' },
  settings: { page: 'settings', label: 'Settings', icon: 'Settings' },
  pricing: { page: 'pricing', label: 'Pricing', icon: 'Crown' },
} as const

export function currentRoute(): string {
  return new URLSearchParams(window.location.search).get('page') || ''
}

export function navigate(page: string, id?: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('page', page)
  if (id) params.set('id', id)
  window.history.pushState({}, '', `?${params.toString()}`)
  window.dispatchEvent(new Event('urlchange'))
}
