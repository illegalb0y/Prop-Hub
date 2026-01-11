import type { Request, Response } from 'express';

export interface ExchangeRates {
  usdToAmd: number;
  amdToUsd: number;
  usdToEur: number;
  eurToUsd: number;
  eurToAmd: number;
  amdToEur: number;
  timestamp: number;
  source: string;
}

// Fallback курсы на случай, если rate.am недоступен
const FALLBACK_RATE = 380;
const FALLBACK_EUR_RATE = 0.92; // Примерный курс USD/EUR

// Кеш для хранения курсов (в production лучше использовать Redis или database)
let cachedRates: ExchangeRates | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Получает курсы валют с rate.am через парсинг HTML
 * Извлекает averageRates из встроенного JSON в странице
 */
async function fetchRatesFromRateAm(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://www.rate.am/en/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`rate.am returned status ${response.status}`);
    }

    const html = await response.text();

    // Извлекаем USD CLEARING rates напрямую из averageRates секции
    // Формат: averageRates...USD...CLEARING...buy:"379.05"...sell:"383.67"
    const usdMatch = html.match(/averageRates.*?USD.*?CLEARING.*?buy.*?:\\"([0-9.]+)\\".*?sell.*?:\\"([0-9.]+)\\"/s);
    const eurMatch = html.match(/averageRates.*?EUR.*?CLEARING.*?buy.*?:\\"([0-9.]+)\\".*?sell.*?:\\"([0-9.]+)\\"/s);
    
    if (!usdMatch) {
      throw new Error('Could not find USD CLEARING rates in averageRates section');
    }
    
    if (!eurMatch) {
      throw new Error('Could not find EUR CLEARING rates in averageRates section');
    }

    const usdBuyRate = parseFloat(usdMatch[1]);
    const usdSellRate = parseFloat(usdMatch[2]);
    const eurBuyRate = parseFloat(eurMatch[1]);
    const eurSellRate = parseFloat(eurMatch[2]);

    console.log(`USD rates from rate.am - Buy: ${usdBuyRate}, Sell: ${usdSellRate}`);
    console.log(`EUR rates from rate.am - Buy: ${eurBuyRate}, Sell: ${eurSellRate}`);

    // Вычисляем средний курс USD/AMD
    const usdToAmd = (usdBuyRate + usdSellRate) / 2;
    const amdToUsd = 1 / usdToAmd;

    // Вычисляем средний курс EUR/AMD
    const eurToAmd = (eurBuyRate + eurSellRate) / 2;
    const amdToEur = 1 / eurToAmd;

    // Вычисляем USD/EUR через AMD
    const eurToUsd = eurToAmd * amdToUsd;
    const usdToEur = 1 / eurToUsd;

    const rates = {
      usdToAmd: Math.round(usdToAmd * 100) / 100,
      amdToUsd: Math.round(amdToUsd * 100000) / 100000,
      usdToEur: Math.round(usdToEur * 100000) / 100000,
      eurToUsd: Math.round(eurToUsd * 100) / 100,
      eurToAmd: Math.round(eurToAmd * 100) / 100,
      amdToEur: Math.round(amdToEur * 100000) / 100000,
      timestamp: Date.now(),
      source: 'rate.am'
    };

    console.log('Parsed exchange rates:', rates);

    return rates;
  } catch (error) {
    console.error('Error fetching rates from rate.am:', error);
    throw error;
  }
}

/**
 * Возвращает резервные курсы валют
 */
function getFallbackRates(): ExchangeRates {
  const eurToAmd = (1 / FALLBACK_EUR_RATE) * FALLBACK_RATE;
  return {
    usdToAmd: FALLBACK_RATE,
    amdToUsd: Math.round((1 / FALLBACK_RATE) * 100000) / 100000,
    usdToEur: FALLBACK_EUR_RATE,
    eurToUsd: Math.round((1 / FALLBACK_EUR_RATE) * 100) / 100,
    eurToAmd: Math.round(eurToAmd * 100) / 100,
    amdToEur: Math.round((1 / eurToAmd) * 100000) / 100000,
    timestamp: Date.now(),
    source: 'fallback'
  };
}

/**
 * Проверяет, актуален ли кеш
 */
function isCacheValid(): boolean {
  return cachedRates !== null && (Date.now() - lastFetchTime) < CACHE_DURATION;
}

/**
 * Получает актуальные курсы валют (с кешированием)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  // Проверяем кеш
  if (isCacheValid() && cachedRates) {
    console.log('Returning cached exchange rates');
    return cachedRates;
  }

  // Пытаемся получить свежие курсы
  try {
    console.log('Fetching fresh exchange rates from rate.am');
    const rates = await fetchRatesFromRateAm();

    // Сохраняем в кеш
    cachedRates = rates;
    lastFetchTime = Date.now();

    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates, using fallback');

    // Если есть старый кеш, возвращаем его
    if (cachedRates) {
      return { ...cachedRates, source: 'cached-fallback' };
    }

    // Иначе используем резервные курсы
    return getFallbackRates();
  }
}

/**
 * Express handler для endpoint /api/exchange-rates
 */
export async function handleExchangeRatesRequest(req: Request, res: Response) {
  try {
    const rates = await getExchangeRates();
    res.json(rates);
  } catch (error) {
    console.error('Error in exchange rates endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange rates',
      rates: getFallbackRates()
    });
  }
}
