import React, { useMemo } from "react";
import { Search, FileSearch, GitCompare, Eye, ArrowRight, BarChart3 } from "lucide-react";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import TopNav from "../components/navigation/TopNav";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { ProductAction, ProductFormPanel, ProductPage, ProductPanel, ProductShell, productNavigate } from "../components/product/ProductUI";

export const SignupPage: React.FC = () => {
  const returnToParam = useMemo(() => new URLSearchParams(window.location.search).get("returnTo"), []);
  const safeReturnTo = useMemo(() => sanitizeReturnTo(returnToParam), [returnToParam]);
  const contextMessage = useMemo(() => getReturnToContext(returnToParam, true), [returnToParam]);

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
      <ProductPage className="grid min-h-[calc(100vh-4rem)] items-center gap-4 md:grid-cols-[0.95fr_440px]" as="section">
        <div className="space-y-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">Get started</div>
          <h2 className="text-2xl font-bold tracking-tight text-[#E8EDF2] md:text-3xl">Build your Indian equity research workspace.</h2>
          <p className="text-sm leading-6 text-[#9AA7B5]">Structured research, company comparisons, and thesis tracking in one place.</p>
          <div className="space-y-3">
            {[
              { icon: Search, label: "Full research rankings", body: "Complete universe of scored equities with multi-factor analysis." },
              { icon: FileSearch, label: "Company research pages", body: "Scores, fundamentals, thesis, and risk factors at a glance." },
              { icon: GitCompare, label: "Compare alternatives", body: "Factor-level comparison to evaluate which company fits your thesis." },
              { icon: Eye, label: "Track thesis changes", body: "Monitor score shifts and risk changes over time." },
              { icon: ArrowRight, label: "Prepare broker handoff", body: "Review all research context before making your decision." },
            ].map(({ icon: Icon, label, body }) => (
              <div key={label} className="flex gap-3 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                <Icon className="mt-0.5 h-4 w-4 text-[#2A6AFF]" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-[#E8EDF2]">{label}</div>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#9AA7B5]">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[#64748B]">
            StockStory provides informational research tools.{' '}
            <button type="button" onClick={() => productNavigate("terms")} className="underline hover:text-[#9AA7B5] transition-colors">Read Terms & Disclosures</button>
          </div>
        </div>
        <ProductFormPanel title="Create your account" body={contextMessage || "Create an account to continue your research."}>
          <CinematicAuthGateway onAuthed={onAuthed} initialStage="signup" restoreOnMount={false} contextMessage={contextMessage} />
          <div className="mt-4 flex justify-center">
            <ProductAction variant="ghost" onClick={() => productNavigate("login")}>Already have an account? Sign in</ProductAction>
          </div>
        </ProductFormPanel>
      </ProductPage>
    </ProductShell>
  );
};

export default SignupPage;
