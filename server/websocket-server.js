/**
 * PSE WebSocket Real-Time Data Server
 * Provides live stock price updates to connected clients
 * Run: node server/websocket-server.js
 */

const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Initialize Socket.io with CORS
const io = new Server(app, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// PSE tickers
const PSE_TICKERS = [
  'BDO', 'JFC', 'MER', 'SM', 'AEV', 'PAL',
  'TEL', 'GLOBE', 'SMC', 'AC', 'ALI', 'SMPH',
  'RLC', 'SECB', 'BPI', 'UBP', 'PNB', 'UCPB',
];

// In-memory cache for stock data
const stockCache = new Map();

// Connected clients per symbol
const subscriptions = new Map();

/**
 * Fetch stock quote from yfinance
 */
async function fetchStockQuote(symbol) {
  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.PSE?modules=price`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000,
      }
    );

    const price = response.data.quoteSummary?.result?.[0]?.price;
    if (!price) return null;

    return {
      symbol,
      name: price.longName || symbol,
      price: price.regularMarketPrice?.raw || 0,
      change: price.regularMarketChange?.raw || 0,
      changePercent: price.regularMarketChangePercent?.raw || 0,
      timestamp: Date.now(),
      source: 'yfinance',
    };
  } catch (error) {
    console.error(`[yfinance] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch from Finnhub as fallback
 */
async function fetchFromFinnhub(symbol) {
  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=c9b2bzqr01qu8b9fcch0`,
      { timeout: 5000 }
    );

    const data = response.data;
    if (!data.c) return null;

    return {
      symbol,
      name: symbol,
      price: data.c,
      change: data.c - data.pc,
      changePercent: ((data.c - data.pc) / data.pc) * 100,
      timestamp: Date.now(),
      source: 'finnhub',
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get stock quote with fallback providers
 */
async function getStockQuote(symbol) {
  // Check cache (5 minute expiry)
  const cached = stockCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached;
  }

  // Try yfinance first
  let quote = await fetchStockQuote(symbol);
  if (quote) {
    stockCache.set(symbol, quote);
    return quote;
  }

  // Fallback to Finnhub
  quote = await fetchFromFinnhub(symbol);
  if (quote) {
    stockCache.set(symbol, quote);
    return quote;
  }

  // Return mock data if all fails
  return {
    symbol,
    name: symbol,
    price: 100 + Math.random() * 200,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
    timestamp: Date.now(),
    source: 'mock',
  };
}

/**
 * Socket.io connection handlers
 */
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Handle subscription to symbol
  socket.on('subscribe', async (data) => {
    const symbol = typeof data === 'string' ? data : data.symbol;
    socket.join(symbol);

    if (!subscriptions.has(symbol)) {
      subscriptions.set(symbol, new Set());
    }
    subscriptions.get(symbol).add(socket.id);

    // Send initial quote
    const quote = await getStockQuote(symbol);
    socket.emit('price_update', quote);

    console.log(`[Socket] ${socket.id} subscribed to ${symbol}`);
  });

  // Handle unsubscription
  socket.on('unsubscribe', (data) => {
    const symbol = typeof data === 'string' ? data : data.symbol;
    socket.leave(symbol);

    const subs = subscriptions.get(symbol);
    if (subs) {
      subs.delete(socket.id);
      if (subs.size === 0) {
        subscriptions.delete(symbol);
      }
    }

    console.log(`[Socket] ${socket.id} unsubscribed from ${symbol}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

/**
 * REST API endpoints
 */

// Get single stock quote
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const quote = await getStockQuote(req.params.symbol.toUpperCase());
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get multiple quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const symbols = req.query.symbols?.split(',') || PSE_TICKERS;
    const quotes = await Promise.all(
      symbols.map(s => getStockQuote(s.toUpperCase()))
    );
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get all PSE tickers
app.get('/api/tickers', (_req, res) => {
  res.json(PSE_TICKERS);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount,
  });
});

/**
 * Periodic data updates
 * Fetch updates every 30 seconds and broadcast to subscribers
 */
setInterval(async () => {
  const symbols = Array.from(subscriptions.keys());
  if (symbols.length === 0) return;

  console.log(`[Update] Fetching quotes for ${symbols.length} symbols`);

  for (const symbol of symbols) {
    const quote = await getStockQuote(symbol);
    io.to(symbol).emit('price_update', quote);
  }
}, 30000); // Update every 30 seconds

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   PSE WebSocket Server Running        ║
║   Port: ${PORT}                           ║
║   Supported Tickers: ${PSE_TICKERS.length}          ║
╚═══════════════════════════════════════╝
  `);
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/quote/:symbol`);
  console.log(`  GET  http://localhost:${PORT}/api/quotes?symbols=BDO,JFC`);
  console.log(`  GET  http://localhost:${PORT}/api/tickers`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  WS   ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

module.exports = { app, io };
