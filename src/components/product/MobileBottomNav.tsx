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
          height: 72,
          background: '#0D1117',
          borderTop: '1px solid rgba(148,163,184,0.16)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around md:hidden backdrop-blur-md"
      >
        {TABS.map(({ page, label, icon: Icon }) => {
          const isActive = page !== '__menu__' && (route === page || (!route && page === ''));
          return (
            <button
              key={page}
              onClick={() => handleTab(page)}
              className="flex flex-col items-center gap-1"
              style={{ minWidth: 48, height: 48 }}
            >
              <Icon
                size={20}
                style={{
                  color:
                    page === '__menu__' && menuOpen
                      ? 'var(--text-primary)'
                      : isActive
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
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
