/**
 * ScreenerWorker — scheduled screener.in fundamental data refresh.
 *
 * Runs on a 12-hour cycle, fetching fundamentals for Nifty 50 symbols
 * via the existing API client. Uses 12s delay between requests to avoid
 * rate limiting.
 *
 * NOTE: This is a client-side warm-up worker. The production data pipeline
 * uses server-side Python scripts (fundamental_scraper.py, nightly_eod_sync.py)
 * for authoritative fundamental data.
 */

import { api } from '../services/api/client';
import { NIFTY_50_SYMBOLS } from '../config/providers';

export class ScreenerWorker {
  private queue: string[] = [];
  private processing = false;
  private delayMs = 12000;

  start(): void {
    this.queue = [...NIFTY_50_SYMBOLS].filter(Boolean);
    this.processNext();

    setInterval(() => {
      this.queue = [...NIFTY_50_SYMBOLS].filter(Boolean);
      this.processNext();
    }, 12 * 60 * 60 * 1000);
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0 || this.processing) return;
    this.processing = true;

    const symbol = this.queue.shift()!;
    try {
      await api.getCompanyResearch(symbol);
    } catch (e) {
      console.error(`[ScreenerWorker] ${symbol}: ${e}`);
      this.queue.push(symbol);
    }

    this.processing = false;
    setTimeout(() => this.processNext(), this.delayMs);
  }
}

export const screenerWorker = new ScreenerWorker();
