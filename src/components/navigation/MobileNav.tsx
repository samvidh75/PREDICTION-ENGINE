import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Menu, X, LayoutDashboard, Search, Briefcase, Eye, Bell, Settings } from 'lucide-react';
import { useNavigation, ViewType } from '../../context/LayoutContext';

interface MobileNavItem {
  id: ViewType | "search";
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, MapsTo } = useNavigation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNav = (id: ViewType | "search") => {
    setIsOpen(false);
    if (id === "search") {
      window.dispatchEvent(new Event("ss:open-search"));
      return;
    }
    MapsTo(id);
  };

  const links: MobileNavItem[] = [
    { id: "terminal", label: "Home", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "search", label: "Search", icon: <Search className="w-4 h-4" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-4 h-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="w-4 h-4" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const menuVariants: Variants = {
    closed: { x: '100%', transition: { type: 'spring', stiffness: 400, damping: 40 } },
    open: { x: 0, transition: { type: 'spring', stiffness: 400, damping: 40 } },
  };

  // Bottom tab bar — 4 core items + More
  const tabs: MobileNavItem[] = [
    { id: "terminal", label: "Home", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "search", label: "Search", icon: <Search className="w-5 h-5" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-5 h-5" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden">
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-[#2a2e39] flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const isActive = tab.id === "search" ? false : currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all cursor-pointer ${
                isActive ? "text-[#2962ff]" : "text-[#787b86]"
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
        {/* Menu toggle */}
        <button
          onClick={toggleMenu}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[#787b86] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
        </button>
      </div>

      {/* Full Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              className="fixed top-0 right-0 h-full w-[280px] bg-[#131722]/98 border-l border-l-[#2a2e39] z-[105] p-6 flex flex-col backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8 pt-4">
                <div className="text-base font-bold tracking-widest text-[#f0f3fa]">
                  STOCKSTORY<span className="text-[#2962ff]">.INDIA</span>
                </div>
                <button onClick={toggleMenu} className="p-1.5 rounded-lg bg-[#1e222d] text-[#b2b5be] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {links.map(link => {
                  const isActive = link.id === "search" ? false : currentView === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => handleNav(link.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#2962ff]/15 text-[#f0f3fa]"
                          : "text-[#b2b5be] hover:text-[#f0f3fa] hover:bg-[#1e222d]"
                      }`}
                    >
                      <span className={isActive ? "text-[#2962ff]" : ""}>{link.icon}</span>
                      <span className="text-sm font-medium">{link.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNav;
