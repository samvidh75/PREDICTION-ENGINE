import { screenerService } from '@/services';
import { NIFTY_50_SYMBOLS } from '@/config/providers';

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
      const data = await screenerService.getFundamentals(symbol);
      console.log(`[ScreenerWorker] ${symbol}: ${data ? 'OK' : 'FAILED'}`);
    } catch (e) {
      console.error(`[ScreenerWorker] ${symbol}: ${e}`);
      this.queue.push(symbol);
    }

    this.processing = false;
    setTimeout(() => this.processNext(), this.delayMs);
  }
}

export const screenerWorker = new ScreenerWorker();
