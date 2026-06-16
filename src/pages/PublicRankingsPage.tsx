import React, { useEffect, useState, useMemo } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer } from "../components/ui/PageHeader";
import { StockRegistry } from "../services/stocks/StockRegistry";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import tokens from "../components/ui/tokens";

interface RankingEntry {
  symbol: string;
  ranking_score?: number;
  confidence_score?: number;
  classification?: string;
  sector?: string;
}

export const PublicRankingsPage: React.FC = () => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");

  useEffect(() => {
    let active = true;
    fetch("/api/intelligence/leaderboard?limit=100", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("LEADERBOARD_UNAVAILABLE");
        const body = await response.json();
        return Array.isArray(body) ? body : [];
      })
      .then((body) => {
        if (!active) return;
        setRankings(body);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRankings([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    rankings.forEach((r) => {
      if (r.sector) set.add(r.sector);
    });
    return ["all", ...Array.from(set)];
  }, [rankings]);

  const filteredRankings = useMemo(() => {
    return rankings.filter((r) => {
      const matchSearch =
        r.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        (r.sector && r.sector.toLowerCase().includes(searchText.toLowerCase()));
      const matchSector = sectorFilter === "all" || r.sector === sectorFilter;
      return matchSearch && matchSector;
    });
  }, [rankings, searchText, sectorFilter]);

  const setPage = (pageKey: string, symbol?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    if (symbol) params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav />
      <MobileNav />
      <div className={`${tokens.layout.container} pt-[76px] md:pt-28`}>
        <PageHeader
          title="Research rankings"
          subtitle="Rankings will appear here when source-backed scoring has produced verified company snapshots."
          primaryAction={<MissingDataBadge />}
        />

      <div className="my-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row">
        <div className="w-full sm:w-72">
          <Input
            aria-label="Search rankings by symbol or sector"
            placeholder="Search symbol or sector..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="whitespace-nowrap text-xs font-medium text-slate-500">
            Sector:
          </span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 transition focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 sm:w-48"
          >
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "all" ? "All Sectors" : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading rankings...</div>
      ) : filteredRankings.length === 0 ? (
        <div className="flex flex-col gap-5">
          <EmptyState
            title="Verified rankings are being prepared"
            description="Rankings will appear here when source-backed scoring has produced verified company snapshots. No placeholder data or fabricated scores are shown."
          />
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
            <Button
              type="button"
              onClick={() => setPage("signup")}
              className="h-10 px-4 text-xs"
            >
              Create free account
            </Button>
            <Button
              type="button"
              onClick={() => setPage("methodology")}
              variant="secondary"
              className="h-10 px-4 text-xs"
            >
              View scoring methodology
            </Button>
          </div>
        </div>
      ) : (
        <Table headers={["Rank", "Symbol", "Company", "Score", "Confidence", "Sector"]}>
          {filteredRankings.map((r, index) => {
            const registryInfo = StockRegistry.getStock(r.symbol);
            return (
              <tr
                key={r.symbol}
                className="cursor-pointer transition-colors hover:bg-slate-50"
                onClick={() => setPage("stock", r.symbol)}
              >
                <td className="p-4 font-semibold text-slate-500">#{index + 1}</td>
                <td className="p-4 font-mono font-bold text-slate-950 hover:underline">
                  {r.symbol}
                </td>
                <td className="max-w-[200px] truncate p-4 text-slate-700">
                  {registryInfo?.companyName || "Unavailable"}
                </td>
                <td className="p-4">
                  {typeof r.ranking_score === "number" && Number.isFinite(r.ranking_score) ? (
                    <ScorePill score={Math.round(r.ranking_score)} />
                  ) : (
                    <MissingDataBadge />
                  )}
                </td>
                <td className="p-4">
                  {typeof r.confidence_score === "number" && Number.isFinite(r.confidence_score) ? (
                    <ScorePill score={Math.round(r.confidence_score)} />
                  ) : (
                    <MissingDataBadge />
                  )}
                </td>
                <td className="p-4">
                  <Badge variant="info">{r.sector || "Not available"}</Badge>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      <div className="mt-6">
        <ResearchDisclaimer />
      </div>
      </div>
    </main>
  );
};

export default PublicRankingsPage;
