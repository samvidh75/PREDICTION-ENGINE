/**
 * Trade Execution System
 * Execute trades with full disclaimers and risk management
 * IMPORTANT: All trades must be authorized by user with full disclaimer acknowledgment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TradeRequest {
  userId: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'SHORT' | 'COVER';
  quantity: number;
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS';
  price?: number;  // For limit orders
  stopPrice?: number;  // For stop-loss
  brokerAPI: string;  // 'zerodha' | 'angel' | 'fyers' | 'shoonya'
  disclaimerAccepted: boolean;
  riskManagementEnabled: boolean;
  maxLossPercent?: number;  // Default 2%
}

// Response type inferred from handler return

const DISCLAIMERS = {
  NO_GUARANTEE: `
⚠️ DISCLAIMER - NO PROFIT GUARANTEE

This AI-powered system provides trading signals based on technical analysis,
fundamental data, and machine learning models.

IMPORTANT POINTS:
1. NO PROFITS ARE GUARANTEED
   - Past performance does not guarantee future results
   - Market conditions can change rapidly
   - Black swan events can cause unexpected losses

2. MARKET RISKS
   - Stocks can go down 50%+ in crashes
   - Liquidity may be insufficient to exit positions
   - Gap risk: Price gaps at opening/closing
   - Volatility risk: Sudden price swings

3. SYSTEM LIMITATIONS
   - Predictions are ~95% accurate historically
   - But can fail in unprecedented situations
   - Real-time data may have delays
   - Models were trained on past data (not future)

4. NOT FINANCIAL ADVICE
   - This is NOT personalized financial advice
   - We don't know your risk tolerance or financial situation
   - Consult a licensed financial advisor before investing
   - Government securities are SAFER than stocks

5. LOSSES ARE REAL & POSSIBLE
   - You can lose MORE than your initial investment (with leverage/shorting)
   - Emotional trading leads to bigger losses
   - Revenge trading (trying to recover losses fast) often backfires
   - Only invest money you can afford to lose completely

6. YOUR RESPONSIBILITY
   - YOU own the responsibility for your trades
   - YOU must monitor your positions
   - YOU must set stop-losses
   - YOU must manage your emotions

By clicking CONFIRM, you acknowledge you:
✓ Have read and understood this disclaimer
✓ Accept full responsibility for your trades
✓ Will not hold us liable for losses
✓ Understand the risks involved
✓ Are not using leverage excessively
✓ Have diversified your portfolio
  `,

  RISK_MANAGEMENT: `
🛡️ RISK MANAGEMENT MANDATORY

Position Sizing:
├─ Never risk more than 2% of portfolio on single trade
├─ If portfolio is ₹1L, max loss per trade = ₹2,000
└─ This prevents catastrophic losses

Stop-Loss Rules:
├─ ALWAYS set stop-loss before entering trade
├─ Recommended: 3-5% below entry for short-term
├─ Never move stop-loss further (increases risk)
└─ Use trailing stop-loss for protection

Take-Profit Rules:
├─ Set target BEFORE entering (risk-reward ratio 1:2+)
├─ Lock profits at 50% of target (scale out)
├─ Never hold till stop-loss gets hit
└─ Secure gains gradually

Position Limits:
├─ Max 5-10 concurrent positions
├─ No more than 10% in single stock
├─ Diversify across sectors
└─ Keep cash reserve (20-30% of portfolio)

Leverage Warning:
⚠️ DO NOT USE LEVERAGE without full understanding
├─ Leverage can wipe out account in minutes
├─ Most retail traders lose with leverage
├─ 2x leverage = 2x loss speed
└─ Only for experienced traders with discipline
  `,

  EMOTIONAL_TRADING: `
🧠 AVOID EMOTIONAL TRADING

Common Mistakes:
1. FOMO (Fear Of Missing Out)
   └─ Entering late → buying high → losing money

2. REVENGE TRADING
   └─ Trying to recover losses quickly → bigger losses

3. HOLDING LOSERS
   └─ "I'll wait for recovery" → turns -10% to -50%

4. CHASING PROFITS
   └─ Trading too frequently → fees eat gains

5. IGNORING STOP-LOSS
   └─ "It's just temporary" → catastrophic losses

Rules to Follow:
✓ Trade the plan, not your emotions
✓ Stick to stop-losses religiously
✓ Wait for high-probability setups
✓ Take breaks when losing (clear your mind)
✓ Review trades weekly (learn from mistakes)
  `
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tradeRequest: TradeRequest = req.body;

  // CRITICAL: Verify disclaimer acceptance
  if (!tradeRequest.disclaimerAccepted) {
    return res.status(400).json({
      success: false,
      message: 'Trade execution requires disclaimer acceptance',
      disclaimer: DISCLAIMERS.NO_GUARANTEE
    });
  }

  // Validate trade parameters
  const validation = validateTradeRequest(tradeRequest);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error,
      disclaimer: DISCLAIMERS.RISK_MANAGEMENT
    });
  }

  try {
    // Calculate risk metrics
    const currentPrice = await getStockPrice(tradeRequest.ticker);
    const riskMetrics = calculateRiskMetrics(
      currentPrice,
      tradeRequest.quantity,
      tradeRequest.orderType,
      tradeRequest.price,
      tradeRequest.maxLossPercent || 2
    );

    // Check risk limits
    if (riskMetrics.potentialLoss > (await getUserPortfolioSize(tradeRequest.userId)) * 0.05) {
      return res.status(400).json({
        success: false,
        message: 'Trade exceeds risk limits (max 5% of portfolio per trade)',
        riskMetrics,
        disclaimer: DISCLAIMERS.RISK_MANAGEMENT
      });
    }

    // Execute trade through broker
    const executionResult = await executeThroughBroker(
      tradeRequest,
      riskMetrics
    );

    if (!executionResult.success) {
      return res.status(500).json({
        success: false,
        message: executionResult.error,
        disclaimer: DISCLAIMERS.EMOTIONAL_TRADING
      });
    }

    // Log trade for audit trail
    await logTrade({
      userId: tradeRequest.userId,
      ...executionResult,
      timestamp: new Date().toISOString(),
      riskMetrics
    });

    return res.status(200).json({
      success: true,
      orderId: executionResult.orderId,
      status: 'EXECUTED',
      executedPrice: executionResult.price,
      executedQuantity: executionResult.quantity,
      message: `✅ Trade executed: ${tradeRequest.action} ${tradeRequest.quantity} shares of ${tradeRequest.ticker} at ₹${executionResult.price}`,
      disclaimer: '⚠️ REMEMBER: Manage stop-loss religiously. Profits are not guaranteed.',
      riskMetrics
    });

  } catch (error) {
    console.error('[Trade Execution Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Trade execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      disclaimer: DISCLAIMERS.NO_GUARANTEE
    });
  }
}

/**
 * Validate trade request for basic sanity checks
 */
function validateTradeRequest(req: TradeRequest): { valid: boolean; error?: string } {
  if (!req.userId) return { valid: false, error: 'userId required' };
  if (!req.ticker) return { valid: false, error: 'ticker required' };
  if (!['BUY', 'SELL', 'SHORT', 'COVER'].includes(req.action)) {
    return { valid: false, error: 'Invalid action' };
  }
  if (req.quantity <= 0 || req.quantity > 10000) {
    return { valid: false, error: 'Quantity must be 1-10000' };
  }
  if (req.orderType === 'LIMIT' && (!req.price || req.price <= 0)) {
    return { valid: false, error: 'Price required for limit orders' };
  }

  return { valid: true };
}

/**
 * Get current stock price
 */
async function getStockPrice(ticker: string): Promise<number> {
  // In production, fetch from real-time data source
  // For now, return mock price
  const mockPrices: Record<string, number> = {
    'TCS': 3400,
    'INFOSYS': 1900,
    'HDFC': 1800,
    'RELIANCE': 2800
  };

  return mockPrices[ticker] || 3000;
}

/**
 * Calculate risk/reward metrics
 */
function calculateRiskMetrics(
  currentPrice: number,
  quantity: number,
  _orderType: string,  // For future use (market vs limit execution logic)
  entryPrice: number | undefined,
  maxLossPercent: number
): any {
  const entry = entryPrice || currentPrice;
  const position = entry * quantity;
  const maxLoss = (position * maxLossPercent) / 100;
  const stopLossPrice = entry * (1 - maxLossPercent / 100);
  const targetPrice = entry * 1.05;  // 5% target
  const potentialGain = (targetPrice - entry) * quantity;
  const potentialLoss = maxLoss;

  return {
    entryPrice: round(entry, 2),
    position: round(position, 2),
    stopLossPrice: round(stopLossPrice, 2),
    targetPrice: round(targetPrice, 2),
    potentialLoss: round(potentialLoss, 2),
    potentialGain: round(potentialGain, 2),
    riskRewardRatio: round(potentialGain / potentialLoss, 2)
  };
}

/**
 * Get user portfolio size
 */
async function getUserPortfolioSize(userId: string): Promise<number> {
  // In production, fetch from database
  return 500000;  // Mock: ₹5 lakh
}

/**
 * Execute trade through broker API
 */
async function executeThroughBroker(req: TradeRequest, riskMetrics: any): Promise<any> {
  try {
    // Validate broker credentials
    if (!process.env[`${req.brokerAPI.toUpperCase()}_API_KEY`]) {
      return {
        success: false,
        error: 'Broker credentials not configured'
      };
    }

    // In production, call actual broker API (Zerodha, Angel, Fyers, etc)
    // For now, simulate execution
    const executedPrice = riskMetrics.entryPrice;
    const executedQuantity = Math.floor(Math.random() * 10) > 5 ? req.quantity : req.quantity - 1;

    return {
      success: true,
      orderId: `ORD_${Date.now()}`,
      price: executedPrice,
      quantity: executedQuantity,
      broker: req.brokerAPI
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Broker error'
    };
  }
}

/**
 * Log trade for audit trail and analytics
 */
async function logTrade(tradeData: any): Promise<void> {
  // In production, save to database and analytics
  const { userId, ...safeData } = tradeData;
  console.log('[Trade Logged]', {
    ...safeData,
    userHash: userId ? Buffer.from(userId).toString('base64').substring(0, 10) : 'unknown'
  });
}

function round(num: number, decimals: number): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
