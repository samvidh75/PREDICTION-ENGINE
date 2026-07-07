export interface StockFundamentals {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  pe: number;
  pb: number;
  roe: number;
  debtToEquity: number;
  marketCap: number;
  dividendYield: number;
  revenueGrowth: number;
  profitGrowth: number;
  rsi: number;
}

export const STOCK_UNIVERSE: StockFundamentals[] = [
  { symbol: "BDO", name: "BDO Unibank", sector: "Financial Services", industry: "Banking", price: 182.50, change: 2.15, changePercent: 1.19, pe: 12.8, pb: 2.1, roe: 18.5, debtToEquity: 0.85, marketCap: 1450000, dividendYield: 2.85, revenueGrowth: 12.3, profitGrowth: 15.2, rsi: 62 },
  { symbol: "JFC", name: "Jollibee Foods", sector: "Consumer", industry: "Food & Beverage", price: 425.75, change: 3.25, changePercent: 0.77, pe: 28.5, pb: 4.2, roe: 22.1, debtToEquity: 1.15, marketCap: 920000, dividendYield: 1.92, revenueGrowth: 8.5, profitGrowth: 11.3, rsi: 65 },
  { symbol: "MER", name: "Meralco", sector: "Utilities", industry: "Electric & Gas", price: 687.20, change: -4.50, changePercent: -0.65, pe: 18.2, pb: 3.8, roe: 16.9, debtToEquity: 0.62, marketCap: 1320000, dividendYield: 4.15, revenueGrowth: 5.2, profitGrowth: 7.8, rsi: 48 },
  { symbol: "SM", name: "SM Investments", sector: "Retail & Real Estate", industry: "Retail & Shopping", price: 892.50, change: 5.75, changePercent: 0.65, pe: 19.3, pb: 2.9, roe: 21.5, debtToEquity: 0.95, marketCap: 1680000, dividendYield: 2.45, revenueGrowth: 9.8, profitGrowth: 13.2, rsi: 68 },
  { symbol: "AEV", name: "Aboitiz Equity", sector: "Conglomerate", industry: "Diversified", price: 156.80, change: 1.85, changePercent: 1.19, pe: 15.6, pb: 2.3, roe: 18.2, debtToEquity: 1.05, marketCap: 780000, dividendYield: 3.25, revenueGrowth: 7.5, profitGrowth: 9.6, rsi: 61 },
  { symbol: "PAL", name: "Philippine Airlines", sector: "Transportation", industry: "Airlines", price: 78.50, change: 2.15, changePercent: 2.81, pe: 8.9, pb: 1.2, roe: 22.8, debtToEquity: 2.15, marketCap: 450000, dividendYield: 0.85, revenueGrowth: 18.5, profitGrowth: 25.3, rsi: 72 },
  { symbol: "TEL", name: "PLDT", sector: "Telecommunications", industry: "Telecom", price: 1925.50, change: -8.25, changePercent: -0.43, pe: 16.4, pb: 3.2, roe: 19.5, debtToEquity: 0.75, marketCap: 1890000, dividendYield: 5.85, revenueGrowth: 3.2, profitGrowth: 4.5, rsi: 44 },
  { symbol: "GLOBE", name: "Globe Telecom", sector: "Telecommunications", industry: "Telecom", price: 3485.75, change: 12.50, changePercent: 0.36, pe: 17.8, pb: 2.8, roe: 20.1, debtToEquity: 0.68, marketCap: 1750000, dividendYield: 4.95, revenueGrowth: 6.8, profitGrowth: 8.2, rsi: 55 },
  { symbol: "SMC", name: "Semirara Mining", sector: "Energy", industry: "Coal & Minerals", price: 1285.00, change: -15.75, changePercent: -1.21, pe: 10.2, pb: 1.5, roe: 35.8, debtToEquity: 0.45, marketCap: 620000, dividendYield: 7.25, revenueGrowth: -2.1, profitGrowth: 3.2, rsi: 35 },
  { symbol: "AC", name: "Ayala Corporation", sector: "Conglomerate", industry: "Diversified", price: 875.25, change: 6.50, changePercent: 0.75, pe: 14.7, pb: 2.6, roe: 22.3, debtToEquity: 0.88, marketCap: 1420000, dividendYield: 2.95, revenueGrowth: 11.2, profitGrowth: 14.8, rsi: 66 },
  { symbol: "ALI", name: "Ayala Land", sector: "Real Estate", industry: "Property & Real Estate", price: 425.50, change: 3.25, changePercent: 0.77, pe: 12.5, pb: 1.8, roe: 24.5, debtToEquity: 1.22, marketCap: 980000, dividendYield: 3.15, revenueGrowth: 15.8, profitGrowth: 18.5, rsi: 64 },
  { symbol: "SMPH", name: "SM Prime Holdings", sector: "Real Estate", industry: "Property & Real Estate", price: 765.80, change: 4.15, changePercent: 0.54, pe: 13.9, pb: 1.9, roe: 21.8, debtToEquity: 1.05, marketCap: 1210000, dividendYield: 4.25, revenueGrowth: 9.5, profitGrowth: 12.3, rsi: 59 },
  { symbol: "RLC", name: "Raytheon Leidos", sector: "Manufacturing", industry: "Heavy Equipment", price: 565.25, change: -2.85, changePercent: -0.50, pe: 16.3, pb: 2.1, roe: 17.5, debtToEquity: 0.92, marketCap: 340000, dividendYield: 2.85, revenueGrowth: 4.8, profitGrowth: 6.2, rsi: 48 },
  { symbol: "SECB", name: "Security Bank", sector: "Financial Services", industry: "Banking", price: 625.00, change: 2.50, changePercent: 0.40, pe: 14.2, pb: 1.6, roe: 19.8, debtToEquity: 0.78, marketCap: 520000, dividendYield: 3.65, revenueGrowth: 10.5, profitGrowth: 13.2, rsi: 56 },
  { symbol: "BPI", name: "Bank of the Philippine Islands", sector: "Financial Services", industry: "Banking", price: 1185.50, change: 4.75, changePercent: 0.40, pe: 12.1, pb: 1.7, roe: 21.2, debtToEquity: 0.85, marketCap: 1350000, dividendYield: 3.45, revenueGrowth: 11.8, profitGrowth: 15.6, rsi: 61 },
  { symbol: "UBP", name: "Union Bankcom", sector: "Financial Services", industry: "Banking", price: 455.75, change: 1.85, changePercent: 0.41, pe: 13.5, pb: 1.8, roe: 20.5, debtToEquity: 0.82, marketCap: 645000, dividendYield: 3.25, revenueGrowth: 9.2, profitGrowth: 11.8, rsi: 58 },
  { symbol: "PNB", name: "Philippine National Bank", sector: "Financial Services", industry: "Banking", price: 865.50, change: 3.25, changePercent: 0.38, pe: 11.8, pb: 1.5, roe: 18.9, debtToEquity: 0.75, marketCap: 890000, dividendYield: 4.15, revenueGrowth: 8.5, profitGrowth: 10.2, rsi: 57 },
  { symbol: "UCPB", name: "United Coconut Planters Bank", sector: "Financial Services", industry: "Banking", price: 325.25, change: 1.50, changePercent: 0.46, pe: 10.5, pb: 1.3, roe: 22.1, debtToEquity: 0.68, marketCap: 425000, dividendYield: 3.85, revenueGrowth: 12.5, profitGrowth: 14.8, rsi: 60 },
];
