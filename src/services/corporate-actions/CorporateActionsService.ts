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
  exchange: 'PSE' | 'PSE';
}

export class CorporateActionsService {
  private actions: CorporateAction[] = this.seedActions();
  private insiderTrades: InsiderTrade[] = this.seedInsiderTrades();
  private bulkDeals: BulkDeal[] = this.seedBulkDeals();

  private seedActions(): CorporateAction[] {
    const now = new Date();
    return [
      { id: 'ca1', symbol: 'BDO', companyName: 'BDO Unibank Inc', type: 'dividend', announcementDate: new Date(now.getTime() - 7 * 86400000).toISOString(), exDate: new Date(now.getTime() + 15 * 86400000).toISOString(), recordDate: new Date(now.getTime() + 17 * 86400000).toISOString(), amount: 10, ratio: null, status: 'announced', description: 'Cash dividend of ₱10 per share' },
      { id: 'ca2', symbol: 'TEL', companyName: 'PLDT Inc', type: 'dividend', announcementDate: new Date(now.getTime() - 14 * 86400000).toISOString(), exDate: new Date(now.getTime() + 30 * 86400000).toISOString(), recordDate: new Date(now.getTime() + 32 * 86400000).toISOString(), amount: null, ratio: '1:5', status: 'approved', description: 'Stock dividend at 1:5 ratio' },
      { id: 'ca3', symbol: 'BPI', companyName: 'Bank of the Philippine Islands', type: 'dividend', announcementDate: new Date(now.getTime() - 3 * 86400000).toISOString(), exDate: new Date(now.getTime() + 10 * 86400000).toISOString(), recordDate: null, amount: 19.5, ratio: null, status: 'announced', description: 'Cash dividend of ₱19.50 per share' },
      { id: 'ca4', symbol: 'JFC', companyName: 'Jollibee Foods Corp', type: 'stock_split', announcementDate: new Date(now.getTime() - 60 * 86400000).toISOString(), exDate: new Date(now.getTime() - 30 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:1', status: 'completed', description: 'Stock split' },
      { id: 'ca5', symbol: 'ALI', companyName: 'Ayala Land Inc', type: 'dividend', announcementDate: new Date(now.getTime() - 45 * 86400000).toISOString(), exDate: new Date(now.getTime() - 15 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:1', status: 'completed', description: 'Stock dividend' },
      { id: 'ca6', symbol: 'MER', companyName: 'Meralco', type: 'dividend', announcementDate: new Date(now.getTime() - 5 * 86400000).toISOString(), exDate: new Date(now.getTime() + 20 * 86400000).toISOString(), recordDate: null, amount: 7.5, ratio: null, status: 'announced', description: 'Cash dividend of ₱7.50 per share' },
      { id: 'ca7', symbol: 'SMPH', companyName: 'SM Prime Holdings', type: 'rights_issue', announcementDate: new Date(now.getTime() - 90 * 86400000).toISOString(), exDate: new Date(now.getTime() - 60 * 86400000).toISOString(), recordDate: null, amount: null, ratio: '1:10', status: 'completed', description: 'Rights issue in 1:10 ratio at ₱30 per share' },
      { id: 'ca8', symbol: 'GLO', companyName: 'Globe Telecom Inc', type: 'dividend', announcementDate: new Date(now.getTime() - 2 * 86400000).toISOString(), exDate: new Date(now.getTime() + 25 * 86400000).toISOString(), recordDate: null, amount: 5, ratio: null, status: 'announced', description: 'Cash dividend of ₱5 per share' },
    ];
  }

  private seedInsiderTrades(): InsiderTrade[] {
    const now = new Date();
    return [
      { id: 'it1', symbol: 'BDO', companyName: 'BDO Unibank Inc', insiderName: 'Teresita Sy', designation: 'Chairperson', tradeType: 'buy', quantity: 50000, value: 7500000, tradeDate: new Date(now.getTime() - 2 * 86400000).toISOString(), acquiredPercentage: 0.01, totalHoldingAfter: 45.2, category: 'promoter' },
      { id: 'it2', symbol: 'TEL', companyName: 'PLDT Inc', insiderName: 'Manuel Pangilinan', designation: 'Chairman', tradeType: 'buy', quantity: 10000, value: 3800000, tradeDate: new Date(now.getTime() - 5 * 86400000).toISOString(), acquiredPercentage: 0.003, totalHoldingAfter: 0.05, category: 'director' },
      { id: 'it3', symbol: 'JFC', companyName: 'Jollibee Foods Corp', insiderName: 'Ernesto Tanmantiong', designation: 'CEO', tradeType: 'sell', quantity: 25000, value: 4250000, tradeDate: new Date(now.getTime() - 10 * 86400000).toISOString(), acquiredPercentage: 0, totalHoldingAfter: 0.12, category: 'key_managerial' },
      { id: 'it4', symbol: 'BPI', companyName: 'Bank of the Philippine Islands', insiderName: 'Jose Teodoro Limcaoco', designation: 'CEO', tradeType: 'buy', quantity: 5000, value: 820000, tradeDate: new Date(now.getTime() - 3 * 86400000).toISOString(), acquiredPercentage: 0.001, totalHoldingAfter: 0.08, category: 'key_managerial' },
      { id: 'it5', symbol: 'ALI', companyName: 'Ayala Land Inc', insiderName: 'Meean Dy', designation: 'President', tradeType: 'buy', quantity: 100000, value: 3500000, tradeDate: new Date(now.getTime() - 7 * 86400000).toISOString(), acquiredPercentage: 0.03, totalHoldingAfter: 0.15, category: 'director' },
      { id: 'it6', symbol: 'SM', companyName: 'SM Investments Corp', insiderName: 'Frederic DyBuncio', designation: 'President', tradeType: 'buy', quantity: 20000, value: 3600000, tradeDate: new Date(now.getTime() - 1 * 86400000).toISOString(), acquiredPercentage: 0.005, totalHoldingAfter: 0.3, category: 'promoter' },
    ];
  }

  private seedBulkDeals(): BulkDeal[] {
    const now = new Date();
    return [
      { id: 'bd1', symbol: 'SM', companyName: 'SM Investments Corporation', dealType: 'block', buyer: 'Henry Sy Foundation', seller: 'Unknown', quantity: 250000, price: 950, value: 237500000, tradeDate: new Date(now.getTime() - 1 * 86400000).toISOString(), exchange: 'PSE' },
      { id: 'bd2', symbol: 'BDO', companyName: 'BDO Unibank Inc.', dealType: 'bulk', buyer: 'Institutional Investor', seller: 'Foreign Fund', quantity: 15000000, price: 145, value: 2175000000, tradeDate: new Date(now.getTime() - 3 * 86400000).toISOString(), exchange: 'PSE' },
      { id: 'bd3', symbol: 'ALI', companyName: 'Ayala Land Inc.', dealType: 'bulk', buyer: 'PCD Nominee', seller: 'Ayala Corporation', quantity: 8000000, price: 35, value: 280000000, tradeDate: new Date(now.getTime() - 5 * 86400000).toISOString(), exchange: 'PSE' },
      { id: 'bd4', symbol: 'BPI', companyName: 'Bank of the Philippine Islands', dealType: 'block', buyer: 'Ayala Corp', seller: 'PCD Nominee', quantity: 5000000, price: 125, value: 625000000, tradeDate: new Date(now.getTime() - 2 * 86400000).toISOString(), exchange: 'PSE' },
      { id: 'bd5', symbol: 'SMPH', companyName: 'SM Prime Holdings Inc.', dealType: 'block', buyer: 'SM Investments', seller: 'Foreign Fund', quantity: 10000000, price: 32, value: 320000000, tradeDate: new Date(now.getTime() - 7 * 86400000).toISOString(), exchange: 'PSE' },
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
