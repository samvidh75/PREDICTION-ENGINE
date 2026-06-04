import React from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileNav from "./MobileNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#020304] flex flex-col font-sans select-none relative text-white">
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
        {/* Left Side Rail (w-65 / 260px) */}
        <Sidebar />

        {/* 
          Central Story Workspace:
          Desktop: w-[calc(100vw-260px)] h-[calc(100vh-72px)] mt-[72px] ml-[260px] overflow-y-auto bg-[#020304] p-8
          Mobile: w-full h-[calc(100vh-124px)] mt-15 mb-16 px-4 py-4 overflow-y-auto
        */}
        <main className="
          w-full md:w-[calc(100vw-260px)] 
          h-[calc(100vh-124px)] md:h-[calc(100vh-72px)] 
          mt-15 md:mt-18 
          mb-16 md:mb-0 
          md:ml-65 
          overflow-y-auto 
          bg-[#020304] 
          px-4 md:px-8 py-4 md:py-8
          transition-all duration-300 ease-out
        ">
          {children}
        </main>
      </div>

      {/* Bottom Nav Bar - Mobile Viewport (h-16 / 64px) */}
      <MobileNav />
    </div>
  );
};

export default AppLayout;
