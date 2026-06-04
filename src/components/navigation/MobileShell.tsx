import React from 'react';
import { Compass, Shield, BookOpen, Search, User } from 'lucide-react';
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
    <div className="flex md:hidden flex-col min-h-screen bg-[#0f0f0f] text-[#f0f3fa] font-mono pb-24">
      {/* 1. Mobile Top Header System */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-b border-white/5"
        style={{
          height: NAV_TOKENS.mobileHeaderHeight,
          background: NAV_TOKENS.mobileBackground,
          backdropFilter: NAV_TOKENS.backdropBlur,
        }}
      >
        <span className="text-xs font-bold tracking-widest text-white">STOCKSTORY</span>
        <button 
          onClick={onOpenSearch}
          className="p-2 hover:bg-[#1e222d] rounded-full text-[#7da0ff] cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* 2. Content Zone */}
      <main className="flex-1 pt-20 px-4">
        {children}
      </main>

      {/* 3. Bottom Navigation OS bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 grid grid-cols-4 items-center"
        style={{
          height: NAV_TOKENS.mobileBottomNavHeight,
          background: NAV_TOKENS.mobileBackground,
          backdropFilter: NAV_TOKENS.backdropBlur,
        }}
      >
        {bottomItems.map(item => {
          const active = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => NavigationCoordinator.navigateTo(item.route)}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-300 ${
                active ? 'text-[#7da0ff]' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-[22px] h-[22px]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">{item.label}</span>
            </button>
          );
        })}
        {/* Direct search shortcut tab */}
        <button
          onClick={onOpenSearch}
          className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-500 hover:text-[#7da0ff]"
        >
          <Search className="w-[22px] h-[22px]" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">Search</span>
        </button>
      </nav>
    </div>
  );
};

export default MobileShell;
