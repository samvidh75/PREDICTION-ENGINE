// src/components/navigation/NavigationCoordinator.ts

export type AppRoute = 'dashboard' | 'explore' | 'academy' | 'analysis' | 'company' | 'search' | 'portfolio' | 'watchlist' | 'alerts' | 'settings';

const implementedRoutes = new Set<AppRoute>([
  'dashboard',
  'explore',
  'academy',
  'analysis',
  'company',
  'search',
  'portfolio',
  'watchlist',
  'alerts',
  'settings',
]);

export class NavigationCoordinator {
  /**
   * Safely transitions page states in a single-page context without reloads
   */
  public static navigateTo(route: AppRoute, id?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const safeRoute = implementedRoutes.has(route) ? route : 'dashboard';
      let newUrl = `${window.location.origin}${window.location.pathname}?page=${safeRoute}`;
      if (id) {
        newUrl += `&id=${id.trim().toUpperCase()}`;
      }
      window.history.pushState({ page: safeRoute, id }, '', newUrl);
      window.dispatchEvent(new Event('popstate')); // notifies route listeners immediately
    } catch (err) {
      console.error('Failed to coordinate navigation route:', err);
    }
  }

  /**
   * Resolves current route state from URL parameters
   */
  public static getCurrentRoute(): { route: AppRoute; id: string | null } {
    if (typeof window === 'undefined') return { route: 'dashboard', id: null };
    try {
      const params = new URLSearchParams(window.location.search);
      const rawPage = (params.get('page') || 'dashboard').toLowerCase() as AppRoute;
      const page = implementedRoutes.has(rawPage) ? rawPage : 'dashboard';
      const id = params.get('id');
      return { route: page, id };
    } catch {
      return { route: 'dashboard', id: null };
    }
  }
}

export default NavigationCoordinator;
