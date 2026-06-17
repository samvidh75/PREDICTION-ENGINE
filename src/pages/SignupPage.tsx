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
    <main
      className="flex min-h-screen flex-col justify-between antialiased"
      style={{ background: "#f7f8fb", color: "#0f1419", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <TopNav />
      <MobileNav />

      <section className="z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 md:py-24">
        <div
          className="w-full max-w-md rounded-2xl p-6 sm:p-8"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div className="mb-6 flex flex-col items-center">
            <span className="text-base font-semibold tracking-[0.08em]" style={{ color: "#0f1419" }}>
              StockStory India
            </span>
            {contextMessage && (
              <p className="mt-2 text-xs text-center" style={{ color: "#536471" }}>{contextMessage}</p>
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

      <footer className="py-6 text-center text-xs" style={{ color: "#8b98a5" }}>
        <p>Research signals only. Not investment advice.</p>
      </footer>
    </main>
  );
};

export default SignupPage;
