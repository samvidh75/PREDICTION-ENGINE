import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Menu, X, LayoutDashboard, Compass, Briefcase, Eye, Bell, Settings } from 'lucide-react';
import { useNavigation, ViewType } from '../../context/LayoutContext';

interface MobileNavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, MapsTo } = useNavigation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNav = (view: ViewType) => {
    setIsOpen(false);
    MapsTo(view);
  };

  const links: MobileNavItem[] = [
    { id: "terminal", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "discovery", label: "Discovery", icon: <Compass className="w-4 h-4" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-4 h-4" /> },
    { id: "watchlist", label: "Watchlists", icon: <Eye className="w-4 h-4" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const menuVariants: Variants = {
    closed: { x: '100%', transition: { type: 'spring', stiffness: 400, damping: 40 } },
    open: { x: 0, transition: { type: 'spring', stiffness: 400, damping: 40 } },
  };

  // Bottom tab bar — 5 core items
  const tabs: MobileNavItem[] = [
    { id: "terminal", label: "Home", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "discovery", label: "Discover", icon: <Compass className="w-5 h-5" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-5 h-5" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden">
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] bg-[#050505]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-around h-16 px-2">
        {tabs.map(tab => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => MapsTo(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${
                isActive ? "text-cyan-400" : "text-white/30"
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
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-white/30"
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
              className="fixed top-0 right-0 h-full w-[280px] bg-[#050505]/95 border-l border-white/10 z-[105] p-6 flex flex-col backdrop-blur-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8 pt-4">
                <div className="text-base font-bold tracking-widest text-white">
                  STOCKSTORY<span className="text-cyan-500">.INDIA</span>
                </div>
                <button onClick={toggleMenu} className="p-1.5 rounded-lg bg-white/5 text-white/50">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {links.map(link => {
                  const isActive = currentView === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => handleNav(link.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? "bg-white/5 text-white"
                          : "text-white/40 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={isActive ? "text-cyan-400" : ""}>{link.icon}</span>
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
