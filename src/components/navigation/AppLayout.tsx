import React from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "../../context/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-sans select-none relative bg-slate-950 text-slate-100">
      {/* Top Header */}
      <div className="hidden md:block">
        <TopNav />
      </div>

      {/* Main Structural Body */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        {/* Left Side Rail */}
        <Sidebar />

        {/* Central Workspace */}
        <main className="
          w-full md:w-[calc(100vw-240px)] 
          h-[calc(100vh-72px)] 
          mt-[72px] 
          overflow-y-auto 
          bg-transparent
          md:ml-[240px]
          pb-24
        ">
          <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav Bar - Mobile Viewport */}
      <MobileNav />
    </div>
  );
};

export default AppLayout;
