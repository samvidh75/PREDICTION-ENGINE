import React from "react";
import { Database, FileSearch, Scale, ShieldCheck, Workflow, XCircle } from "lucide-react";
import {
  ProductAction,
  ProductHero,
  ProductPage,
  ProductPanel,
  ProductSection,
  ProductShell,
  ProductStatusPill,
  productNavigate,
} from "../components/product/ProductUI";

const does = [
  { icon: FileSearch, title: "Structures research", body: "Company pages organize model state, source availability, and model context." },
  { icon: Database, title: "Transparent about limits", body: "Data limits stay visible. Nothing is fabricated." },
  { icon: Workflow, title: "Connects workflows", body: "Search, rankings, compare, watchlist, and Trust Centre stay one step apart." },
  { icon: ShieldCheck, title: "Transparent research", body: "Methodology, scores, and what we know stay visible. Nothing is hidden." },
];

const principles = [
  "No buy, sell, hold, or trading advice.",
  "No fabricated metrics, rankings, or signals.",
  "No hiding what we don't know.",
  "No broker execution or paywall-first product framing.",
];

export const PublicAboutPage: React.FC = () => (
  <ProductShell>
    <ProductPage>
      <ProductHero
        eyebrow="Mission"
        title="Research intelligence for Indian equities, built around evidence."
        body="StockStory India is a research workspace for understanding companies through source-backed model context. The product is built around transparency, and clear next steps."
        actions={(
          <>
            <ProductAction onClick={() => productNavigate("rankings")}>Open rankings</ProductAction>
            <ProductAction variant="secondary" onClick={() => productNavigate("methodology")}>Open Methodology</ProductAction>
          </>
        )}
        aside={(
          <ProductPanel className="flex min-h-[360px] flex-col justify-between p-5 md:p-6">
            <div>
              <Scale className="h-5 w-5 text-[#2962FF]" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-[#E6EDF3]">Research-only operating principles</h2>
              <div className="mt-5 space-y-2">
                {principles.map((item) => (
                  <div key={item} className="flex gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-xs leading-5 text-[#9AA7B5]">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4">
              <ProductStatusPill tone="verified">Research only</ProductStatusPill>
            </div>
          </ProductPanel>
        )}
      />

      <ProductSection>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">What the product does</h2>
          <p className="mt-1 text-sm text-[#9AA7B5]">Compact product rows instead of empty hero slabs.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {does.map(({ icon: Icon, title, body }) => (
            <ProductPanel key={title} className="flex gap-3 p-4">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">{body}</p>
              </div>
            </ProductPanel>
          ))}
        </div>
      </ProductSection>
    </ProductPage>
  </ProductShell>
);

export default PublicAboutPage;
