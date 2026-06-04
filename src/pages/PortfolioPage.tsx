import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PortfolioSnapshotFactory } from "../services/portfolio/PortfolioSnapshotFactory";
import { PortfolioEngine, UserHolding } from "../services/portfolio/PortfolioEngine";
import { Plus, Upload, Trash2, Edit2, X, AlertCircle, ArrowUpRight, ArrowDownRight, ShieldAlert } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";

export const PortfolioPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState(() => PortfolioSnapshotFactory.createSnapshot());

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

    parsed.forEach(h => PortfolioEngine.addHolding(h));
    setIsImportOpen(false);
    setCsvText("");
  };

  // Perform dynamic calculations for "What needs attention?" metrics
  const calculatedHoldings = useMemo(() => {
    return snapshot.holdings.map(h => {
      const info = StockRegistry.getStock(h.symbol);
      const currentPrice = info?.fiftyTwoWeekRange.current || h.avgBuyPrice;
      const totalValue = h.shares * currentPrice;
      const costBasis = h.shares * h.avgBuyPrice;
      const gainLossVal = totalValue - costBasis;
      const gainLossPct = costBasis > 0 ? (gainLossVal / costBasis) * 100 : 0;
      return {
        ...h,
        companyName: info?.companyName || h.symbol,
        currentPrice,
        totalValue,
        gainLossVal,
        gainLossPct,
        sector: info?.sector || h.sector || "Other"
      };
    });
  }, [snapshot.holdings]);

  const totalPortfolioValue = useMemo(() => {
    return calculatedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  }, [calculatedHoldings]);

  const bestPerformer = useMemo(() => {
    if (calculatedHoldings.length === 0) return null;
    return [...calculatedHoldings].sort((a, b) => b.gainLossPct - a.gainLossPct)[0];
  }, [calculatedHoldings]);

  const worstPerformer = useMemo(() => {
    if (calculatedHoldings.length === 0) return null;
    return [...calculatedHoldings].sort((a, b) => a.gainLossPct - b.gainLossPct)[0];
  }, [calculatedHoldings]);

  const riskConcentration = useMemo(() => {
    if (calculatedHoldings.length === 0) return { sector: "None", pct: 0 };
    const sectorValues: Record<string, number> = {};
    calculatedHoldings.forEach(h => {
      sectorValues[h.sector] = (sectorValues[h.sector] || 0) + h.totalValue;
    });
    let maxSector = "Other";
    let maxValue = 0;
    Object.entries(sectorValues).forEach(([sec, val]) => {
      if (val > maxValue) {
        maxValue = val;
        maxSector = sec;
      }
    });
    const pct = totalPortfolioValue > 0 ? (maxValue / totalPortfolioValue) * 100 : 0;
    return { sector: maxSector, pct };
  }, [calculatedHoldings, totalPortfolioValue]);

  return (
    <div className="w-full flex flex-col space-y-8 bg-[#020304] text-white min-h-screen font-sans relative max-w-7xl mx-auto antialiased">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
            PORTFOLIO SUITE
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Portfolio Centre
          </h2>
          <p className="text-xs text-white/40 mt-1">
            Real-time exposure auditing. Total Value: ₹{totalPortfolioValue.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="h-9 px-4 bg-cyan-400 text-black font-semibold text-xs rounded-xl flex items-center gap-2 hover:bg-cyan-300 transition-all cursor-pointer font-sans"
          >
            <Plus className="w-3.5 h-3.5" /> Add Holding
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="h-9 px-4 bg-white/5 border border-white/5 text-white/80 font-semibold text-xs rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all cursor-pointer font-sans"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
        </div>
      </div>

      {/* V4 SUMMARY GRID: What needs attention? */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Best Performer */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase text-white/40 font-bold block tracking-wider">Best Performer</span>
            {bestPerformer ? (
              <div className="mt-0.5">
                <span className="text-sm font-bold text-white block">{bestPerformer.symbol}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">+{bestPerformer.gainLossPct.toFixed(1)}% Return</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-white/30 block mt-0.5">No holdings</span>
            )}
          </div>
        </div>

        {/* Worst Performer */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase text-white/40 font-bold block tracking-wider">Worst Performer</span>
            {worstPerformer ? (
              <div className="mt-0.5">
                <span className="text-sm font-bold text-white block">{worstPerformer.symbol}</span>
                <span className="text-xs font-mono font-bold text-rose-400">{worstPerformer.gainLossPct.toFixed(1)}% Return</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-white/30 block mt-0.5">No holdings</span>
            )}
          </div>
        </div>

        {/* Risk Concentration */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase text-white/40 font-bold block tracking-wider">Risk Concentration</span>
            {calculatedHoldings.length > 0 ? (
              <div className="mt-0.5">
                <span className="text-sm font-bold text-white block truncate max-w-[180px]">{riskConcentration.sector}</span>
                <span className="text-xs font-mono font-bold text-cyan-400">{riskConcentration.pct.toFixed(1)}% Allocation</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-white/30 block mt-0.5">No exposure</span>
            )}
          </div>
        </div>
      </div>

      {/* HOLDINGS TABLE */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
        <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Holdings Inventory</span>
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-white/40 font-medium">
                <th className="p-4">Ticker</th>
                <th className="p-4">Allocation</th>
                <th className="p-4">Value</th>
                <th className="p-4">Return</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calculatedHoldings.map((h) => {
                const allocationPct = totalPortfolioValue > 0 
                  ? ((h.totalValue / totalPortfolioValue) * 100).toFixed(1)
                  : "0.0";

                return (
                  <tr 
                    key={h.symbol}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <button
                        onClick={() => navigateToStock({ ticker: h.symbol, mode: "push" })}
                        className="font-mono font-bold text-white hover:text-cyan-400 text-left bg-transparent border-none cursor-pointer"
                      >
                        {h.symbol}
                      </button>
                    </td>
                    <td className="p-4 text-white/70 font-mono">{allocationPct}%</td>
                    <td className="p-4 text-white/80 font-mono">₹{h.totalValue.toLocaleString("en-IN")}</td>
                    <td className={`p-4 font-mono font-bold ${h.gainLossPct >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                      {h.gainLossPct >= 0 ? "+" : ""}{h.gainLossPct.toFixed(1)}%
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingHolding(h);
                            setShares(h.shares.toString());
                            setPrice(h.avgBuyPrice.toString());
                          }}
                          className="p-1.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-white/70 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHolding(h.symbol)}
                          className="p-1.5 bg-white/5 border border-white/5 hover:border-rose-500/20 rounded-lg text-rose-400/60 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RELIANCE"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Shares Count</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 10"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Avg Buy Price</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="e.g. 2450"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Sector Class</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-sans"
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
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-2 cursor-pointer font-sans"
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
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Shares Count</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">Avg Buy Price</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-2 cursor-pointer font-sans"
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
                <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1 font-sans">
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
                className="w-full h-10 bg-cyan-400 text-black font-bold text-xs rounded-xl hover:bg-cyan-300 transition-all mt-1 cursor-pointer font-sans"
              >
                Parse & Import
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
