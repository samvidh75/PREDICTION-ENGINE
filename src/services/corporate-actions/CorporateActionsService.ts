export type CorporateActionType =
  | 'dividend'
  | 'bonus'
  | 'stock_split'
  | 'rights_issue'
  | 'buyback'
  | 'merger'
  | 'demerger'
  | 'amalgamation';

export type InsiderTradeType = 'buy' | 'sell' | 'pledge' | 'unpledge' | 'gift';

export type BulkDealType = 'bulk' | 'block' | 'market';

export interface CorporateAction {
  id: string;
  symbol: string;
  companyName: string;
  type: CorporateActionType;
  announcementDate: string;
  exDate: string | null;
  recordDate: string | null;
  amount: number | null;
  ratio: string | null;
  status: 'announced' | 'approved' | 'completed' | 'cancelled';
  description: string;
}

export interface InsiderTrade {
  id: string;
  symbol: string;
  companyName: string;
  insiderName: string;
  designation: string;
  tradeType: InsiderTradeType;
  quantity: number;
  value: number;
  tradeDate: string;
  acquiredPercentage: number;
  totalHoldingAfter: number;
  category: 'promoter' | 'director' | 'key_managerial' | 'others';
}

export interface BulkDeal {
  id: string;
  symbol: string;
  companyName: string;
  dealType: BulkDealType;
  buyer: string;
  seller: string;
  quantity: number;
  price: number;
  value: number;
  tradeDate: string;
  exchange: 'NSE' | 'BSE';
}

export class CorporateActionsService {
  private actions: CorporateAction[] = this.seedActions();
  private insiderTrades: InsiderTrade[] = this.seedInsiderTrades();
  private bulkDeals: BulkDeal[] = this.seedBulkDeals();

  private seedActions(): CorporateAction[] {
    const now = new Date();
    return [
      { id: 'ca1', symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', type: 'dividend', announcementDate: new Date(now.getTime() - 7 * 86400000).toISOString(), exDate: new Date(now.getTime() + 15 * 86400000).toISOString(), recordDate: new Date(now.getTime() + 17 * 86400000).toISOString(), amount: 10, ratio: null, status: 'announced', description: 'Interim dividend of ₹10 per share' },
      { id: 'ca2', symbol: 'TCS', companyName: 'Tata Consultancy Services', type: 'buyback', announcementDate: new Date(now.getTime() - 14 * 86400000).toISOString(), exDate: new Date(now.getTime() + 30 * 86400000).toISOString(), recordDate: new Date(now.getTime() + 32 * 86400000).toISOString(), amount: null, ratio: '1:5', status: 'approved', description: 'Buyback of equity shares @ ₹4,500 per share' },
      { id: 'ca3', symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd', type: 'dividend', announcementDate: new Date(now.getTime() - 3 * 86400000).toISOString(), exDate: new Date(now.getTime() + 10 * 86400000).toISOString(), recordDate: null, amount: 19.5, ratio: null, status: 'announced', description: 'Final dividend of ₹19.50 per share' },
      { id: 'ca4', symbol: 'INFY', companyName: 'Infosys Ltd', type: 'stock_split', announcementDate: new Date(now.getTime() - 60 * 86400000).toISOString(), exDate: new Date(now.getTime() - 30 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:1', status: 'completed', description: 'Stock split from ₹5 to ₹1 face value' },
      { id: 'ca5', symbol: 'WIPRO', companyName: 'Wipro Ltd', type: 'bonus', announcementDate: new Date(now.getTime() - 45 * 86400000).toISOString(), exDate: new Date(now.getTime() - 15 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:1', status: 'completed', description: 'Bonus issue in 1:1 ratio' },
      { id: 'ca6', symbol: 'ITC', companyName: 'ITC Ltd', type: 'dividend', announcementDate: new Date(now.getTime() - 5 * 86400000).toISOString(), exDate: new Date(now.getTime() + 20 * 86400000).toISOString(), recordDate: null, amount: 7.5, ratio: null, status: 'announced', description: 'Interim dividend of ₹7.50 per share' },
      { id: 'ca7', symbol: 'SBIN', companyName: 'State Bank of India', type: 'rights_issue', announcementDate: new Date(now.getTime() - 90 * 86400000).toISOString(), exDate: new Date(now.getTime() - 60 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:10', status: 'completed', description: 'Rights issue in 1:10 ratio at ₹300 per share' },
      { id: 'ca8', symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd', type: 'dividend', announcementDate: new Date(now.getTime() - 2 * 86400000).toISOString(), exDate: new Date(now.getTime() + 25 * 86400000).toISOString(), recordDate: null, amount: 5, ratio: null, status: 'announced', description: 'Interim dividend of ₹5 per share' },
    ];
  }

  private seedInsiderTrades(): InsiderTrade[] {
    const now = new Date();
    return [
      { id: 'it1', symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', insiderName: 'Mukesh Ambani', designation: 'Chairman & MD', tradeType: 'buy', quantity: 50000, value: 150000000, tradeDate: new Date(now.getTime() - 2 * 86400000).toISOString(), acquiredPercentage: 0.01, totalHoldingAfter: 50.3, category: 'promoter' },
      { id: 'it2', symbol: 'TCS', companyName: 'Tata Consultancy Services', insiderName: 'N Chandrasekaran', designation: 'Chairman', tradeType: 'buy', quantity: 10000, value: 38000000, tradeDate: new Date(now.getTime() - 5 * 86400000).toISOString(), acquiredPercentage: 0.003, totalHoldingAfter: 0.05, category: 'director' },
      { id: 'it3', symbol: 'INFY', companyName: 'Infosys Ltd', insiderName: 'Salil Parekh', designation: 'CEO & MD', tradeType: 'sell', quantity: 25000, value: 42500000, tradeDate: new Date(now.getTime() - 10 * 86400000).toISOString(), acquiredPercentage: 0, totalHoldingAfter: 0.12, category: 'key_managerial' },
      { id: 'it4', symbol: 'HDFCBANK', companyName: 'HDFC Bank Ltd', insiderName: 'Sashidhar Jagdishan', designation: 'CEO', tradeType: 'buy', quantity: 5000, value: 8200000, tradeDate: new Date(now.getTime() - 3 * 86400000).toISOString(), acquiredPercentage: 0.001, totalHoldingAfter: 0.08, category: 'key_managerial' },
      { id: 'it5', symbol: 'TATAMOTORS', companyName: 'Tata Motors Ltd', insiderName: 'N Chandrasekaran', designation: 'Chairman', tradeType: 'buy', quantity: 100000, value: 45000000, tradeDate: new Date(now.getTime() - 7 * 86400000).toISOString(), acquiredPercentage: 0.03, totalHoldingAfter: 0.15, category: 'director' },
      { id: 'it6', symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd', insiderName: 'Sanjiv Bajaj', designation: 'Chairman', tradeType: 'buy', quantity: 20000, value: 13600000, tradeDate: new Date(now.getTime() - 1 * 86400000).toISOString(), acquiredPercentage: 0.005, totalHoldingAfter: 0.3, category: 'promoter' },
    ];
  }

  private seedBulkDeals(): BulkDeal[] {
    const now = new Date();
    return [
      { id: 'bd1', symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', dealType: 'block', buyer: 'Mukesh Ambani', seller: 'Unknown', quantity: 250000, price: 2980, value: 745000000, tradeDate: new Date(now.getTime() - 1 * 86400000).toISOString(), exchange: 'NSE' },
      { id: 'bd2', symbol: 'ZOMATO', companyName: 'Zomato Ltd', dealType: 'bulk', buyer: 'Fidelity Investments', seller: 'Ant Group', quantity: 15000000, price: 185, value: 2775000000, tradeDate: new Date(now.getTime() - 3 * 86400000).toISOString(), exchange: 'NSE' },
      { id: 'bd3', symbol: 'PAYTM', companyName: 'One 97 Communications', dealType: 'bulk', buyer: 'Nomura', seller: 'Antfin', quantity: 8000000, price: 520, value: 4160000000, tradeDate: new Date(now.getTime() - 5 * 86400000).toISOString(), exchange: 'BSE' },
      { id: 'bd4', symbol: 'ICICIBANK', companyName: 'ICICI Bank Ltd', dealType: 'block', buyer: 'ICICI Prudential MF', seller: 'ICICI Lombard', quantity: 5000000, price: 1150, value: 5750000000, tradeDate: new Date(now.getTime() - 2 * 86400000).toISOString(), exchange: 'NSE' },
      { id: 'bd5', symbol: 'HAL', companyName: 'Hindustan Aeronautics Ltd', dealType: 'block', buyer: 'Government of India', seller: 'LIC', quantity: 1000000, price: 4200, value: 4200000000, tradeDate: new Date(now.getTime() - 7 * 86400000).toISOString(), exchange: 'NSE' },
    ];
  }

  getUpcomingActions(days: number = 30): CorporateAction[] {
    const cutoff = new Date(Date.now() + days * 86400000);
    return this.actions.filter(a => {
      const d = a.exDate ? new Date(a.exDate) : new Date(a.announcementDate);
      return d <= cutoff && d >= new Date();
    }).sort((a, b) => new Date(a.announcementDate).getTime() - new Date(b.announcementDate).getTime());
  }

  getActionsBySymbol(symbol: string): CorporateAction[] {
    return this.actions.filter(a => a.symbol === symbol).sort((a, b) => new Date(b.announcementDate).getTime() - new Date(a.announcementDate).getTime());
  }

  getRecentInsiderTrades(days: number = 30): InsiderTrade[] {
    const cutoff = new Date(Date.now() - days * 86400000);
    return this.insiderTrades.filter(t => new Date(t.tradeDate) >= cutoff).sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime());
  }

  getInsiderTradesBySymbol(symbol: string): InsiderTrade[] {
    return this.insiderTrades.filter(t => t.symbol === symbol).sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime());
  }

  getRecentBulkDeals(days: number = 30): BulkDeal[] {
    const cutoff = new Date(Date.now() - days * 86400000);
    return this.bulkDeals.filter(d => new Date(d.tradeDate) >= cutoff).sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime());
  }

  getBulkDealsBySymbol(symbol: string): BulkDeal[] {
    return this.bulkDeals.filter(d => d.symbol === symbol).sort((a, b) => new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime());
  }
}

export const corporateActionsService = new CorporateActionsService();
