import { useEffect, useState } from "react";
import { Home, BarChart3, Search, Bookmark, Menu } from "lucide-react";
import { currentRoute, navigate } from "./routeConfig";
import MobileMenuPanel from "./MobileMenuPanel";

const TABS = [
  { page: '', label: 'Home', icon: Home },
  { page: 'scanner', label: 'Scanner', icon: BarChart3 },
  { page: 'search', label: 'Search', icon: Search },
  { page: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { page: '__menu__', label: 'Menu', icon: Menu },
] as const;

export default function MobileBottomNav() {
  const [route, setRoute] = useState(currentRoute());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const handleTab = (page: string) => {
    if (page === '__menu__') {
      setMenuOpen(true);
    } else {
      navigate(page);
    }
  };

  return (
    <>
      <nav
        style={{
          height: 'var(--nav-h)',
          background: '#0a0a0a',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around md:hidden"
      >
        {TABS.map(({ page, label, icon: Icon }) => {
          const isActive = page !== '__menu__' && (route === page || (!route && page === ''));
          const isMenuActive = page === '__menu__' && menuOpen;
          return (
            <button
              key={page}
              onClick={() => handleTab(page)}
              className="flex flex-col items-center justify-center gap-0.5"
              style={{ minWidth: 48, height: 48, padding: 0 }}
            >
              <Icon
                size={20}
                style={{
                  color: isActive || isMenuActive ? '#06D6A0' : 'rgba(255,255,255,0.45)',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive || isMenuActive ? 600 : 400,
                  color: isActive || isMenuActive ? '#06D6A0' : 'rgba(255,255,255,0.45)',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
      {menuOpen && <MobileMenuPanel onClose={() => setMenuOpen(false)} />}
    </>
  );
}
