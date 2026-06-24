import {
  ArrowUpRight,
  BarChart3,
  Check,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { Card, MiniSparkline, ScoreRing } from "../components/ui/ResearchUI";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import type { UnifiedFactorScore } from "../prediction-engine/types";

const factorNames = ["quality", "growth", "valuation", "risk", "momentum"];
function FactorRows({ factors }: { factors: UnifiedFactorScore[] }) {
  return (
    <div className="factor-rows">
      {factorNames.map((name) => {
        const f = factors.find((x) => x.group === name);
        const v = f?.value ?? null;
        return (
          <div key={name}>
            <span>{name[0].toUpperCase() + name.slice(1)}</span>
            <i>
              <b style={{ width: `${v ?? 0}%` }} />
            </i>
            <strong>{v === null ? "—" : Math.round(v)}</strong>
          </div>
        );
      })}
    </div>
  );
}
export default function PublicLandingPage() {
  const { pipeline, loading } = useStockData("HDFCBANK");
  const pred = pipeline?.prediction;
  const score = pred?.rankingScore ?? null;
  const prices = pipeline?.technicals.closePrices ?? [];
  const confidence = pipeline?.dataCompleteness ?? 0;
  return (
    <AppShell active="research">
      <div className="home page-wrap">
        <section className="hero-grid">
          <div className="hero-copy">
            <span className="ai-pill">
              <Sparkles size={13} /> AI-POWERED STOCK INTELLIGENCE
            </span>
            <h1>
              Understand
              <br />
              businesses.
              <br />
              Invest better.
            </h1>
            <p>
              StockStory India uses AI and deep financial research to help you
              understand businesses before you buy stocks.
            </p>
            <div className="hero-actions">
              <button
                className="primary big"
                onClick={() => productNavigate("signup")}
              >
                Start Free Trial <ArrowUpRight size={16} />
              </button>
              <button
                className="secondary big"
                onClick={() => productNavigate("scanner")}
              >
                Explore Scanner <Search size={16} />
              </button>
            </div>
            <div className="trust-row">
              {[
                "No credit card required",
                "Cancel anytime, no lock-ins",
                "Built for serious investors",
              ].map((x) => (
                <span key={x}>
                  <Check size={13} />
                  {x}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-middle">
            {loading ? (
              <Card className="skeleton" />
            ) : (
              <>
                <Card className="stock-preview">
                  <header>
                    <div className="avatar hdfc">H</div>
                    <div>
                      <b>HDFCBANK</b>
                      <small>{pipeline?.companyName ?? "HDFC Bank Ltd."}</small>
                    </div>
                    <span>♡</span>
                  </header>
                  <div className="score-cluster">
                    <ScoreRing score={score} size={106} />
                    <FactorRows factors={pred?.factorScores ?? []} />
                  </div>
                  <button onClick={() => productNavigate("stock", "HDFCBANK")}>
                    View Full Research →
                  </button>
                </Card>
                <Card className="ai-insight">
                  <header>
                    <b>✦ AI Insight</b>
                  </header>
                  <h3>HDFCBANK: Research signals at a glance</h3>
                  <p>
                    {pred?.explanation ??
                      "AI thesis is being generated for this company. Check back shortly."}
                  </p>
                  <footer>
                    <span>
                      Research confidence:{" "}
                      {confidence >= 75
                        ? "High"
                        : confidence >= 50
                          ? "Moderate"
                          : "Building"}
                    </span>
                    <button
                      onClick={() => productNavigate("stock", "HDFCBANK")}
                    >
                      Read Full Thesis →
                    </button>
                  </footer>
                </Card>
              </>
            )}
          </div>
          <div className="hero-right">
            <Card>
              <header className="card-title">
                <b>Market Overview</b>
                <span>Research view</span>
                <small>1D　1W　1M　YTD</small>
              </header>
              <div className="large-chart">
                <div className="product-safe-state">
                  Market breadth will appear when the current session summary is
                  ready.
                </div>
              </div>
              <div className="market-grid">
                <div>
                  <small>Advances</small>
                  <b>—</b>
                </div>
                <div>
                  <small>Declines</small>
                  <b>—</b>
                </div>
                <div>
                  <small>Unchanged</small>
                  <b>—</b>
                </div>
                <div>
                  <small>Market Breadth</small>
                  <b>—</b>
                </div>
              </div>
            </Card>
            <Card>
              <header className="card-title">
                <b>5Y Performance</b>
                <small>vs NIFTY 50</small>
              </header>
              <div className="chart-legend">
                <span>━ HDFCBANK market history</span>
              </div>
              <div className="large-chart">
                <MiniSparkline
                  data={prices.slice(-80)}
                  width={350}
                  height={115}
                />
              </div>
            </Card>
          </div>
        </section>
        <section className="research-band">
          <h2>Research every Nifty 50 company</h2>
          <p>
            Five research dimensions. Structured analysis. Built for disciplined
            investing.
          </p>
          <div className="research-cards">
            {factorNames.map((name, i) => (
              <div key={name}>
                <span className="factor-icon">
                  {["◇", "↗", "◎", "⬡", "ϟ"][i]}
                </span>
                <section>
                  <b>{name[0].toUpperCase() + name.slice(1)}</b>
                  <strong>
                    {pred?.factorScores.find((factor) => factor.group === name)
                      ?.value == null
                      ? "—"
                      : Math.round(
                          pred?.factorScores.find(
                            (factor) => factor.group === name,
                          )?.value ?? 0,
                        )}
                    <small>/100</small>
                  </strong>
                  <p>
                    {
                      [
                        "High returns, strong balance sheet",
                        "Sustainable earnings growth",
                        "Attractive valuation vs value",
                        "Low financial risk, stable model",
                        "Strong price momentum",
                      ][i]
                    }
                  </p>
                </section>
                <MiniSparkline
                  data={prices.slice(-(16 + i), prices.length - i || undefined)}
                  width={55}
                  height={28}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="proof">
          <div>
            <Users />
            <p>Built for research clarity</p>
            <strong>
              Clear <small>Thesis workflow</small>
            </strong>
            <strong>
              Factor-led <small>Decision support</small>
            </strong>
            <strong>
              Calm <small>Research experience</small>
            </strong>
          </div>
          <blockquote>
            Research the business, understand the risks, and revisit your thesis
            as facts change.<small>Methodology-led investing</small>
          </blockquote>
          <div className="award">
            Built for disciplined
            <br />
            equity research<strong>Research first</strong>
            <small>Scores are research aids, not guarantees.</small>
          </div>
        </section>
        <section className="infra">
          <h3>Built on best-in-class data and AI infrastructure</h3>
          {[
            [BarChart3, "Research engine"],
            [Sparkles, "Factor models"],
            [Users, "Human + AI Quality"],
            [Shield, "Enterprise Grade Security"],
            [BarChart3, "Reliable experience"],
          ].map(([Icon, label]) => (
            <div key={String(label)}>
              {typeof Icon !== "string" && <Icon size={18} />}
              <b>{String(label)}</b>
              <small>Built for calm, structured research.</small>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
