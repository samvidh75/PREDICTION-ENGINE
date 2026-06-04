// src/pages/PortfolioPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PortfolioSnapshotFactory } from "../services/portfolio/PortfolioSnapshotFactory";
import { PersonalInsightsEngine } from "../services/portfolio/PersonalInsightsEngine";
import PortfolioHealthometer from "../components/portfolio/PortfolioHealthometer";
import StockTimeline from "../components/portfolio/StockTimeline";
import MarketCalendar from "../components/portfolio/MarketCalendar";
import ResearchWorkspace from "../components/portfolio/ResearchWorkspace";
import { AlertEngine } from "../services/portfolio/AlertEngine";
import { PortfolioCoach } from "../services/portfolio/PortfolioCoach";
import { getPortfolioIntelligence } from "../services/intelligence/clientIntelligenceProvider";
import { PortfolioEngine, UserHolding } from "../services/portfolio/PortfolioEngine";
import { Plus, Upload, Trash2, Edit2, X, AlertCircle } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { CompanyCard } from "../components/company/CompanyCard";
import { StockRegistry } from "../services/stocks/StockRegistry";

export const PortfolioPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState(() => PortfolioSnapshotFactory.createSnapshot());
  const [intel, setIntel] = useState<any>(() => getPortfolioIntelligence());

  // Dialog overlays state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UserHolding | null>(null);

  // Form states
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [sector, setSector] = useState("IT");
  const [csvText, setCsvText] = useState("");
  const [importError, setImportError] = useState("");

  const refreshSnapshot = useCallback(() => {
    setSnapshot(PortfolioSnapshotFactory.createSnapshot());
  }, []);

  // Subscribe to changes in portfolio
  useEffect(() => {
    window.addEventListener("portfoliochange", refreshSnapshot);
    return () => window.removeEventListener("portfoliochange", refreshSnapshot);
  }, [refreshSnapshot]);

  // Fetch portfolio intelligence on holdings shift
  useEffect(() => {
    const totalVal = snapshot.holdings.reduce((acc, h) => acc + h.shares * h.avgBuyPrice, 0) || 1;
    const positions = snapshot.holdings.map(h => ({
      symbol: h.symbol,
      weight: (h.shares * h.avgBuyPrice) / totalVal
    }));

    fetch("/api/intelligence/portfolio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ positions })
    })
      .then(res => res.json())
      .then(data => setIntel(data))
      .catch(() => {});
  }, [snapshot.holdings]);

  const insights = useMemo(() => PersonalInsightsEngine.generateInsights(snapshot), [snapshot]);
  const alerts = AlertEngine.getAlerts();

  // Handlers
  const handleAddHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !price) return;
    PortfolioEngine.addHolding({
      symbol: symbol.toUpperCase().trim(),
      shares: parseFloat(shares),
      avgBuyPrice: parseFloat(price),
      sector
    });
    setSymbol("");
    setShares("");
    setPrice("");
    setIsAddOpen(false);
  };

  const handleEditHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolding || !shares || !price) return;
    PortfolioEngine.updateHolding(editingHolding.symbol, parseFloat(shares), parseFloat(price));
    setEditingHolding(null);
    setShares("");
    setPrice("");
  };

  const handleDeleteHolding = (sym: string) => {
    PortfolioEngine.removeHolding(sym);
  };

  const handleCSVImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError("");
    const lines = csvText.split("\n");
    const parsed: UserHolding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",");
      if (parts.length < 3) {
        setImportError(`Row ${i + 1} has insufficient columns (expected Symbol, Shares, Price)`);
        return;
      }
      const symVal = parts[0].trim().toUpperCase();
      const sharesVal = parseFloat(parts[1].trim());
      const priceVal = parseFloat(parts[2].trim());
      const sectorVal = parts[3]?.trim() || "Conglomerate & Diversified";

      if (!symVal || isNaN(sharesVal) || isNaN(priceVal)) {
        setImportError(`Row ${i + 1} has invalid format or NaN values`);
        return;
      }
      parsed.push({ symbol: symVal, shares: sharesVal, avgBuyPrice: priceVal, sector: sectorVal });
    }

    if (parsed.length === 0) {
      setImportError("No valid rows found to import");
      return;
    }

    // Append to existing
    parsed.forEach(h => PortfolioEngine.addHolding(h));
    setIsImportOpen(false);
    setCsvText("");
  };

  return (
    <div className="w-full flex flex-col space-y-8 select-none p-6 md:p-8 bg-[#020304] text-white min-h-screen font-sans relative">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6">
        <div>
          <span className="text-[11px] font-mono font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
            Personal Portfolio Tracker // Portfolio Suite
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Portfolio Centre
          </h2>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="h-9 px-4 bg-cyan-400 text-black font-semibold text-xs rounded-xl flex items-center gap-2 hover:bg-cyan-300 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Holding
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="h-9 px-4 bg-white/5 border border-white/5 text-white/80 font-semibold text-xs rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
        </div>
      </div>

      {/* Portfolio Coach Panel (Intelligence Powered) */}
      <div className="bg-gradient-to-r from-cyan-950/10 to-[#0b0d11] border border-white/5 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 font-mono">Portfolio Analysis Coach</h3>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
            DIVERSIFICATION: {intel?.diversificationStatus?.toUpperCase() || "STABLE"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs leading-relaxed">
          {/* Left: General Narrative */}
          <div className="md:col-span-5 bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
            <span className="text-gray-500 font-bold block uppercase text-[9px] font-mono">Portfolio Narrative</span>
            <p className="text-gray-300">{intel?.portfolioNarrative || "Evaluating portfolio profile..."}</p>
            <div className="pt-2 border-t border-white/5 text-amber-300">
              <span className="text-gray-500 font-bold block uppercase text-[9px] font-mono mb-1">Concentration Risk</span>
              <p className="font-semibold">{intel?.riskConcentration || "Analyzing concentration parameters..."}</p>
            </div>
          </div>

          {/* Middle: Factor Exposure */}
          <div className="md:col-span-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
            <span className="text-gray-500 font-bold block uppercase text-[9px] font-mono">Factor Exposure Profiles</span>
            <div className="space-y-2">
              {Object.entries(intel?.factorExposure || { quality: 50, value: 50, growth: 50, momentum: 50, risk: 50 }).map(([factor, score]) => (
                <div key={factor} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="capitalize text-gray-400">{factor}</span>
                    <span className="font-bold text-white">{(score as number)}/100</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${(score as number)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Sector Exposure */}
          <div className="md:col-span-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
            <span className="text-gray-500 font-bold block uppercase text-[9px] font-mono">Sector Allocations</span>
            <div className="space-y-2.5">
              {Object.entries(intel?.sectorExposure || { IT: 100 }).map(([sectorName, weight]) => (
                <div key={sectorName} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">{sectorName}</span>
                  <span className="font-bold text-cyan-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded font-mono">
                    {(weight as number).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Insights Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border ${
              insight.type === "warning"
                ? "bg-amber-400/5 border-amber-400/20 text-amber-300"
                : insight.type === "positive"
                  ? "bg-emerald-400/5 border-emerald-400/20 text-emerald-300"
                  : "bg-white/5 border-white/5 text-white/90"
            } text-xs leading-relaxed`}
          >
            <span className="font-bold block uppercase text-[8px] mb-1 tracking-widest font-mono">
              {insight.type === "warning" ? "⚠️ Alert" : insight.type === "positive" ? "✓ Insight" : "i Notice"}
            </span>
            {insight.message}
          </div>
        ))}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Col 1: Healthometer & Calendar */}
        <div className="flex flex-col space-y-6">
          <PortfolioHealthometer score={snapshot.health.score} status={snapshot.health.status} />
          <MarketCalendar />
        </div>

        {/* Col 2: Holdings Manager */}
        <div className="flex flex-col space-y-6">
          {/* Performance Summary */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Total Gain & Performance</span>
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-bold font-mono">
                ₹{snapshot.performance.currentValue.toLocaleString("en-IN")}
              </span>
              <span className={`text-sm font-bold font-mono ${snapshot.performance.totalGainPct >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                {snapshot.performance.totalGainPct >= 0 ? "+" : ""}{snapshot.performance.totalGainPct.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Total Cost: <span className="text-white font-bold">₹{snapshot.performance.totalCost.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Holdings List */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Holdings Inventory</span>
            <div className="flex flex-col space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {snapshot.holdings.map((h) => {
                const info = StockRegistry.getStock(h.symbol);
                return (
                  <div key={h.symbol} className="relative group">
                    <CompanyCard
                      ticker={h.symbol}
                      name={info?.companyName || h.symbol}
                      sector={info?.sector || h.sector}
                      marketCap={info?.marketCap.formatted || "₹50,000 Cr"}
                      score={info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : 80}
                      whyItMatters={`Holding: ${h.shares} shares @ ₹${h.avgBuyPrice}. Actively tracked portfolio asset.`}
                      onClick={() => navigateToStock({ ticker: h.symbol, mode: "push" })}
                    />
                    <div className="absolute top-4 right-16 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingHolding(h);
                          setShares(h.shares.toString());
                          setPrice(h.avgBuyPrice.toString());
                        }}
                        className="p-1.5 bg-[#0a0b0e] border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                        title="Edit Holding"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHolding(h.symbol);
                        }}
                        className="p-1.5 bg-[#0a0b0e] border border-white/10 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Delete Holding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Col 3: Alerts & Timeline */}
        <div className="flex flex-col space-y-6">
          <StockTimeline />
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Smart Alerts</span>
            <div className="flex flex-col space-y-3">
              {alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-cyan-400 uppercase font-mono">
                    <span>{a.title}</span>
                    <span className="text-gray-500">{a.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Holding Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add New Holding</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddHolding} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Shares Count</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 10"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Avg Buy Price</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 2450"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Sector Class</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="IT">Information Technology</option>
                  <option value="Energy">Energy & Infrastructure</option>
                  <option value="Banking">Financial & Banking</option>
                  <option value="Defence">Aerospace & Defence</option>
                  <option value="Conglomerate">Conglomerate & Diversified</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-2"
              >
                Add Asset
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Edit Holding: {editingHolding.symbol}</h3>
              <button onClick={() => setEditingHolding(null)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEditHolding} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Shares Count</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Avg Buy Price</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-2"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0e14] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Import Holdings via CSV</h3>
              <button onClick={() => setIsImportOpen(false)} className="text-white/45 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCSVImport} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">
                  Format: Ticker, Shares, Price, Sector (optional)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="e.g.&#10;TCS, 10, 3600, IT&#10;RELIANCE, 20, 2450, Energy&#10;HAL, 5, 3200, Defence"
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono placeholder-white/20 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
              {importError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px] flex items-center gap-1.5 leading-snug">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-1"
              >
                Parse & Import
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Research Workspace Section */}
      <div className="w-full border-t border-white/5 pt-8">
        <ResearchWorkspace />
      </div>
    </div>
  );
};

export default PortfolioPage;
