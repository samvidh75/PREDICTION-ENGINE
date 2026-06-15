import React, { useEffect, useState, useMemo } from "react";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import EmptyState from "../components/ui/EmptyState";
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
    <main className="w-full max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Stock Rankings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sorted by StockStory Engine composite score. Updated daily.
        </p>
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
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
            className="h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-slate-600 transition w-full sm:w-48"
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
        <div className="text-sm text-slate-400 py-12 text-center">Loading rankings...</div>
      ) : filteredRankings.length === 0 ? (
        <EmptyState description="No rankings match your filter criteria or data is unavailable." />
      ) : (
        <Table headers={["Rank", "Symbol", "Company", "Health Score", "Confidence", "Sector"]}>
          {filteredRankings.map((r, index) => {
            const registryInfo = StockRegistry.getStock(r.symbol);
            return (
              <tr
                key={r.symbol}
                className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                onClick={() => setPage("stock", r.symbol)}
              >
                <td className="p-4 font-semibold text-slate-400">#{index + 1}</td>
                <td className="p-4 font-mono font-bold text-white hover:underline">
                  {r.symbol}
                </td>
                <td className="p-4 text-slate-300 max-w-[200px] truncate">
                  {registryInfo?.companyName || "Unavailable"}
                </td>
                <td className="p-4">
                  <ScorePill score={r.ranking_score ?? 0} />
                </td>
                <td className="p-4">
                  <ScorePill score={r.confidence_score ?? 0} />
                </td>
                <td className="p-4">
                  <Badge variant="info">{r.sector || "Unavailable"}</Badge>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </main>
  );
};

export default PublicRankingsPage;
