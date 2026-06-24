// src/services/stocks/InternationalizationFramework.ts

export type SupportedCurrency = 'INR' | 'USD' | 'GBP' | 'EUR';

export interface ExchangeConfig {
  exchangeName: string;
  currency: SupportedCurrency;
  symbolPrefix: string;
  rateToINR: number;
}

export class InternationalizationFramework {
  private static activeCurrency: SupportedCurrency = 'INR';

  private static configs: Record<SupportedCurrency, ExchangeConfig> = {
    INR: { exchangeName: 'NSE/BSE', currency: 'INR', symbolPrefix: '₹', rateToINR: 1.0 },
    USD: { exchangeName: 'NASDAQ/NYSE', currency: 'USD', symbolPrefix: '$', rateToINR: 83.5 },
    GBP: { exchangeName: 'LSE', currency: 'GBP', symbolPrefix: '£', rateToINR: 106.2 },
    EUR: { exchangeName: 'Euronext', currency: 'EUR', symbolPrefix: '€', rateToINR: 90.8 },
  };

  public static setCurrency(curr: SupportedCurrency): void {
    this.activeCurrency = curr;
    console.info(`[Internationalization] Switched currency context to ${curr}`);
  }

  public static getActiveConfig(): ExchangeConfig {
    return this.configs[this.activeCurrency];
  }

  public static formatPrice(priceInINR: number): string {
    const config = this.getActiveConfig();
    const converted = priceInINR / config.rateToINR;
    return `${config.symbolPrefix}${converted.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  }
}
