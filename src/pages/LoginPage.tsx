import React, { useMemo } from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { IntegrityStrip, PremiumPage, Surface } from "../components/premium/PremiumUI";

export const LoginPage: React.FC = () => {
  const returnToParam = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("returnTo");
  }, []);

  const safeReturnTo = useMemo(() => sanitizeReturnTo(returnToParam), [returnToParam]);
  const contextMessage = useMemo(() => getReturnToContext(returnToParam), [returnToParam]);

  const onAuthed = () => {
    if (safeReturnTo) {
      window.history.replaceState({}, "", safeReturnTo);
    } else {
      const params = new URLSearchParams(window.location.search);
      params.delete("returnTo");
      params.set("page", "dashboard");
      window.history.replaceState({}, "", `?${params.toString()}`);
    }
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <PremiumPage className="flex flex-col justify-between">
      <TopNav />
      <MobileNav />

      <section className="z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-5 py-24 md:grid-cols-[1fr_440px] md:py-32">
        <Surface dark className="hidden min-h-[520px] p-8 md:flex md:flex-col md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#2962FF]">Secure research access</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Return to your command centre.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/70">Search companies, save watchlists, and inspect source-backed research changes. No advisory claims, no fabricated data.</p>
          </div>
          <IntegrityStrip />
        </Surface>
        <Surface strong className="w-full p-6 sm:p-8">
          <div className="mb-6 flex flex-col">
            <span className="text-base font-semibold tracking-tight text-slate-950">StockStory<span className="text-[#2962FF]">.</span></span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">Sign in</h2>
            {contextMessage && (
              <p className="mt-2 text-xs text-center" style={{ color: "#536471" }}>{contextMessage}</p>
            )}
          </div>
          <CinematicAuthGateway
            onAuthed={onAuthed}
            initialStage="login"
            restoreOnMount={false}
            contextMessage={contextMessage}
          />
        </Surface>
      </section>

      <footer className="py-6 text-center text-xs" style={{ color: "#8b98a5" }}>
        <p>Research signals only. Not investment advice.</p>
      </footer>
    </PremiumPage>
  );
};

export default LoginPage;
