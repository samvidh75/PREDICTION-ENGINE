import React, { useState, useEffect } from 'react';
import { DesktopShell } from './DesktopShell';
import { MobileShell } from './MobileShell';
import { CommandCentreSearch } from './CommandCentreSearch';
import { NavigationCoordinator, AppRoute } from './NavigationCoordinator';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [routeInfo, setRouteInfo] = useState<{ route: AppRoute; id: string | null }>(() => 
    NavigationCoordinator.getCurrentRoute()
  );
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handlePopstate = () => {
      setRouteInfo(NavigationCoordinator.getCurrentRoute());
    };

    window.addEventListener('popstate', handlePopstate);
    window.addEventListener('urlchange', handlePopstate);

    // Keyboard Command shortcuts (Ctrl + K / Cmd + K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      window.removeEventListener('urlchange', handlePopstate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => setSearchOpen(false);

  return (
    <div className="min-h-screen ss-app-shell text-white">
      {/* Desktop Shell persistence */}
      <DesktopShell currentRoute={routeInfo.route} onOpenSearch={openSearch}>
        {children}
      </DesktopShell>

      {/* Mobile Shell persistence */}
      <MobileShell currentRoute={routeInfo.route} onOpenSearch={openSearch}>
        {children}
      </MobileShell>

      {/* Command Centre Modal Overlay */}
      {searchOpen && <CommandCentreSearch onClose={closeSearch} />}
    </div>
  );
};

export default AppShell;
