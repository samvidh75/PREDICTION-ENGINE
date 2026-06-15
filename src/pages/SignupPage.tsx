import React from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";

export const SignupPage: React.FC = () => {
  const goDashboard = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "dashboard");
    window.history.replaceState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <main className="ss-tv-app relative min-h-screen bg-[#0B1018] overflow-hidden text-[#f0f3fa] flex flex-col font-sans antialiased">
      <TopNav />
      <MobileNav />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(41,98,255,0.12)_0%,rgba(255,255,255,0.02)_42%,transparent_100%)] pointer-events-none z-0" />

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2962ff]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9DB5FF]">
              StockStory India
            </span>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-[#101722]/95 p-8 shadow-xl">
            <CinematicAuthGateway onAuthed={goDashboard} initialStage="signup" restoreOnMount={false} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default SignupPage;
