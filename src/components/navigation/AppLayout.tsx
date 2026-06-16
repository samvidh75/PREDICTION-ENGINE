import React from "react";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "../../context/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  useAuth();

  return (
    <div className="relative flex h-screen w-screen select-none flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <TopNav />

      <div className="relative flex h-full w-full flex-1 overflow-hidden">
        <Sidebar />

        <main className="
          mt-[60px]
          h-[calc(100vh-60px)]
          w-full
          overflow-y-auto 
          bg-slate-50
          md:mt-[72px]
          md:h-[calc(100vh-72px)]
          md:ml-[240px]
          md:w-[calc(100vw-240px)]
          pb-24
        ">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
};

export default AppLayout;
