import React, { useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Compass,
  Eye,
  FileText,
  GitCompare,
  Info,
  Layers,
  LayoutDashboard,
  LogIn,
  Menu,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface MobileNavSection {
  label: string;
  links: MobileNavItem[];
}

interface PublicMobileNavItem {
  page: "landing" | "about" | "login" | "signup";
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated } = useAuth();

  const currentPage = (() => {
    if (typeof window === "undefined") return "landing";
    return new URLSearchParams(window.location.search).get("page") ?? "landing";
  })();

  const isPublicMobile = !isAuthenticated || ["landing", "about", "login", "signup"].includes(currentPage);

  const toggleMenu = () => setIsOpen((open) => !open);

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handleNav = (id: ViewType) => {
    setIsOpen(false);
    MapsTo(id);
  };

  const handlePublicNav = (page: PublicMobileNavItem["page"]) => {
    setIsOpen(false);
    setPage(page);
  };

  const sections: MobileNavSection[] = [
    {
      label: "Market",
      links: [
        { id: "terminal", label: "Market home", icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
        { id: "discovery", label: "Discovery", icon: <Compass className="h-4 w-4" /> },
        { id: "daily-feed", label: "Daily feed", icon: <Newspaper className="h-4 w-4" /> },
      ],
    },
    {
      label: "Research",
      links: [
        { id: "analysis", label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "compare", label: "Compare", icon: <GitCompare className="h-4 w-4" /> },
        { id: "rankings", label: "Rankings", icon: <Trophy className="h-4 w-4" /> },
        { id: "leaderboard", label: "Leaderboard", icon: <Activity className="h-4 w-4" /> },
        { id: "academy", label: "Academy", icon: <BookOpen className="h-4 w-4" /> },
      ],
    },
    {
      label: "Portfolio",
      links: [
        { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-4 w-4" /> },
        { id: "watchlist", label: "Watchlist", icon: <Eye className="h-4 w-4" /> },
        { id: "alerts", label: "Alerts", icon: <Bell className="h-4 w-4" /> },
        { id: "portfolio-doctor", label: "Portfolio doctor", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "journal", label: "Prediction journal", icon: <FileText className="h-4 w-4" /> },
        { id: "workspace", label: "Workspace", icon: <Layers className="h-4 w-4" /> },
      ],
    },
    {
      label: "System",
      links: [
        { id: "trust", label: "Trust centre", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  ];

  const menuVariants: Variants = {
    closed: { x: "100%", transition: { type: "spring", stiffness: 400, damping: 40 } },
    open: { x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } },
  };

  const tabs: MobileNavItem[] = [
    { id: "terminal", label: "Home", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "search", label: "Search", icon: <Search className="h-5 w-5" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-5 w-5" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="h-5 w-5" /> },
  ];

  const publicTabs: PublicMobileNavItem[] = [
    { page: "landing", label: "Home", icon: <LayoutDashboard className="h-5 w-5" /> },
    { page: "about", label: "About", icon: <Info className="h-5 w-5" /> },
    { page: "login", label: "Sign in", icon: <LogIn className="h-5 w-5" /> },
    { page: "signup", label: "Create", icon: <UserPlus className="h-5 w-5" /> },
  ];

  return (
    <div className="md:hidden">
      <div className="fixed bottom-0 left-0 right-0 z-[90] flex h-16 items-center justify-around border-t border-[#2a2e39] bg-[#0f0f0f]/95 px-2 backdrop-blur-xl">
        {isPublicMobile
          ? publicTabs.map((tab) => {
              const isActive = currentPage === tab.page;
              return (
                <button
                  key={tab.page}
                  type="button"
                  onClick={() => handlePublicNav(tab.page)}
                  className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-all ${
                    isActive ? "text-[#2962ff]" : "text-[#787b86]"
                  }`}
                >
                  {tab.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })
          : tabs.map((tab) => {
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleNav(tab.id)}
                  className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-all ${
                    isActive ? "text-[#2962ff]" : "text-[#787b86]"
                  }`}
                >
                  {tab.icon}
                  <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
        {!isPublicMobile && (
          <button
            type="button"
            onClick={toggleMenu}
            className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[#787b86]"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
          </button>
        )}
      </div>

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
              className="fixed right-0 top-0 z-[105] flex h-full w-[300px] flex-col border-l border-l-[#2a2e39] bg-[#131722]/98 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-8 flex items-center justify-between pt-4">
                <div className="text-base font-bold tracking-widest text-[#f0f3fa]">
                  STOCKSTORY<span className="text-[#2962ff]">.INDIA</span>
                </div>
                <button type="button" onClick={toggleMenu} className="cursor-pointer rounded-lg bg-[#1e222d] p-1.5 text-[#b2b5be]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                {sections.map((section) => (
                  <div key={section.label}>
                    <span className="mb-2 block px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#787b86]">
                      {section.label}
                    </span>
                    <div className="space-y-1">
                      {section.links.map((link) => {
                        const isActive = currentView === link.id;
                        return (
                          <button
                            key={link.id}
                            type="button"
                            onClick={() => handleNav(link.id)}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                              isActive
                                ? "bg-[#2962ff]/15 text-[#f0f3fa]"
                                : "text-[#b2b5be] hover:bg-[#1e222d] hover:text-[#f0f3fa]"
                            }`}
                          >
                            <span className={isActive ? "text-[#2962ff]" : ""}>{link.icon}</span>
                            <span className="text-sm font-medium">{link.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNav;
