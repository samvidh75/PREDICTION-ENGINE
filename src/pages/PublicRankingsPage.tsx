import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Trophy, Lock, ArrowRight, Search, Info } from "lucide-react";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductHero, ProductSection, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { useAuth } from "../context/AuthContext";
import { api, type ScannerResultItem } from "../services/api/client";

export const PublicRankingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [rankings, setRankings] = useState<ScannerResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    if (isAuthenticated) {
      api.getScanner("Quality compounders", 50)
        .then((res) => {
          if (ctrl.signal.aborted) return;
          setRankings(res.data ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          setRankings([]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => ctrl.abort();
  }, [isAuthenticated]);

  return (
    <ProductShell>
      <ProductPage>
        {!isAuthenticated ? (
          <>
            <ProductHero
              eyebrow="Research rankings"
              title="See how companies rank."
              body="Full research rankings, scores, conviction labels, and peer comparisons are available after signing in. Sign up to unlock the full view."
              actions={(
                <>
                  <ProductAction onClick={() => productNavigate("signup")}>Create account to view rankings</ProductAction>
                  <ProductAction variant="secondary" onClick={() => productNavigate("login")}>Sign in</ProductAction>
                </>
              )}
              aside={(
                <ProductPanel className="flex min-h-[240px] flex-col justify-between p-5 md:p-6">
                  <div>
                    <Lock className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
                    <h2 className="mt-3 text-lg font-semibold text-[#E6EDF3]">Rankings are part of the product experience.</h2>
                    <p className="mt-2 text-xs leading-5 text-[#9AA7B5]">
                      After signing in, you get full access to company rankings, research scores, sector breakdowns, conviction labels, and comparison tools.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ProductStatusPill tone="verified">Research scores</ProductStatusPill>
                    <ProductStatusPill tone="blue">Sector breakdown</ProductStatusPill>
                    <ProductStatusPill tone="muted">Peer comparison</ProductStatusPill>
                  </div>
                </ProductPanel>
              )}
            />

            <ProductSection>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#E6EDF3]">What unlocks after sign-in</h2>
                <p className="mt-1 text-sm text-[#9AA7B5]">Rankings are one part of a broader research workflow.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ProductPanel className="p-4">
                  <Trophy className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">Full rankings table</h3>
                  <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">See every scored company with rank, score, conviction, and sector context.</p>
                </ProductPanel>
                <ProductPanel className="p-4">
                  <Search className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">Company research pages</h3>
                  <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">Open any company to see scores, fundamentals, thesis, and risk factors.</p>
                </ProductPanel>
                <ProductPanel className="p-4">
                  <ArrowRight className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
                  <h3 className="mt-2 text-sm font-semibold text-[#E6EDF3]">Compare & track</h3>
                  <p className="mt-1 text-xs leading-5 text-[#9AA7B5]">Compare companies side-by-side and track thesis changes over time.</p>
                </ProductPanel>
              </div>
            </ProductSection>
          </>
        ) : loading ? (
          <div className="py-12 text-center text-sm text-[#9AA7B5]" role="status" aria-live="polite">Loading rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col gap-5">
            <div className="py-12 text-center">
              <Info className="mx-auto h-6 w-6 text-[#64748B]" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-[#E6EDF3]">Rankings pending</h2>
              <p className="mt-2 text-xs text-[#9AA7B5]">Rankings appear after the research engine completes its latest cycle.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-[#E6EDF3]">Research rankings</h1>
              <p className="mt-1 text-sm text-[#9AA7B5]">Companies ranked by research score. Click any entry to open research.</p>
            </div>
            <div className="space-y-2">
              {rankings.slice(0, 50).map((entry) => {
                const score = entry.score;
                return (
                  <ProductPanel key={entry.symbol} as="article" className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-base font-semibold text-[#E6EDF3]">{entry.symbol}</span>
                          {entry.rank && (
                            <span className="text-[10px] font-medium text-[#64748B]">#{entry.rank}</span>
                          )}
                        </div>
                        <p className="truncate text-sm text-[#9AA7B5]">{entry.companyName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {entry.sector && (
                            <span className="rounded-sm bg-[rgba(148,163,184,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">{entry.sector}</span>
                          )}
                          {score !== null && (
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                              score >= 70 ? "bg-[rgba(22,163,74,0.12)] text-[#16A34A]" :
                              score >= 50 ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]" :
                              "bg-[rgba(148,163,184,0.08)] text-[#64748B]"
                            }`}>
                              {Math.round(score)}
                            </span>
                          )}
                          {entry.conviction && (
                            <span className="rounded-sm bg-[rgba(41,98,255,0.08)] px-1.5 py-0.5 text-[10px] font-medium text-[#2962FF]">{entry.conviction}</span>
                          )}
                        </div>
                        {entry.oneLineThesis && (
                          <p className="mt-2 text-[11px] leading-4 text-[#64748B]">{entry.oneLineThesis}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[rgba(148,163,184,0.08)] pt-3">
                      <button
                        type="button"
                        onClick={() => productNavigate("stock", entry.symbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2962FF] bg-[rgba(41,98,255,0.12)] px-3 text-[11px] font-semibold text-white hover:bg-[rgba(41,98,255,0.2)] transition-colors"
                      >
                        Research
                      </button>
                      <button
                        type="button"
                        onClick={() => productNavigate("compare", entry.symbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                      >
                        Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => productNavigate("stock", entry.symbol)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-3 text-[11px] font-medium text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </ProductPanel>
                );
              })}
            </div>
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default PublicRankingsPage;
