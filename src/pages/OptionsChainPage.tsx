import { useState, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, TrendingDown, Minus, BarChart3, DollarSign, Activity, Hash, Zap, Sigma, Timer, Waves } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { colors, typography, radius } from "../design/tokens";
import { optionsChainService, type OptionContract, type OptionsChain } from "../services/options/OptionsChainService";

const SAMPLE_SYMBOLS = ["HBL", "ENGRO", "UBL", "MCB", "OGDC", "PPL", "FFC", "LUCK", "HUBC", "EFERT"];

function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function contractColor(contract: OptionContract, underlying: number): string {
  if (contract.type === "CE") {
    if (contract.strike < underlying) return colors.marketGreen;
    if (contract.strike === underlying) return colors.warning;
    return colors.marketRed;
  }
  if (contract.strike > underlying) return colors.marketGreen;
  if (contract.strike === underlying) return colors.warning;
  return colors.marketRed;
}

function contractBg(contract: OptionContract, underlying: number): string {
  if (contract.type === "CE") {
    if (contract.strike < underlying) return colors.marketGreenSoft;
    if (contract.strike === underlying) return colors.accentYellowSoft;
    return colors.marketRedSoft;
  }
  if (contract.strike > underlying) return colors.marketGreenSoft;
  if (contract.strike === underlying) return colors.accentYellowSoft;
  return colors.marketRedSoft;
}

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState("HBL");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof SAMPLE_SYMBOLS>([]);
  const [chain, setChain] = useState<OptionsChain | null>(null);
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("strike");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"side" | "combined">("side");

  const underlyingPrice = chain?.underlyingPrice ?? 0;

  useEffect(() => {
    if (query.trim().length < 1) { setSearchResults([]); return; }
    const q = query.trim().toUpperCase();
    const timer = setTimeout(() => {
      setSearchResults(SAMPLE_SYMBOLS.filter((s) => s.includes(q)).slice(0, 6));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const timer = setTimeout(() => {
        const selectedExpiry = expiry || "2026-07-31";
        const result = optionsChainService.generateChain(symbol, 1000 + Math.random() * 500, selectedExpiry);
        setChain(result);
        if (!expiry) setExpiry(selectedExpiry);
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } catch {
      setError("Failed to load options chain");
      setLoading(false);
    }
  }, [symbol, expiry]);

  const selectSymbol = (sym: string) => {
    setSymbol(sym);
    setQuery("");
    setSearchResults([]);
  };

  const pcrAnalysis = chain ? optionsChainService.analyzePCRatio(chain) : null;

  const sortContracts = (contracts: OptionContract[]): OptionContract[] => {
    return [...contracts].sort((a, b) => {
      const aVal = a[sortField as keyof OptionContract] as number;
      const bVal = b[sortField as keyof OptionContract] as number;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const TableHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{
        padding: "10px 8px", fontSize: 11, fontWeight: 600, color: colors.textTertiary,
        textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right",
        borderBottom: `1px solid ${colors.border}`, cursor: "pointer", whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {label}
      {sortField === field && (
        <span style={{ marginLeft: 2, color: colors.primary }}>
          {sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </span>
      )}
    </th>
  );

  const columns = ["strike", "ltp", "change", "openInterest", "oiChange", "iv", "delta", "gamma", "theta", "vega"];

  const renderContracts = (contracts: OptionContract[], type: "CE" | "PE") => {
    const sorted = sortContracts(contracts);
    return (
      <div style={{ overflowX: "auto", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <TableHeader field="strike" label="Strike" />
              <TableHeader field="ltp" label="LTP" />
              <TableHeader field="change" label="Chg" />
              <TableHeader field="openInterest" label="OI" />
              <TableHeader field="oiChange" label="OI Chg" />
              <TableHeader field="iv" label="IV%" />
              <TableHeader field="delta" label="Δ" />
              <TableHeader field="gamma" label="Γ" />
              <TableHeader field="theta" label="Θ" />
              <TableHeader field="vega" label="V" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={`${c.strike}-${c.type}`}
                style={{
                  borderBottom: `1px solid ${colors.hairline}`,
                  background: contractBg(c, underlyingPrice),
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.surfaceElevated}
                onMouseLeave={(e) => e.currentTarget.style.background = contractBg(c, underlyingPrice)}
              >
                <td style={{
                  padding: "8px", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: c.strike === chain?.maxPain ? colors.warning : contractColor(c, underlyingPrice),
                  borderRight: `1px solid ${colors.hairline}`,
                }}>
                  {c.strike === chain?.maxPain && <Zap size={10} style={{ marginRight: 2, verticalAlign: "middle", color: colors.warning }} />}
                  {c.strike}
                </td>
                <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(c.ltp)}
                </td>
                <td style={{
                  padding: "8px", textAlign: "right", fontWeight: 500, fontVariantNumeric: "tabular-nums",
                  color: c.change >= 0 ? colors.marketGreen : colors.marketRed,
                }}>
                  {c.change >= 0 ? "+" : ""}{formatNumber(c.change, 1)}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                  {(c.openInterest / 100000).toFixed(1)}L
                </td>
                <td style={{
                  padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  color: c.oiChange >= 0 ? colors.marketGreen : colors.marketRed,
                }}>
                  {c.oiChange >= 0 ? "+" : ""}{c.oiChange > 0 ? "+" : ""}{(c.oiChange / 1000).toFixed(0)}K
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(c.iv, 0)}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                  {c.delta.toFixed(3)}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                  {c.gamma.toFixed(5)}
                </td>
                <td style={{
                  padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  color: c.theta < 0 ? colors.marketRed : colors.marketGreen,
                }}>
                  {formatNumber(c.theta)}
                </td>
                <td style={{ padding: "8px", textAlign: "right", color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(c.vega)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (error) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        <Card><div style={{ textAlign: "center", padding: "40px", color: colors.danger }}><AlertTriangle size={24} /><p style={{ marginTop: 12 }}>{error}</p></div></Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gap: 16 }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <BarChart3 size={24} color={colors.primary} /> Options Chain
        </h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 1 200px" }}>
            <input
              placeholder="Search symbol…"
              value={query || symbol}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                height: 36, width: "100%", borderRadius: radius.md,
                border: `1px solid ${colors.border}`, padding: "0 12px 0 32px",
                fontSize: 13, color: colors.textPrimary, background: colors.surface,
                outline: "none", boxSizing: "border-box",
              }}
            />
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: colors.textTertiary, pointerEvents: "none" }} />
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                background: colors.card, border: `1px solid ${colors.border}`, borderRadius: radius.md, zIndex: 10, overflow: "hidden",
              }}>
                {searchResults.map((s) => (
                  <button key={s} onClick={() => selectSymbol(s)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", border: "none", borderBottom: `1px solid ${colors.hairline}`,
                      background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13,
                      color: colors.textPrimary,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.fill}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            style={{
              height: 36, borderRadius: radius.md, border: `1px solid ${colors.border}`,
              padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            <button onClick={() => setViewMode("side")}
              style={{
                padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`,
                background: viewMode === "side" ? colors.primary : "transparent",
                color: viewMode === "side" ? colors.onPrimary : colors.textSecondary,
                cursor: "pointer", fontSize: 11, fontWeight: 600,
              }}
            >Side by Side</button>
            <button onClick={() => setViewMode("combined")}
              style={{
                padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`,
                background: viewMode === "combined" ? colors.primary : "transparent",
                color: viewMode === "combined" ? colors.onPrimary : colors.textSecondary,
                cursor: "pointer", fontSize: 11, fontWeight: 600,
              }}
            >Combined</button>
          </div>
        </div>
      </section>

      {chain && pcrAnalysis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Underlying</CardLabel>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary }}>₱{formatNumber(underlyingPrice, 0)}</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>PCR (OI)</CardLabel>
            <span style={{ fontSize: 20, fontWeight: 700, color: pcrAnalysis.signal === "bullish" ? colors.marketGreen : pcrAnalysis.signal === "bearish" ? colors.marketRed : colors.warning }}>
              {pcrAnalysis.ratio.toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 6 }}>
              {pcrAnalysis.signal === "bullish" ? <TrendingUp size={12} /> : pcrAnalysis.signal === "bearish" ? <TrendingDown size={12} /> : <Minus size={12} />}
              {" "}{pcrAnalysis.signal}
            </span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Max Pain</CardLabel>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.warning }}>₱{chain.maxPain}</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Total Call OI</CardLabel>
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.marketGreen }}>{(chain.totalCallOI / 1000000).toFixed(1)}M</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Total Put OI</CardLabel>
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.marketRed }}>{(chain.totalPutOI / 1000000).toFixed(1)}M</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Expiry</CardLabel>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>{chain.selectedExpiry}</span>
          </Card>
        </div>
      )}

      {pcrAnalysis && (
        <Card style={{ padding: "12px 16px", borderLeft: `3px solid ${pcrAnalysis.signal === "bullish" ? colors.marketGreen : pcrAnalysis.signal === "bearish" ? colors.marketRed : colors.warning}` }}>
          <p style={{ fontSize: 12, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>{pcrAnalysis.description}</p>
        </Card>
      )}

      {loading ? (
        <Card><div style={{ textAlign: "center", padding: "60px 0", color: colors.textSecondary, fontSize: 13 }}>Loading options chain…</div></Card>
      ) : chain ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: viewMode === "side" ? "1fr 1fr" : "1fr", gap: 16 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px", borderBottom: `1px solid ${colors.border}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <TrendingUp size={14} color={colors.marketGreen} />
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.marketGreen, textTransform: "uppercase", letterSpacing: "0.04em" }}>CALLS</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: "auto" }}>{chain.calls.length} strikes</span>
              </div>
              {renderContracts(chain.calls, "CE")}
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                padding: "10px 16px", borderBottom: `1px solid ${colors.border}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <TrendingDown size={14} color={colors.marketRed} />
                <span style={{ fontSize: 13, fontWeight: 700, color: colors.marketRed, textTransform: "uppercase", letterSpacing: "0.04em" }}>PUTS</span>
                <span style={{ fontSize: 11, color: colors.textTertiary, marginLeft: "auto" }}>{chain.puts.length} strikes</span>
              </div>
              {renderContracts(chain.puts, "PE")}
            </Card>
          </div>
          <p style={{ fontSize: 11, color: colors.textTertiary, textAlign: "center", margin: 0 }}>
            ITM <span style={{ color: colors.marketGreen }}>●</span> · ATM <span style={{ color: colors.warning }}>●</span> · OTM <span style={{ color: colors.marketRed }}>●</span> · Max Pain <Zap size={10} color={colors.warning} />
            {" · "}Updated: {chain.timestamp ? new Date(chain.timestamp).toLocaleTimeString() : "—"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
