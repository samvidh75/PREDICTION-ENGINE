import React from 'react';
import { Search, Compass, BookOpen, User, Settings, Shield } from 'lucide-react';
import { NAV_TOKENS } from './NavigationDesignTokens';
import { NavigationCoordinator, AppRoute } from './NavigationCoordinator';
import ProfileButton from './ProfileButton';

interface DesktopShellProps {
  currentRoute: AppRoute;
  onOpenSearch: () => void;
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({ currentRoute, onOpenSearch, children }) => {
  const menuItems: { route: AppRoute; label: string; icon: any }[] = [
    { route: 'dashboard', label: 'Hub', icon: Compass },
    { route: 'explore', label: 'Markets', icon: Shield },
    { route: 'academy', label: 'Academy', icon: BookOpen },
  ];

  return (
    <div className="hidden md:flex flex-col min-h-screen text-white font-mono bg-[#020304]">
      {/* 1. Opaque 72px Header System */}
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 border-b"
        style={{
          height: NAV_TOKENS.desktopHeaderHeight,
          background: NAV_TOKENS.desktopBackground,
          backdropFilter: NAV_TOKENS.backdropBlur,
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Brand identity point */}
        <div 
          onClick={() => NavigationCoordinator.navigateTo('dashboard')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-emerald-500 flex items-center justify-center font-bold text-black text-sm">
            S
          </div>
          <span className="text-sm font-bold tracking-widest text-white">STOCKSTORY.IN</span>
        </div>

        {/* Central Search Primary Action */}
        <div 
          onClick={onOpenSearch}
          className="w-96 h-10 px-4 rounded-full border bg-white/[0.03] border-white/10 hover:border-cyan-400/50 flex items-center gap-3 cursor-pointer text-gray-500 transition-all duration-300"
        >
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-mono select-none">Search stocks, markets... (Ctrl+K)</span>
        </div>

        {/* Navigation Actions + Profile Hub */}
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            {menuItems.map(item => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => NavigationCoordinator.navigateTo(item.route)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                    active 
                      ? 'bg-white/10 text-cyan-400 border border-white/10' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="h-6 w-px bg-white/10" />
          <ProfileButton />
        </div>
      </header>

      {/* 2. Primary Page workspace under header */}
      <main className="flex-1 pt-24 pb-8 px-8 max-w-7xl mx-auto w-full relative z-10">
        {children}
      </main>
    </div>
  );
};

export default DesktopShell;
