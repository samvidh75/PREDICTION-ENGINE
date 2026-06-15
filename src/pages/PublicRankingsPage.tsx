import React, { useEffect, useState, useMemo } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import EmptyState from "../components/ui/EmptyState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer } from "../components/ui/PageHeader";
import { StockRegistry } from "../services/stocks/StockRegistry";

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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-900">
      <PageHeader
        title="Research rankings"
        subtitle="Source-backed ranking rows from the intelligence API. Missing values stay unavailable."
        primaryAction={<MissingDataBadge />}
      />

      <div className="my-6 flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search symbol or sector..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold whitespace-nowrap">
            Sector:
          </span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition focus:border-emerald-700 focus:outline-none sm:w-48"
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
        <EmptyState description="No ranking rows match your filters, or ranking data is currently unavailable." />
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
    </main>
  );
};

export default PublicRankingsPage;
