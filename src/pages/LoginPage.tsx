import React, { useMemo } from "react";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import AuthResearchInfographic from "../components/auth/AuthResearchInfographic";
import TopNav from "../components/navigation/TopNav";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { ProductAction, ProductFormPanel, ProductPage, ProductShell, productNavigate } from "../components/product/ProductUI";

export const LoginPage: React.FC = () => {
  const returnToParam = useMemo(() => new URLSearchParams(window.location.search).get("returnTo"), []);
  const safeReturnTo = useMemo(() => sanitizeReturnTo(returnToParam), [returnToParam]);
  const contextMessage = useMemo(() => getReturnToContext(returnToParam, false), [returnToParam]);

  const onAuthed = () => {
    if (safeReturnTo) {
      window.history.replaceState({}, "", safeReturnTo);
    } else {
      productNavigate("dashboard");
      return;
    }
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <ProductShell>
      <TopNav />
      <ProductPage className="grid min-h-[calc(100vh-4rem)] items-center gap-6 md:grid-cols-[1fr_420px]" as="section">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Research workspace</div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-3xl">Initialize your research session.</h2>
            <p className="max-w-lg text-sm leading-6 text-[var(--color-text-secondary)]">Company health, valuation context, risk signals — everything ready to review.</p>
          </div>

          <AuthResearchInfographic mode="login" />

          <div className="flex flex-wrap gap-3 text-xs text-[#64748B]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> Research-first</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#3B66F6]" /> Broker handoff</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#64748B]" /> No trading calls</span></div>
        </div>
        <ProductFormPanel title="Initialize Session" body={contextMessage || "Sign in to continue your research."}>
          <CinematicAuthGateway onAuthed={onAuthed} initialStage="login" restoreOnMount={false} contextMessage={contextMessage} />
          <div className="mt-4 flex flex-col items-center gap-2">
            <ProductAction variant="ghost" onClick={() => productNavigate("signup")}>Need an account? Create one</ProductAction>
            <ProductAction variant="ghost" onClick={() => productNavigate("scanner")}>Continue as guest →</ProductAction>
          </div>
        </ProductFormPanel>
      </ProductPage>
    </ProductShell>
  );
};

export default LoginPage;
