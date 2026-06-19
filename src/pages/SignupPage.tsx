import React, { useMemo } from "react";
import { Database, FileSearch, ShieldCheck } from "lucide-react";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import TopNav from "../components/navigation/TopNav";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { ProductAction, ProductFormPanel, ProductPage, ProductProofPanel, ProductShell, productNavigate } from "../components/product/ProductUI";

export const SignupPage: React.FC = () => {
  const returnToParam = useMemo(() => new URLSearchParams(window.location.search).get("returnTo"), []);
  const safeReturnTo = useMemo(() => sanitizeReturnTo(returnToParam), [returnToParam]);
  const contextMessage = useMemo(() => getReturnToContext(returnToParam), [returnToParam]);

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
    <ProductShell nav={false}>
      <TopNav />
      <ProductPage className="grid min-h-[calc(100vh-4rem)] items-center gap-4 md:grid-cols-[0.95fr_440px]" as="section">
        <ProductProofPanel
          title="Create a workspace around evidence, not market noise."
          rows={[
            { icon: FileSearch, label: "Company research", body: "Search companies and inspect model inputs, confidence, and model context." },
            { icon: Database, label: "Honest data states", body: "No fabricated rankings or filler metrics.", tone: "warning" },
            { icon: ShieldCheck, label: "Trust-first workflow", body: "Use the Trust Centre to inspect source availability and methodology.", tone: "verified" },
          ]}
        />
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
