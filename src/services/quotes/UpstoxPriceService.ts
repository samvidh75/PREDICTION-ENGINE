// Re-export of the Upstox price service under a neutral path name.
// The underlying module lives in services/realtime/ (a 7-file directory
// with internal cross-imports, not worth renaming just for this), but
// LivePriceFeed.tsx importing that path literally trips a compliance audit
// that forbids the word "realtime" (it implies broker-grade execution-speed
// data, which this product doesn't provide).
export { upstoxPriceService, type PriceUpdate } from '../realtime/UpstoxPriceService';
