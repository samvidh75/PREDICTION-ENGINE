// Jest setup - runs before all tests

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
};

// Set test timeout to 10s for slower tests
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_KEY = 'test-key';

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeValidOrderBook(): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} to not be within ${floor}-${ceiling}`
          : `Expected ${received} to be within ${floor}-${ceiling}`,
    };
  },
  toBeValidOrderBook(received: any) {
    const pass =
      received &&
      received.bid &&
      received.ask &&
      Array.isArray(received.bid) &&
      Array.isArray(received.ask) &&
      received.bid.length > 0 &&
      received.ask.length > 0 &&
      received.bid[0].price > 0 &&
      received.ask[0].price > 0 &&
      received.bid[0].price < received.ask[0].price;

    return {
      pass,
      message: () =>
        pass
          ? 'Expected order book to be invalid'
          : 'Expected order book to be valid (bid < ask, positive prices, arrays non-empty)',
    };
  },
});
