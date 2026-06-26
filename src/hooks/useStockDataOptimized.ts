import { useState, useEffect } from 'react';

interface ShareholdingData {
  promoter: number;
  fii: number;
  dii: number;
  retails: number;
  qoqChange?: {
    promoter: number;
    fii: number;
    dii: number;
    retails: number;
  };
}

interface FinancialData {
  quarters: string[];
  revenue: number[];
  netProfit: number[];
  ebitda?: number[];
}

interface ChartData {
  prices: number[];
  timestamps?: string[];
}

interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
}

interface StockDataState {
  stock: StockPriceData | null;
  chart: ChartData | null;
  shareholding: ShareholdingData | null;
  financials: FinancialData | null;
  loading: boolean;
  error: string | null;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const json = await res.json();
    return json.data ?? json ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchStockPrice(symbol: string): Promise<StockPriceData> {
  const data = await fetchJson<Record<string, any>>(`/api/quote/${symbol}`, {});
  if (data?.current !== undefined) {
    return {
      symbol,
      price: data.current,
      change: data.change ?? 0,
    };
  }
  return { symbol, price: 0, change: 0 };
}

async function fetchChartData(symbol: string): Promise<ChartData> {
  try {
    const res = await fetch(`/api/history/${symbol}?range=1Y`);
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return {
          prices: json.data.map((d: any) => d.close ?? d.price ?? 0),
          timestamps: json.data.map((d: any) => d.date ?? ''),
        };
      }
    }
  } catch {}
  return { prices: [] };
}

async function fetchShareholdingData(symbol: string): Promise<ShareholdingData | null> {
  const data = await fetchJson<Record<string, any>>(
    `/api/market/stock/${symbol}/shareholding`,
    {}
  );
  if (data?.promoter !== undefined) {
    return {
      promoter: Number(data.promoter),
      fii: Number(data.fii ?? 0),
      dii: Number(data.dii ?? 0),
      retails: Number(data.retails ?? data.public ?? 0),
      qoqChange: data.qoqChange ? {
        promoter: Number(data.qoqChange.promoter ?? 0),
        fii: Number(data.qoqChange.fii ?? 0),
        dii: Number(data.qoqChange.dii ?? 0),
        retails: Number(data.qoqChange.retails ?? data.qoqChange.public ?? 0),
      } : undefined,
    };
  }
  return null;
}

async function fetchFinancialData(symbol: string): Promise<FinancialData | null> {
  const data = await fetchJson<any[]>(
    `/api/market/stock/${symbol}/financials?view=quarterly`,
    []
  );
  if (Array.isArray(data) && data.length > 0) {
    const quarters = data.map((d: any) => d.period ?? d.quarter ?? '');
    const revenue = data.map((d: any) => Number(d.revenue ?? d.sales ?? 0));
    const netProfit = data.map((d: any) => Number(d.netProfit ?? d.pat ?? d.profit ?? 0));
    const ebitda = data.map((d: any) => {
      const v = d.ebitda ?? d.operatingProfit;
      return v !== undefined ? Number(v) : undefined;
    }).filter((v): v is number => v !== undefined);
    return {
      quarters,
      revenue,
      netProfit,
      ebitda: ebitda.length > 0 ? ebitda : undefined,
    };
  }
  return null;
}

export function useStockDataOptimized(symbol: string) {
  const [data, setData] = useState<StockDataState>({
    stock: null,
    chart: null,
    shareholding: null,
    financials: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [stock, chart, shareholding, financials] = await Promise.all([
          fetchStockPrice(symbol),
          fetchChartData(symbol),
          fetchShareholdingData(symbol),
          fetchFinancialData(symbol),
        ]);

        if (!cancelled) {
          setData({
            stock,
            chart,
            shareholding,
            financials,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }));
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return data;
}
