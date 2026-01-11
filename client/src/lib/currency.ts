export type SupportedCurrency = 'USD' | 'AMD';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ['USD', 'AMD'] as const;

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  AMD: '֏'
};

export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  AMD: 'Armenian Dram'
};

export interface ExchangeRates {
  usdToAmd: number;
  amdToUsd: number;
  timestamp: number;
  source?: string;
}

export class CurrencyService {
  private static STORAGE_KEY = 'currency_preference';
  private static RATES_KEY = 'exchange_rates';
  private static FALLBACK_RATE = 380;
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

  /**
   * Получает сохраненную валютную предпочтительность из localStorage
   */
  static getPreference(): SupportedCurrency {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && SUPPORTED_CURRENCIES.includes(stored as SupportedCurrency)) {
        return stored as SupportedCurrency;
      }
    } catch (error) {
      console.error('Error reading currency preference:', error);
    }
    return 'USD';
  }

  /**
   * Сохраняет валютную предпочтительность в localStorage
   */
  static setPreference(currency: SupportedCurrency): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, currency);
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  }

  /**
   * Получает курсы валют (с сервера или из кеша)
   */
  static async fetchRates(): Promise<ExchangeRates> {
    // Проверяем кеш
    const cached = this.getCachedRates();
    if (cached && !this.isStale(cached)) {
      console.log('Using cached exchange rates');
      return cached;
    }

    // Запрашиваем с сервера
    try {
      console.log('Fetching fresh exchange rates from server');
      const response = await fetch('/api/exchange-rates');

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const rates: ExchangeRates = await response.json();
      this.cacheRates(rates);
      return rates;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);

      // Если есть старый кеш, возвращаем его
      if (cached) {
        console.log('Using stale cached rates as fallback');
        return cached;
      }

      // Иначе возвращаем fallback курсы
      console.log('Using hardcoded fallback rates');
      return this.getFallbackRates();
    }
  }

  /**
   * Конвертирует сумму из одной валюты в другую
   */
  static convertAmount(
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency,
    rates: ExchangeRates
  ): number {
    // Если валюты совпадают, конвертация не нужна
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // USD -> AMD
    if (fromCurrency === 'USD' && toCurrency === 'AMD') {
      return Math.round(amount * rates.usdToAmd);
    }

    // AMD -> USD
    if (fromCurrency === 'AMD' && toCurrency === 'USD') {
      return Math.round(amount * rates.amdToUsd);
    }

    return amount;
  }

  /**
   * Форматирует цену в выбранной валюте
   */
  static formatPrice(
    amount: number,
    currency: SupportedCurrency,
    locale: string = 'en-US'
  ): string {
    // Определяем локаль в зависимости от языка приложения
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'en-US': 'en-US',
      'ru': 'ru-RU',
      'ru-RU': 'ru-RU',
      'am': 'hy-AM',
      'hy': 'hy-AM',
      'hy-AM': 'hy-AM'
    };

    const normalizedLocale = localeMap[locale] || 'en-US';

    try {
      return new Intl.NumberFormat(normalizedLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      // Fallback на ручное форматирование если Intl.NumberFormat не поддерживает валюту
      const symbol = CURRENCY_SYMBOLS[currency];
      const formatted = new Intl.NumberFormat(normalizedLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

      // Для AMD символ идет после числа, для USD - перед
      return currency === 'AMD' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
    }
  }

  /**
   * Получает символ валюты
   */
  static getCurrencySymbol(currency: SupportedCurrency): string {
    return CURRENCY_SYMBOLS[currency];
  }

  /**
   * Получает название валюты
   */
  static getCurrencyName(currency: SupportedCurrency): string {
    return CURRENCY_NAMES[currency];
  }

  /**
   * Получает закешированные курсы из localStorage
   */
  private static getCachedRates(): ExchangeRates | null {
    try {
      const cached = localStorage.getItem(this.RATES_KEY);
      if (!cached) return null;

      const rates: ExchangeRates = JSON.parse(cached);
      return rates;
    } catch (error) {
      console.error('Error reading cached rates:', error);
      return null;
    }
  }

  /**
   * Сохраняет курсы в localStorage
   */
  private static cacheRates(rates: ExchangeRates): void {
    try {
      localStorage.setItem(this.RATES_KEY, JSON.stringify(rates));
    } catch (error) {
      console.error('Error caching rates:', error);
    }
  }

  /**
   * Проверяет, устарели ли закешированные курсы
   */
  private static isStale(rates: ExchangeRates): boolean {
    const age = Date.now() - rates.timestamp;
    return age > this.CACHE_DURATION;
  }

  /**
   * Возвращает резервные курсы
   */
  private static getFallbackRates(): ExchangeRates {
    return {
      usdToAmd: this.FALLBACK_RATE,
      amdToUsd: 1 / this.FALLBACK_RATE,
      timestamp: Date.now(),
      source: 'fallback'
    };
  }
}
