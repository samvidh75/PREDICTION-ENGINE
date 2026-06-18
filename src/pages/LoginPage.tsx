import React, { useMemo } from "react";
import { Database, FileSearch, ShieldCheck } from "lucide-react";
import CinematicAuthGateway from "../components/auth/CinematicAuthGateway";
import TopNav from "../components/navigation/TopNav";
import { sanitizeReturnTo, getReturnToContext } from "../app/router";
import { ProductAction, ProductFormPanel, ProductPage, ProductProofPanel, ProductShell, productNavigate } from "../components/product/ProductUI";

export const LoginPage: React.FC = () => {
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
          title="Return to a source-backed research workspace."
          rows={[
            { icon: FileSearch, label: "Saved research flow", body: "Open company research, watchlists, rankings, and comparison from one shell." },
            { icon: Database, label: "Coverage limits visible", body: "Missing fundamentals and provider gaps remain labelled in the workspace.", tone: "warning" },
            { icon: ShieldCheck, label: "Research only", body: "The product does not provide trading calls, execution, or fabricated confidence.", tone: "verified" },
          ]}
        />
        <ProductFormPanel title="Sign in" body={contextMessage || "Access your StockStory India research workspace."}>
          <CinematicAuthGateway onAuthed={onAuthed} initialStage="login" restoreOnMount={false} contextMessage={contextMessage} />
          <div className="mt-4 flex justify-center">
            <ProductAction variant="ghost" onClick={() => productNavigate("landing")}>Back to landing</ProductAction>
          </div>
        </ProductFormPanel>
      </ProductPage>
    </ProductShell>
  );
};

export default LoginPage;
