import React, { useMemo } from "react";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";

export const SignupPage: React.FC = () => {
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
    <main className="flex min-h-screen flex-col justify-between font-sans text-slate-900 antialiased">
      <TopNav />
      <MobileNav />

      <section className="z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 md:py-24">
        <div className="w-full max-w-md rounded-2xl glass-panel-lg p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center">
            <span className="text-base font-semibold tracking-[0.1em] text-slate-700">
              StockStory India
            </span>
            {contextMessage && (
              <p className="mt-2 text-xs text-slate-500 text-center">{contextMessage}</p>
            )}
          </div>
          <CinematicAuthGateway
            onAuthed={onAuthed}
            initialStage="signup"
            restoreOnMount={false}
            contextMessage={contextMessage}
          />
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-slate-400">
        <p>Research signals only. Not investment advice.</p>
      </footer>
    </main>
  );
};

export default SignupPage;
