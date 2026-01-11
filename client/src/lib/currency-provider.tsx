import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { CurrencyService, type SupportedCurrency, type ExchangeRates } from './currency';

interface CurrencyContextValue {
  currentCurrency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  rates: ExchangeRates | null;
  isLoading: boolean;
  convertPrice: (amount: number, originalCurrency: SupportedCurrency) => number;
  formatPrice: (amount: number, originalCurrency: SupportedCurrency) => string;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currentCurrency, setCurrentCurrency] = useState<SupportedCurrency>(
    CurrencyService.getPreference()
  );
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка курсов при монтировании компонента
  useEffect(() => {
    loadRates();
  }, []);

  /**
   * Загружает актуальные курсы валют
   */
  const loadRates = async () => {
    setIsLoading(true);
    try {
      const fetchedRates = await CurrencyService.fetchRates();
      setRates(fetchedRates);
      console.log('Exchange rates loaded:', fetchedRates);
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Обновляет курсы валют вручную
   */
  const refreshRates = async () => {
    await loadRates();
  };

  /**
   * Устанавливает новую валюту и сохраняет в localStorage
   */
  const setCurrency = (currency: SupportedCurrency) => {
    setCurrentCurrency(currency);
    CurrencyService.setPreference(currency);
    console.log('Currency changed to:', currency);
  };

  /**
   * Конвертирует цену из оригинальной валюты в выбранную
   */
  const convertPrice = (amount: number, originalCurrency: SupportedCurrency): number => {
    if (!rates) {
      console.warn('Exchange rates not loaded yet');
      return amount;
    }
    return CurrencyService.convertAmount(amount, originalCurrency, currentCurrency, rates);
  };

  /**
   * Форматирует цену с конвертацией в выбранную валюту
   */
  const formatPrice = (amount: number, originalCurrency: SupportedCurrency): string => {
    const converted = convertPrice(amount, originalCurrency);

    // Используем локаль из i18n если доступен
    let locale = 'en-US';
    try {
      // Пытаемся получить текущий язык из i18n
      const i18nLang = document.documentElement.lang || 'en';
      locale = i18nLang;
    } catch (error) {
      // Игнорируем ошибки, используем дефолтную локаль
    }

    return CurrencyService.formatPrice(converted, currentCurrency, locale);
  };

  const contextValue: CurrencyContextValue = {
    currentCurrency,
    setCurrency,
    rates,
    isLoading,
    convertPrice,
    formatPrice,
    refreshRates,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Хук для доступа к функциям управления валютой
 * Должен использоваться внутри CurrencyProvider
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
