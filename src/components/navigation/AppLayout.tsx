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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-slate-900 antialiased">
      <TopNav />
      <div className="relative flex h-full w-full flex-1 overflow-hidden">
        <Sidebar />
        <main className="
          mt-[56px] h-[calc(100vh-56px)] w-full overflow-y-auto bg-background-secondary
          md:mt-[60px] md:h-[calc(100vh-60px)] md:ml-[220px] md:w-[calc(100vw-220px)]
          pb-16 md:pb-6
        ">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
