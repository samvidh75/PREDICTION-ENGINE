import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";

export const LoginPage: React.FC = () => {
  const goDashboard = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "dashboard");
    window.history.replaceState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <main className="flex min-h-screen select-none flex-col justify-between bg-slate-50 font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 md:py-24">
        <div className="w-full max-w-md rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              StockStory India
            </span>
          </div>
          <CinematicAuthGateway
            onAuthed={goDashboard}
            initialStage="login"
            restoreOnMount={false}
          />
        </div>
      </section>

      <footer className="bg-slate-50 py-6 text-center text-xs text-slate-400">
        <p>Research workspace signals. Not investment advice.</p>
      </footer>
    </main>
  );
};

export default LoginPage;
