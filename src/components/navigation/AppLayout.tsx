import React, { useState, useEffect } from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileNav from "./MobileNav";
import CommandCentreSearch from "./CommandCentreSearch";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // / key
      if (e.key === "/") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.getAttribute("contenteditable") === "true")) {
          return;
        }
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    const handleOpenSearchEvent = () => {
      setIsSearchOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("ss:open-search", handleOpenSearchEvent);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("ss:open-search", handleOpenSearchEvent);
    };
  }, []);

  return (
    <div className="ss-app-shell h-screen w-screen overflow-hidden flex flex-col font-sans select-none relative text-white">
      {/* Top Header - Desktop Viewport (h-18 / 72px) */}
      <div className="hidden md:block">
        <TopNav />
      </div>

      {/* Top Header - Mobile Viewport (h-15 / 60px) */}
      <div className="block md:hidden">
        <MobileHeader />
      </div>

      {/* Main Structural Body Split */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        {/* Left Side Rail (w-[240px]) */}
        <Sidebar />

        {/* Central Workspace */}
        <main className="
          w-full md:w-[calc(100vw-240px)] 
          h-[calc(100vh-72px)] 
          mt-[72px] 
          overflow-y-auto 
          ss-workspace
          md:ml-[240px]
          transition-all duration-300 ease-out
        ">
          <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav Bar - Mobile Viewport (h-16 / 64px) */}
      <MobileNav />

      {/* Global Search Overlay */}
      {isSearchOpen && (
        <CommandCentreSearch onClose={() => setIsSearchOpen(false)} />
      )}
    </div>
  );
};

export default AppLayout;
