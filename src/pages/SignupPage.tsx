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
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between select-none">
      <TopNav />
      <MobileNav />

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24 z-10">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-black/20">
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs tracking-widest font-semibold text-slate-400 uppercase">
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

      <footer className="py-6 text-center text-xs text-slate-600 bg-slate-950">
        <p>Research workspace signals. Not investment advice.</p>
      </footer>
    </main>
  );
};

export default SignupPage;
