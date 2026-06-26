import { stockUniverseService } from '../services/StockUniverseService';

interface SyncResult {
  success: boolean;
  timestamp: string;
  inserted: number;
  updated: number;
  error?: string;
}

const NSE_EQUITY_LIST_URL = 'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
const BSE_EQUITY_LIST_URL = 'https://www.bseindia.com/corporates/ListOfScrips.aspx';

const FALLBACK_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Construction' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', sector: 'Consumer Durables' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', sector: 'Consumer Durables' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports and SEZ Ltd', exchange: 'NSE', sector: 'Infrastructure' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', sector: 'Construction' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', exchange: 'NSE', sector: 'Construction' },
  { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories Ltd', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd', exchange: 'NSE', sector: 'Financial Services' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', exchange: 'NSE', sector: 'Automobile' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'SHREECEM', name: 'Shree Cement Ltd', exchange: 'NSE', sector: 'Construction' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd', exchange: 'NSE', sector: 'Technology' },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd', exchange: 'NSE', sector: 'Consumer Retail' },
  { symbol: 'TRENT', name: 'Trent Ltd', exchange: 'NSE', sector: 'Consumer Retail' },
];

export class StockUniverseSyncJob {
  static async syncAll(): Promise<SyncResult> {
    console.info('[StockSync] Starting universe sync...');
    let inserted = 0, updated = 0;

    for (const stock of FALLBACK_STOCKS) {
      const ok = await stockUniverseService.upsertStock(stock);
      if (ok) updated++;
      else inserted++;
    }

    console.info(`[StockSync] Done. ${FALLBACK_STOCKS.length} stocks processed.`);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      inserted,
      updated,
    };
  }
}
