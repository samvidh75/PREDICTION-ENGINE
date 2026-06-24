import { useState } from "react";
import { Check, GitCompare, Shield, Sparkles, Star, X } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { Card, MiniSparkline, ScoreRing } from "../components/ui/ResearchUI";
import { useStockData } from "../hooks/useStockData";
import { getStockTicker } from "../app/router";
import { fMarketCap, fPrice, fRatio } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";
import {
  addTrackedCompany,
  isTracked,
  removeTrackedCompany,
} from "../lib/track/trackStore";
import { InvestmentReviewSheet } from "../premium/PremiumComponents";

const fallbackTicker = "TCS",
  factorNames = ["quality", "growth", "valuation", "risk", "momentum"];
const nice = (v: number | null | undefined, suffix = "") =>
  v === null || v === undefined ? "—" : `${v.toFixed(1)}${suffix}`;
function FactorPanel({
  factors,
}: {
  factors: NonNullable<
    NonNullable<ReturnType<typeof useStockData>["pipeline"]>["prediction"]
  >["factorScores"];
}) {
  return (
    <div className="stock-factors">
      {factorNames.map((n) => {
        const v = factors.find((f) => f.group === n)?.value ?? null;
        return (
          <div key={n}>
            <span>{n[0].toUpperCase() + n.slice(1)}</span>
            <i>
              <b style={{ width: `${v ?? 0}%` }} />
            </i>
            <strong>{v === null ? "—" : Math.round(v)}　›</strong>
          </div>
        );
      })}
    </div>
  );
}
export default function StockStoryPageF0() {
  const ticker = getStockTicker() || fallbackTicker;
  const { pipeline, loading } = useStockData(ticker);
  const [tab, setTab] = useState("Thesis");
  const [tracked, setTracked] = useState(() => isTracked(ticker));
  const [reviewOpen, setReviewOpen] = useState(false);
  const pred = pipeline?.prediction,
    score = pred?.rankingScore ?? null,
    f = pipeline?.fundamentals,
    prices = pipeline?.technicals.closePrices ?? [];
  const strengths = pred?.keyStrengths?.slice(0, 4) ?? [],
    risks = pred?.keyRisks?.slice(0, 4) ?? [];
  return (
    <AppShell active="research">
      <div className="stock-page">
        <div className="breadcrumb">
          Home　›　Research　›　{pipeline?.sector ?? "Company"}　›　{ticker}
        </div>
        <section className="stock-hero">
          <div className="identity">
            <div className="company-row">
              <div className="company-logo">{ticker.slice(0, 3)}</div>
              <div>
                <h1>{pipeline?.companyName ?? ticker}</h1>
                <p>
                  <b>{ticker}</b>　
                  <span>{pipeline?.price.exchange ?? "NSE"}</span>　
                  <small>Equity research</small>
                </p>
              </div>
            </div>
            <div className="stock-actions">
              <button
                onClick={() => {
                  if (tracked) removeTrackedCompany(ticker);
                  else
                    addTrackedCompany({
                      symbol: ticker,
                      companyName: pipeline?.companyName ?? ticker,
                      addedAt: new Date().toISOString(),
                      source: "stock_page",
                    });
                  setTracked(!tracked);
                }}
              >
                <Star size={15} /> {tracked ? "Following" : "Follow"}
              </button>
              <button onClick={() => productNavigate("compare", ticker)}>
                <GitCompare size={15} /> Compare
              </button>
              <button className="primary" onClick={() => setTab("Thesis")}>
                View Full Thesis　↗
              </button>
              <button className="primary" onClick={() => setReviewOpen(true)}>
                Invest review
              </button>
            </div>
          </div>
          <div className="price-block">
            <span>● Live</span>
            <strong className="num">{fPrice(pipeline?.price.current)}</strong>
            <b
              className={
                pipeline?.price.change !== null &&
                pipeline?.price.change !== undefined &&
                pipeline.price.change < 0
                  ? "red"
                  : "green"
              }
            >
              {pipeline?.price.changeAbs !== null &&
              pipeline?.price.changeAbs !== undefined
                ? (pipeline.price.changeAbs >= 0 ? "+" : "") +
                  pipeline.price.changeAbs.toFixed(2)
                : "—"}{" "}
              (
              {pipeline?.price.change !== null &&
              pipeline?.price.change !== undefined
                ? (pipeline.price.change >= 0 ? "+" : "") +
                  pipeline.price.change.toFixed(2) +
                  "%"
                : "—"}
              )
            </b>
            <dl>
              <dt>Market Cap</dt>
              <dd>{fMarketCap(pipeline?.price.marketCap)}</dd>
              <dt>Sector</dt>
              <dd>{pipeline?.sector ?? "—"}</dd>
              <dt>Data as of</dt>
              <dd>
                {pipeline?.fetchedAt
                  ? new Date(pipeline.fetchedAt).toLocaleString("en-IN")
                  : "—"}
              </dd>
            </dl>
          </div>
          <Card className="score-panel">
            <h3>StockStory Score　ⓘ</h3>
            <div>
              <section>
                <ScoreRing score={score} size={116} strokeWidth={9} />
                <small>
                  Research confidence:{" "}
                  <b>
                    {(pipeline?.dataCompleteness ?? 0) >= 75
                      ? "High"
                      : (pipeline?.dataCompleteness ?? 0) >= 50
                        ? "Moderate"
                        : "Building"}
                  </b>
                </small>
              </section>
              <FactorPanel factors={pred?.factorScores ?? []} />
            </div>
          </Card>
        </section>
        <nav className="stock-tabs">
          {[
            "Thesis",
            "Fundamentals",
            "Financials",
            "Risks",
            "Technicals",
            "News",
            "Peers",
          ].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </nav>
        {loading ? (
          <div className="page-loading">Loading live company research…</div>
        ) : (
          <div className="stock-body">
            <main>
              <div className="top-panels">
                <Card className="thesis">
                  <header>
                    <h2>
                      <Sparkles size={17} /> AI Investment Thesis
                    </h2>
                    <small>Research summary</small>
                  </header>
                  <div className="thesis-lead">
                    {pred?.explanation ??
                      "AI thesis is being generated for this company. Check back shortly."}
                  </div>
                  {(strengths.length
                    ? strengths
                    : [
                        "Company research signals are being evaluated.",
                        "Financial quality is checked against sector peers.",
                        "Valuation and momentum are monitored continuously.",
                      ]
                  ).map((x) => (
                    <p key={x}>
                      <Check size={14} />
                      {x}
                    </p>
                  ))}
                  <button onClick={() => setTab("Thesis")}>
                    Read Full Thesis　→
                  </button>
                </Card>
                <Card className="fair-value">
                  <h2>Fair Value (DCF)　ⓘ</h2>
                  <div className="empty-valuation">
                    Fair value estimate not yet available. Check back as we
                    expand our valuation models.
                  </div>
                  <dl>
                    <dt>Current Price</dt>
                    <dd>{fPrice(pipeline?.price.current)}</dd>
                    <dt>Uncertainty</dt>
                    <dd>Not available</dd>
                  </dl>
                  <div className="range">
                    <i />
                    <span>Bear Case</span>
                    <span>Base Case</span>
                    <span>Bull Case</span>
                  </div>
                </Card>
              </div>
              <div className="middle-panels">
                <Card className="performance">
                  <header>
                    <h2>Performance　ⓘ</h2>
                    <span>
                      1Y　3Y　<b>5Y</b>　10Y　Max
                    </span>
                  </header>
                  {prices.length ? (
                    <>
                      <div className="perf-legend">
                        ● {ticker}　{" "}
                        <b className="green">Live historical series</b>
                      </div>
                      <MiniSparkline
                        data={prices.slice(-80)}
                        width={480}
                        height={170}
                      />
                    </>
                  ) : (
                    <div className="empty-chart">
                      Performance will appear when enough market history is
                      ready to review.
                    </div>
                  )}
                  <button onClick={() => setTab("Technicals")}>
                    View Detailed Chart　›
                  </button>
                </Card>
                <Card className="fundamentals">
                  <header>
                    <h2>Fundamentals Snapshot　ⓘ</h2>
                    <small>Latest available</small>
                  </header>
                  {[
                    ["Revenue Growth", nice(f?.revenueGrowth, "%")],
                    ["Profit Growth", nice(f?.profitGrowth, "%")],
                    ["Operating Margin", nice(f?.operatingMargin, "%")],
                    ["ROE", nice(f?.roe, "%")],
                    ["EPS", fPrice(f?.eps)],
                    ["FCF Yield", nice(f?.fcfYield, "%")],
                  ].map(([a, b], i) => (
                    <div key={a}>
                      <span>↗　{a}</span>
                      <strong>{b}</strong>
                      <MiniSparkline
                        data={prices.slice(-(15 + i), -i || undefined)}
                        width={82}
                        height={22}
                      />
                    </div>
                  ))}
                  <button onClick={() => setTab("Financials")}>
                    View Full Financials　›
                  </button>
                </Card>
              </div>
              <div className="bottom-panels">
                <Card className="strength-risk">
                  <h2>Strengths vs Risks　ⓘ</h2>
                  <div>
                    <section>
                      <h4>Key Strengths</h4>
                      {(strengths.length
                        ? strengths
                        : ["Strength analysis in progress"]
                      ).map((x) => (
                        <p key={x}>
                          <Check size={13} />
                          {x}
                        </p>
                      ))}
                    </section>
                    <Shield size={70} />
                    <section>
                      <h4>Key Risks</h4>
                      {(risks.length
                        ? risks
                        : ["Risk analysis in progress"]
                      ).map((x) => (
                        <p key={x}>
                          <X size={13} />
                          {x}
                        </p>
                      ))}
                    </section>
                  </div>
                </Card>
                <Card className="consensus">
                  <h2>Analyst Consensus　ⓘ</h2>
                  <strong>Not available</strong>
                  <p>Consensus data has not been supplied for this company.</p>
                </Card>
              </div>
            </main>
            <aside>
              <Card>
                <h2>Key Metrics</h2>
                {[
                  [
                    "52 Week Range",
                    `${fPrice(pipeline?.price.weekLow52)} — ${fPrice(pipeline?.price.weekHigh52)}`,
                  ],
                  ["Market Cap", fMarketCap(pipeline?.price.marketCap)],
                  ["PE (TTM)", fRatio(f?.peRatio)],
                  ["PEG (3Y)", "—"],
                  ["ROE (TTM)", nice(f?.roe, "%")],
                  ["Dividend Yield", nice(f?.dividendYield, "%")],
                ].map(([a, b]) => (
                  <div className="metric" key={a}>
                    <span>{a}</span>
                    <b>{b}</b>
                  </div>
                ))}
                <button onClick={() => setTab("Fundamentals")}>
                  View More Metrics　›
                </button>
              </Card>
              <Card>
                <h2>Latest News</h2>
                <div className="empty-news">
                  No major updates to review here yet.
                </div>
                <button onClick={() => setTab("News")}>View All News　›</button>
              </Card>
              <Card>
                <h2>Research Basis　ⓘ</h2>
                <div className="metric">
                  <span>Overall Confidence</span>
                  <b className="green">{pipeline?.dataCompleteness ?? 0}%</b>
                </div>
                {[
                  "Structured financial checks",
                  "Valuation and risk review",
                  "Momentum context",
                ].map((x) => (
                  <div className="confidence-row" key={x}>
                    {x}
                    <Check size={13} />
                  </div>
                ))}
                <button onClick={() => productNavigate("methodology")}>
                  Learn About Our Data　›
                </button>
              </Card>
              <p className="sebi">
                Research scores and analysis are for educational and
                informational purposes only. Not investment advice. StockStory
                India is not a SEBI-registered investment adviser. Consult a
                SEBI-registered adviser before investing.
              </p>
            </aside>
          </div>
        )}
      </div>
      <InvestmentReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        symbol={ticker}
        companyName={pipeline?.companyName ?? ticker}
        thesis={pred?.explanation}
        risks={pred?.keyRisks ?? []}
      />
    </AppShell>
  );
}
