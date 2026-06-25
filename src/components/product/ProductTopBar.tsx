import { useEffect, useState } from "react";
import { Crown, Search } from "lucide-react";
import Logo from "../brand/Logo";
import { currentRoute, navigate } from "./routeConfig";
import { useAuth } from "../../context/AuthContext";
import { isPremium } from "../../lib/subscription";
import ProfileButton from "../navigation/ProfileButton";
import { PricingModal } from "../premium/PremiumGate";

const DESKTOP_NAV_LINKS = [
  { page: '', label: 'Home' },
  { page: 'scanner', label: 'Scanner' },
  { page: 'rankings', label: 'Rankings' },
  { page: 'compare', label: 'Compare' },
  { page: 'watchlist', label: 'Watchlist' },
  { page: 'portfolio', label: 'Portfolio' },
  { page: 'alerts', label: 'Alerts' },
];

export default function ProductTopBar({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const [route, setRoute] = useState(currentRoute());
  const [pricingOpen, setPricingOpen] = useState(false);
  const premium = isPremium();

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    window.addEventListener("urlchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("urlchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return (
    <header
      style={{
        height: 64,
        background: '#0D1117',
        borderBottom: '1px solid rgba(148,163,184,0.16)',
      }}
      className="flex items-center px-4 sticky top-0 z-50"
    >
      <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1320 }}>
        <button onClick={() => navigate('')} className="flex items-center">
          <Logo />
        </button>

        {!compact && (
          <div className="hidden md:flex items-center gap-[20px] ml-10">
            {DESKTOP_NAV_LINKS.map(({ page, label }) => {
              const isActive = route === page || (!route && page === '');
              return (
                <button
                  key={page}
                  onClick={() => navigate(page)}
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  className="text-[14px] font-[400] hover:text-[var(--text-primary)] tracking-[-0.2px] transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPricingOpen(true)}
            className={`text-[12px] font-[400] rounded-[9999px] px-[12px] py-[6px] transition-all active:scale-[0.97] flex items-center gap-1.5 ${
              premium
                ? 'bg-[rgba(41,98,255,0.1)] text-[#2962FF] border border-[#2962FF]'
                : 'bg-[rgba(41,98,255,0.1)] text-[#2962FF] hover:bg-[rgba(41,98,255,0.2)]'
            }`}
          >
            <Crown size={12} /> {premium ? 'Premium' : 'Upgrade'}
          </button>
          <button
            onClick={() => navigate('search')}
            aria-label="Search"
            className="w-[34px] h-[34px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Search size={15} />
          </button>
          {isAuthenticated && user ? (
            <ProfileButton />
          ) : (
            <>
              <button
                onClick={() => navigate('login')}
                className="text-[14px] font-[400] text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-[-0.2px] transition-colors px-3 py-1.5"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('signup')}
                className="bg-[#2962FF] text-white text-[14px] font-[400] rounded-[9999px] px-[16px] py-[8px] hover:bg-[#2554d4] transition-colors active:scale-[0.97]"
              >
                Start Free Trial
              </button>
            </>
          )}
        </div>
      </div>
      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
    </header>
  );
}
