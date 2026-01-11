import type { Request, Response } from 'express';

export interface ExchangeRates {
  usdToAmd: number;
  amdToUsd: number;
  timestamp: number;
  source: string;
}

// Fallback курс на случай, если rate.am недоступен
const FALLBACK_RATE = 380;

// Кеш для хранения курсов (в production лучше использовать Redis или database)
let cachedRates: ExchangeRates | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Получает курсы валют с rate.am через парсинг HTML
 * Извлекает "Average" значение из таблицы внизу страницы
 */
async function fetchRatesFromRateAm(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://rate.am/');

    if (!response.ok) {
      throw new Error(`rate.am returned status ${response.status}`);
    }

    const html = await response.text();

    // Парсим HTML для извлечения среднего курса
    // Ищем строку "Average" и извлекаем значения Buy и Sell для USD
    const averageMatch = html.match(/Average[\s\S]*?USD[\s\S]*?(\d+(?:\.\d+)?)[\s\S]*?(\d+(?:\.\d+)?)/);

    if (!averageMatch) {
      throw new Error('Could not find average exchange rate on rate.am');
    }

    const buyRate = parseFloat(averageMatch[1]);
    const sellRate = parseFloat(averageMatch[2]);

    // Вычисляем средний курс
    const usdToAmd = (buyRate + sellRate) / 2;
    const amdToUsd = 1 / usdToAmd;

    return {
      usdToAmd: Math.round(usdToAmd * 100) / 100, // Округляем до 2 знаков
      amdToUsd: Math.round(amdToUsd * 100000) / 100000, // Округляем до 5 знаков
      timestamp: Date.now(),
      source: 'rate.am'
    };
  } catch (error) {
    console.error('Error fetching rates from rate.am:', error);
    throw error;
  }
}

/**
 * Возвращает резервные курсы валют
 */
function getFallbackRates(): ExchangeRates {
  return {
    usdToAmd: FALLBACK_RATE,
    amdToUsd: Math.round((1 / FALLBACK_RATE) * 100000) / 100000,
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
