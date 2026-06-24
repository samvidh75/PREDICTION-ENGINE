import { useEffect, useState } from "react";
import { Bell, Download, Search, Sparkles } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import {
  AISignalBadge,
  ConfidenceRing,
  FactorDots,
  MiniSparkline,
  ScoreBadge,
} from "../components/ui/ResearchUI";
import {
  runCompanyDataPipeline,
  type PipelineResult,
} from "../services/data/CompanyDataPipeline";
import { fChange, fPrice } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";

export { PublicRankingsPage };

const symbols = [
  "TCS",
  "HDFCBANK",
  "RELIANCE",
  "INFY",
  "ICICIBANK",
  "SUNPHARMA",
  "BHARTIARTL",
  "ITC",
  "LT",
  "SBIN",
];
const filters = [
  ["Universe", "India – NSE & BSE", "1,258 companies"],
  ["Score Range", "50 ━━━━━━━━━ 100", ""],
  ["Sector", "All Sectors ›", ""],
  ["Quality", "ROE > 15%, D/E < … ›", ""],
  ["Growth", "Revenue CAGR > 10% ›", ""],
  ["Valuation", "PE < 25, PEG < 1.5 ›", ""],
  ["Momentum", "Price > 20DMA ›", ""],
  ["Market Cap", "Large & Mid Cap ›", ""],
  ["Risk", "Max Drawdown < 25% ›", ""],
];
function ScannerRow({
  result,
  rank,
}: {
  result: PipelineResult | null;
  rank: number;
}) {
  if (!result)
    return (
      <tr className="loading-row">
        <td>{rank}</td>
        <td colSpan={8}>Loading company data…</td>
      </tr>
    );
  const p = result.prediction,
    score = p?.rankingScore ?? null;
  const openResearch = () => productNavigate("stock", result.symbol);
  return (
    <tr
      onClick={openResearch}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openResearch();
        }
      }}
      tabIndex={0}
      aria-label={`Open ${result.symbol} research`}
    >
      <td>{rank}</td>
      <td>
        <div className={`avatar a${rank}`}>{result.symbol.slice(0, 2)}</div>
        <b>{result.symbol}</b>
        <small>{result.companyName ?? "—"}</small>
      </td>
      <td>{result.sector ?? "—"}</td>
      <td>
        <ScoreBadge
          score={score}
          label={
            score === null
              ? "Unavailable"
              : score >= 85
                ? "Excellent"
                : "Very Good"
          }
        />
        <MiniSparkline
          data={result.technicals.closePrices.slice(-20)}
          width={48}
          height={20}
        />
      </td>
      <td className="num">{fPrice(result.price.current)}</td>
      <td
        className={
          result.price.change !== null && result.price.change >= 0
            ? "green"
            : "red"
        }
      >
        {fChange(result.price.change)}%
      </td>
      <td>
        <FactorDots factorScores={p?.factorScores ?? []} />
      </td>
      <td>
        <AISignalBadge classification={p?.classification ?? ""} />
      </td>
      <td>
        <ConfidenceRing confidence={result.dataCompleteness} />
      </td>
    </tr>
  );
}
export default function PublicRankingsPage() {
  const [rows, setRows] = useState<Record<string, PipelineResult | null>>({});
  const [query, setQuery] = useState("");
  const [showChips, setShowChips] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(
      symbols.map(async (s) => [s, await runCompanyDataPipeline(s)] as const),
    )
      .then((items) => {
        if (active) setRows(Object.fromEntries(items));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const visibleSymbols = symbols
    .filter((symbol) => {
      const result = rows[symbol];
      const haystack =
        `${symbol} ${result?.companyName ?? ""} ${result?.sector ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .slice(0, 6);
  const refreshScan = () => {
    setNotice("Refreshing live research…");
    Promise.all(
      symbols.map(
        async (symbol) =>
          [symbol, await runCompanyDataPipeline(symbol)] as const,
      ),
    )
      .then((items) => {
        setRows(Object.fromEntries(items));
        setNotice("Scan refreshed just now.");
      })
      .catch(() => setNotice("The scan could not refresh. Please try again."));
  };
  const saveScreen = () => {
    localStorage.setItem(
      "stockstory-saved-scan",
      JSON.stringify({ query, savedAt: new Date().toISOString() }),
    );
    setNotice("Scan saved to this device.");
  };
  const exportRows = () => {
    const header = "Symbol,Company,Sector,Score,Price,Change\n";
    const body = visibleSymbols
      .map((symbol) => {
        const result = rows[symbol];
        return [
          symbol,
          result?.companyName ?? "",
          result?.sector ?? "",
          result?.prediction?.rankingScore ?? "",
          result?.price.current ?? "",
          result?.price.change ?? "",
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",");
      })
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([header + body], { type: "text/csv" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stockstory-scan.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Scan exported as CSV.");
  };
  return (
    <AppShell active="scanner">
      <div className="scanner-page">
        <aside className="filters">
          <header>
            <div>
              <h2>AI Stock Scanner</h2>
              <span>AI-POWERED</span>
            </div>
            <p>
              Find high-quality, high-conviction stocks using AI & factor
              intelligence.
            </p>
            <button
              onClick={() =>
                setNotice(
                  localStorage.getItem("stockstory-saved-scan")
                    ? "Your saved scan is ready on this device."
                    : "No saved scans yet.",
                )
              }
            >
              ▣ Saved Screens
            </button>
          </header>
          <div className="filter-heading">
            <b>Filters</b>
            <button
              onClick={() => {
                setQuery("");
                setShowChips(true);
                setNotice("Filters reset.");
              }}
            >
              Reset All
            </button>
          </div>
          {filters.map(([a, b, c]) => (
            <button
              className="filter-row"
              key={a}
              onClick={() => setNotice(`${a} filter controls are ready.`)}
            >
              <b>✣ {a}</b>
              <span>{b}</span>
              {c && <small>{c}</small>}
            </button>
          ))}
          <button className="primary run" onClick={refreshScan}>
            Run Scan　✦
          </button>
          <button className="save" onClick={saveScreen}>
            ▣　Save as New Screen
          </button>
        </aside>
        <main className="scan-main">
          <div className="stats-bar">
            {[
              ["Total Companies", "1,258"],
              ["High Conviction", "128"],
              ["Watchlist Matches", "24"],
              ["Live Updates", "Just now"],
            ].map(([a, b], i) => (
              <div key={a}>
                <small>{a}</small>
                <strong className={i === 1 || i === 3 ? "green" : ""}>
                  {b}
                </strong>
                <span>
                  {
                    [
                      "Searched universe",
                      "Score ≥ 80",
                      "In your watchlist",
                      "Real-time data",
                    ][i]
                  }
                </span>
              </div>
            ))}
          </div>
          <div className="scan-controls">
            <label>
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a company e.g. TCS, HDFCBANK"
              />
            </label>
            <select>
              <option>AI Score (High to Low)</option>
            </select>
            <button onClick={exportRows}>
              <Download size={14} /> Export
            </button>
            <button
              onClick={() =>
                setNotice("More scanner controls are coming next.")
              }
              aria-label="More scanner controls"
            >
              •••
            </button>
          </div>
          {notice && (
            <div className="scan-notice" role="status">
              {notice}
            </div>
          )}
          {showChips && (
            <div className="chips">
              <span>AI Score ≥ 50　×</span>
              <span>Market: NSE & BSE　×</span>
              <span>Market Cap: Large, Mid　×</span>
              <button onClick={() => setShowChips(false)}>Clear All</button>
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Rank",
                    "Company",
                    "Sector",
                    "AI Score",
                    "Price (₹)",
                    "1D Change",
                    "Factors",
                    "AI Signal",
                    "Confidence",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSymbols.map((s, i) => (
                  <ScannerRow key={s} rank={i + 1} result={rows[s] ?? null} />
                ))}
              </tbody>
            </table>
            <footer>
              Showing 1 to 6 of 1,258 results{" "}
              <span>
                ‹　 <b>1</b>　2　3　…　210　 ›
              </span>
            </footer>
          </div>
          <div className="analytics">
            <section>
              <b>Factor Distribution</b>
              {["Quality", "Growth", "Valuation", "Momentum", "Risk"].map(
                (x, i) => (
                  <div key={x}>
                    <span>{x}</span>
                    <i>
                      <b style={{ width: `${[86, 84, 77, 82, 76][i]}%` }} />
                    </i>
                    <strong>{[86, 84, 77, 82, 76][i]}</strong>
                  </div>
                ),
              )}
            </section>
            <section>
              <b>Score Heatmap</b>
              <div className="heatmap">
                {Array.from({ length: 40 }, (_, i) => (
                  <i key={i} style={{ opacity: 0.2 + (i % 9) / 11 }} />
                ))}
              </div>
            </section>
            <section className="breadth">
              <b>Market Breadth</b>
              <div>
                <strong className="green">
                  1,856<small>Advances</small>
                </strong>
                <i />
                <strong className="red">
                  1,089<small>Declines</small>
                </strong>
              </div>
            </section>
          </div>
        </main>
        <aside className="insights">
          <h2>
            <Sparkles size={17} /> AI Insights
          </h2>
          <h4>Why these stocks rank high today</h4>
          {[
            ["↗", "Improving Earnings Quality"],
            ["%", "Relative Valuation Edge"],
            ["⌁", "Momentum Strength"],
            ["⬡", "Low Risk Profile"],
          ].map(([i, t]) => (
            <article key={t}>
              <i>{i}</i>
              <div>
                <b>{t}</b>
                <p>
                  Strong company signals and healthy operating leverage across
                  top-ranked stocks.
                </p>
              </div>
            </article>
          ))}
          <section>
            <h3>Top Sectors in Scan</h3>
            {[
              ["IT Services", 86],
              ["Banks", 84],
              ["Pharma", 80],
              ["Auto", 78],
              ["FMCG", 76],
            ].map(([s, n]) => (
              <div className="sector" key={s}>
                <span>{s}</span>
                <i>
                  <b style={{ width: `${n}%` }} />
                </i>
                <strong>{n}</strong>
              </div>
            ))}
          </section>
          <section className="make">
            <Bell />
            <h3>Make it Yours</h3>
            <p>Save this scan and get alerts on matching stocks.</p>
            <button>▣　Save This Scan</button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
