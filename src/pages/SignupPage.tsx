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
    <main className="flex min-h-screen select-none flex-col justify-between bg-slate-50 font-sans text-slate-900">
      <TopNav />
      <MobileNav />

      <section className="z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 md:py-24">
        <div className="w-full max-w-md rounded-lg border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-8">
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              STOCKSTORY INDIA
            </span>
          </div>
          <CinematicAuthGateway
            onAuthed={goDashboard}
            initialStage="signup"
            restoreOnMount={false}
          />
        </div>
      </section>

      <footer className="bg-slate-50 py-6 text-center text-xs text-slate-500">
        <p>Research workspace signals. Not investment advice.</p>
      </footer>
    </main>
  );
};

export default SignupPage;
