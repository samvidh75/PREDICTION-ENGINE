import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, Building2, Landmark, ShieldAlert } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { Stat } from "../ui/Stat";
import { useResponsiveValue } from "../ui/responsive";

type StockResearchDetail = {
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  sector: string;
  industry: string;
  price: { current: number; changeAbs: number; changePercent: number; marketCap: number };
  fundamentals: {
    pe: number | null;
    industryPe: number | null;
    pb: number | null;
    dividendYield: number | null;
    eps: number | null;
  };
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  rsi: number | null;
  scores: { quality: number | null; valuation: number | null; growth: number | null; momentum: number | null; risk: number | null; health: number | null; riskAdjusted: number | null };
  confidenceMeter: number;
  timeline: Array<{ day: string; health: number }>;
  whatChanged: string[];
  sectorRelative: Array<{ label: string; company: string; sectorMedian: string }>;
  description: string;
  companyProfile: { founded: string; ceo: string; hq: string; employees: string; website: string; isin: string; businessSegments: string[] };
  financials: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }> };
  shareholding: Array<{ period: string; promoter: number; fii: number; dii: number; retail: number; deltas: { promoter: number; fii: number; dii: number; retail: number } }>;
  news: Array<{ headline: string; source: string; time: string }>;
  thesis: { thesis: string; bullCase: string; bearCase: string; whatToWatch: string; stance: "High conviction" | "Watch" | "Needs review" | "Risk rising" | "Avoid for now" };
  priceHistory: Record<string, Array<{ label: string; price: number }>>;
};

const TIMEFRAMES = ["1W", "1M", "3M", "1Y", "5Y"] as const;

function Ring({ label, value }: { label: string; value: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? "var(--green)" : value >= 50 ? "var(--brand)" : "var(--red)";
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text-primary)">
          {value}
        </text>
      </svg>
      <span style={{ color: "var(--text-500)", fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function StockSkeleton() {
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={{ height: "24px", width: "120px", background: "var(--chip)", borderRadius: "6px" }} />
      <div style={{ height: "40px", width: "240px", background: "var(--chip)", borderRadius: "8px" }} />
      <div style={{ height: "240px", background: "var(--chip)", borderRadius: "8px" }} />
    </div>
  );
}

function StockError({ symbol }: { symbol: string }) {
  return <div>We could not load research for {symbol}.</div>;
}

function StockView({ stock }: { stock: StockResearchDetail }) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [period, setPeriod] = useState(stock.shareholding[0]?.period ?? "Mar'26");
  const sectionGap = useResponsiveValue("48px", "80px");
  const isUp = stock.price.changeAbs >= 0;
  const trendColor = isUp ? "var(--green)" : "var(--red)";
  const shareholding = stock.shareholding.find((item) => item.period === period) ?? stock.shareholding[0];
  const factorBadges = [
    { label: "Quality", value: stock.scores.quality ?? 0 },
    { label: "Valuation", value: stock.scores.valuation ?? 0 },
    { label: "Growth", value: stock.scores.growth ?? 0 },
    { label: "Momentum", value: stock.scores.momentum ?? 0 },
    { label: "Risk", value: stock.scores.risk ?? 0 },
  ];

  return (
    <div style={{ display: "grid", gap: sectionGap }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: "12px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--text-500)", cursor: "pointer" }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Badge value={60} label={stock.exchange} />
            <h1 style={{ color: "var(--text-primary)", fontSize: "var(--sz-2xl)", fontWeight: 600, lineHeight: "1.25" }}>{stock.symbol}</h1>
          </div>
          <p style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", fontWeight: 400, lineHeight: "1.6" }}>{stock.companyName}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button variant="secondary">Track</Button>
          <Button variant="secondary">Compare</Button>
          <Button>
            <span>Invest via broker</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      <section style={{ display: "grid", gap: "12px" }}>
        <div style={{ color: "var(--text-primary)", fontSize: "var(--sz-3xl)", fontWeight: 600, lineHeight: "1.1" }}>₹{stock.price.current.toLocaleString("en-IN")}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: trendColor }}>
          {isUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{`${isUp ? "+" : ""}${stock.price.changeAbs.toFixed(2)} (${stock.price.changePercent.toFixed(2)}%)`}</span>
        </div>
      </section>

      <Card>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          {TIMEFRAMES.map((value) => (
            <Button key={value} variant={value === timeframe ? "primary" : "ghost"} onClick={() => setTimeframe(value)}>
              {value}
            </Button>
          ))}
        </div>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer>
            <AreaChart data={stock.priceHistory[timeframe]}>
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-300)" />
              <YAxis stroke="var(--text-300)" domain={["dataMin", "dataMax"]} />
              <Area dataKey="price" stroke={trendColor} fill="url(#trendFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <Card>
          <CardLabel>Score overview</CardLabel>
          <div style={{ display: "flex", justifyContent: "space-around", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            <Ring label="Health" value={stock.scores.health ?? 0} />
            <Ring label="Risk" value={stock.scores.risk ?? 0} />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {factorBadges.map((factor) => (
              <Badge key={factor.label} value={factor.value} label={factor.label} />
            ))}
          </div>
        </Card>
        <Card>
          <CardLabel>Thesis confidence</CardLabel>
          <div style={{ display: "grid", gap: "12px" }}>
            <Ring label="Confidence" value={stock.confidenceMeter} />
            <Badge value={stock.scores.riskAdjusted ?? stock.scores.health ?? 0} label="Risk-adjusted" />
            <p style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>
              Timeline drift: {stock.timeline.map((item) => item.health).join(" • ")}
            </p>
          </div>
        </Card>
      </section>

      <Card>
        <CardLabel>Key metrics</CardLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <Stat label="Market Cap" value={`₹${Math.round(stock.price.marketCap).toLocaleString("en-IN")} Cr`} />
          <Stat label="PE (TTM)" value={stock.fundamentals.pe?.toFixed(1) ?? "—"} />
          <Stat label="PB Ratio" value={stock.fundamentals.pb?.toFixed(1) ?? "—"} />
          <Stat label="ROE" value={stock.roe != null ? `${stock.roe.toFixed(1)}%` : "—"} />
          <Stat label="Debt/Equity" value={stock.debtToEquity != null ? stock.debtToEquity.toFixed(2) : "—"} />
          <Stat label="Dividend Yield" value={stock.fundamentals.dividendYield != null ? `${stock.fundamentals.dividendYield.toFixed(2)}%` : "—"} />
          <Stat label="Revenue Growth" value={stock.revenueGrowth != null ? `${stock.revenueGrowth.toFixed(1)}%` : "—"} />
          <Stat label="Profit Growth" value={stock.profitGrowth != null ? `${stock.profitGrowth.toFixed(1)}%` : "—"} />
          <Stat label="EPS" value={stock.fundamentals.eps != null ? `₹${stock.fundamentals.eps.toFixed(1)}` : "—"} />
          <Stat label="RSI" value={stock.rsi != null ? String(stock.rsi) : "—"} />
        </div>
      </Card>

      <Card>
        <CardLabel>About company</CardLabel>
        <p style={{ color: "var(--text-700)", fontSize: "var(--sz-base)", fontWeight: 400, lineHeight: "1.6", marginBottom: "16px" }}>
          {stock.description}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          <Stat label="Founded" value={stock.companyProfile.founded} />
          <Stat label="CEO" value={stock.companyProfile.ceo} />
          <Stat label="HQ" value={stock.companyProfile.hq} />
          <Stat label="Employees" value={stock.companyProfile.employees} />
          <Stat label="Website" value={stock.companyProfile.website} />
          <Stat label="Exchange" value={stock.exchange} />
          <Stat label="ISIN" value={stock.companyProfile.isin} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Industry" value={stock.industry} />
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {stock.companyProfile.businessSegments.map((segment) => (
            <Badge key={segment} value={60} label={segment} />
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Financials</CardLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="secondary">Revenue</Button>
            <Button variant="ghost">Net Profit</Button>
            <Button variant="secondary">Quarterly</Button>
            <Button variant="ghost">Yearly</Button>
          </div>
        </div>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer>
            <BarChart data={stock.financials.revenue.map((item, index) => ({ period: item.period, revenue: item.value, profit: stock.financials.profit[index]?.value ?? 0 }))}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="period" stroke="var(--text-300)" />
              <YAxis stroke="var(--text-300)" />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {stock.financials.revenue.map((entry) => (
                  <Cell key={entry.period} fill="var(--brand)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ color: "var(--text-300)", fontSize: "12px", marginTop: "12px" }}>all values in ₹ Cr</p>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Shareholdings</CardLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {stock.shareholding.map((value) => (
              <Button key={value.period} variant={value.period === period ? "secondary" : "ghost"} onClick={() => setPeriod(value.period)}>
                {value.period}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          {[
            { label: "Promoter", value: shareholding.promoter, delta: shareholding.deltas.promoter },
            { label: "FII", value: shareholding.fii, delta: shareholding.deltas.fii },
            { label: "DII", value: shareholding.dii, delta: shareholding.deltas.dii },
            { label: "Retail", value: shareholding.retail, delta: shareholding.deltas.retail },
          ].map((item) => {
            const positive = item.delta >= 0;
            return (
              <div key={item.label} style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span>{item.label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: positive ? "var(--green)" : "var(--red)" }}>
                    {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {item.value.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: "8px", background: "var(--border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
                  <div style={{ width: `${item.value}%`, height: "100%", background: "var(--brand)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardLabel>News</CardLabel>
        <div style={{ display: "grid", gap: "16px" }}>
          {stock.news.map((item, index) => {
            const icons = [Building2, Landmark, BarChart3, ShieldAlert, Building2] as const;
            const Icon = icons[index] ?? Building2;
            return (
              <div key={item.headline} style={{ display: "flex", gap: "12px" }}>
                <Icon color="var(--brand)" size={18} />
                <div style={{ display: "grid", gap: "4px" }}>
                  <div style={{ color: "var(--text-primary)" }}>{item.headline}</div>
                  <div style={{ color: "var(--text-300)", fontSize: "12px" }}>{`${item.source} · ${item.time}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardLabel>Research thesis</CardLabel>
        <div style={{ display: "grid", gap: "12px" }}>
          <Badge value={stock.scores.health ?? 0} label={stock.thesis.stance} />
          <p style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>{stock.thesis.thesis}</p>
          <p style={{ color: "var(--text-700)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>{`Bull case: ${stock.thesis.bullCase}`}</p>
          <p style={{ color: "var(--text-700)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>{`Bear case: ${stock.thesis.bearCase}`}</p>
          <p style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>{`What to watch: ${stock.thesis.whatToWatch}`}</p>
        </div>
      </Card>

      <Card>
        <CardLabel>What changed</CardLabel>
        <div style={{ display: "grid", gap: "12px" }}>
          {stock.whatChanged.map((item) => (
            <p key={item} style={{ color: "var(--text-500)", fontSize: "var(--sz-base)", lineHeight: "1.6" }}>
              {item}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <CardLabel>Sector-relative view</CardLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {stock.sectorRelative.map((item) => (
            <Stat key={item.label} label={`${item.label} vs sector`} value={`${item.company} / ${item.sectorMedian}`} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function StockPage() {
  const { symbol = "HDFCBANK" } = useParams();
  const { data, status } = useQuery({
    queryKey: ["stock", symbol],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      if (!response.ok) return null;
      return response.json() as Promise<StockResearchDetail>;
    },
  });

  if (status === "pending") return <StockSkeleton />;
  if (!data) return <StockError symbol={symbol} />;
  return <StockView stock={data} />;
}
