import React from "react";
import { useAuth } from "../../context/AuthContext";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  useAuth();
  return (
    <div className="ss-shell-bg relative flex h-dvh w-dvw flex-col overflow-hidden font-sans antialiased" style={{ color: "#0f1419" }}>
      <TopNav />
      <div className="relative flex h-full w-full flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="mt-14 h-[calc(100dvh-56px)] w-full overflow-y-auto md:mt-[60px] md:h-[calc(100dvh-60px)] md:ml-[240px] md:w-[calc(100%-240px)] pb-16 md:pb-6"
        >
          <div className="relative z-10 mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 lg:py-8 safe-area-x">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
