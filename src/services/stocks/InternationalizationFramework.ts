// src/services/stocks/InternationalizationFramework.ts

export type SupportedCurrency = 'PHP' | 'USD' | 'GBP' | 'EUR';

export interface ExchangeConfig {
  exchangeName: string;
  currency: SupportedCurrency;
  symbolPrefix: string;
  rateToPHP: number;
}

export class InternationalizationFramework {
  private static activeCurrency: SupportedCurrency = 'PHP';

  private static configs: Record<SupportedCurrency, ExchangeConfig> = {
    PHP: { exchangeName: 'PSE', currency: 'PHP', symbolPrefix: '₱', rateToPHP: 1.0 },
    USD: { exchangeName: 'NASDAQ/NYSE', currency: 'USD', symbolPrefix: '$', rateToPHP: 56.5 },
    GBP: { exchangeName: 'LSE', currency: 'GBP', symbolPrefix: '£', rateToPHP: 71.0 },
    EUR: { exchangeName: 'Euronext', currency: 'EUR', symbolPrefix: '€', rateToPHP: 61.0 },
  };

  public static setCurrency(curr: SupportedCurrency): void {
    this.activeCurrency = curr;
    console.info(`[Internationalization] Switched currency context to ${curr}`);
  }

  public static getActiveConfig(): ExchangeConfig {
    return this.configs[this.activeCurrency];
  }

  public static formatPrice(priceInPHP: number): string {
    const config = this.getActiveConfig();
    const converted = priceInPHP / config.rateToPHP;
    return `${config.symbolPrefix}${converted.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  }
}
