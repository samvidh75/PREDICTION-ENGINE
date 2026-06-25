import React from 'react';
import { Compass, Shield, BookOpen, Search } from 'lucide-react';
import { NAV_TOKENS } from './NavigationDesignTokens';
import { NavigationCoordinator, AppRoute } from './NavigationCoordinator';

interface MobileShellProps {
  currentRoute: AppRoute;
  onOpenSearch: () => void;
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ currentRoute, onOpenSearch, children }) => {
  const bottomItems: { route: AppRoute; label: string; icon: any }[] = [
    { route: 'dashboard', label: 'Hub', icon: Compass },
    { route: 'explore', label: 'Markets', icon: Shield },
    { route: 'academy', label: 'Academy', icon: BookOpen },
  ];

  return (
    <div className="flex md:hidden flex-col min-h-dvh bg-[#FFFFFF] text-[#0F172A] pb-[calc(72px+env(safe-area-inset-bottom)+16px)]">
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-b"
        style={{
          height: NAV_TOKENS.mobileHeaderHeight,
          background: '#FFFFFF',
          borderColor: 'rgba(15,23,42,0.10)',
        }}
      >
        <span className="text-xs font-bold tracking-widest text-[#0F172A]">STOCKSTORY</span>
        <button
          onClick={onOpenSearch}
          className="p-2 hover:bg-[rgba(15,23,42,0.04)] rounded-full text-[#2962FF] cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 pt-16 px-4">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t grid grid-cols-4 items-center pb-[env(safe-area-inset-bottom)]"
        style={{
          height: `calc(${NAV_TOKENS.mobileBottomNavHeight} + env(safe-area-inset-bottom))`,
          background: '#FFFFFF',
          borderColor: 'rgba(15,23,42,0.10)',
        }}
      >
        {bottomItems.map(item => {
          const active = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => NavigationCoordinator.navigateTo(item.route)}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 ${
                active ? 'text-[#2962FF]' : 'text-[#64748B]'
              }`}
            >
              <item.icon className="w-[22px] h-[22px]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={onOpenSearch}
          className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer text-[#64748B] hover:text-[#2962FF]"
        >
          <Search className="w-[22px] h-[22px]" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">Search</span>
        </button>
      </nav>
    </div>
  );
};

export default MobileShell;
