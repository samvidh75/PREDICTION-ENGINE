import { useState, useEffect } from 'react';

interface StockDataState {
  stock: any;
  chart: any;
  shareholding: any;
  financials: any;
  loading: boolean;
  error: string | null;
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
    const fetchData = async () => {
      if (!symbol) return;

      try {
        const [stock, chart, shareholding, financials] = await Promise.all([
          fetchStockPrice(symbol),
          fetchChartData(symbol),
          fetchShareholdingData(symbol),
          fetchFinancialData(symbol),
        ]);

        setData({
          stock,
          chart,
          shareholding,
          financials,
          loading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    fetchData();
  }, [symbol]);

  return data;
}

async function fetchStockPrice(symbol: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ symbol, price: 3700.5, change: 2.3 });
    }, 200);
  });
}

async function fetchChartData(symbol: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ prices: [3600, 3650, 3700, 3750, 3700.5] });
    }, 200);
  });
}

async function fetchShareholdingData(symbol: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        promoter: 51.0,
        fii: 20.77,
        dii: 19.26,
        retails: 8.97,
      });
    }, 200);
  });
}

async function fetchFinancialData(symbol: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        quarters: ['Mar-25', 'Jun-25', 'Sep-25', 'Dec-25', 'Mar-26'],
        revenue: [2596, 3040, 3293, 3170, 3155],
        netProfit: [800, 950, 1100, 1050, 1020],
      });
    }, 200);
  });
}