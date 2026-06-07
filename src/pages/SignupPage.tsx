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
    <main className="ss-tv-app relative min-h-screen bg-[#0f0f0f] overflow-hidden text-[#f0f3fa] flex flex-col font-sans select-none antialiased [text-rendering:geometricPrecision]">
      <TopNav />
      <MobileNav />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(41,98,255,0.16)_0%,rgba(255,255,255,0.015)_48%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,123,134,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,123,134,0.10)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-24">
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2e39] bg-[#131722]/80 backdrop-blur-md mb-6 animate-[fadeIn_250ms_ease-out]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2962ff]" />
            <span className="text-[10px] tracking-[0.25em] font-mono text-[#7da0ff] font-semibold uppercase">
              STOCKSTORY INDIA
            </span>
          </div>

          <div className="w-full bg-[#131722] border border-[#2a2e39] backdrop-blur-md rounded-2xl p-8 shadow-2xl">
            <CinematicAuthGateway onAuthed={goDashboard} initialStage="signup" />
          </div>
        </div>
      </section>
    </main>
  );
};

export default SignupPage;
