import i18n from '@/i18n';

interface FormatCurrencyOptions {
  compact?: boolean;
}

export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: FormatCurrencyOptions
): string {
  const locale = i18n.language === 'ru' ? 'ru-RU' :
                 i18n.language === 'hy' ? 'hy-AM' :
                 'en-US';

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };

  if (options?.compact) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const locale = i18n.language === 'ru' ? 'ru-RU' : 
                 i18n.language === 'hy' ? 'hy-AM' : 
                 'en-US';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
}

export function formatNumber(num: number): string {
  const locale = i18n.language === 'ru' ? 'ru-RU' : 
                 i18n.language === 'hy' ? 'hy-AM' : 
                 'en-US';

  return new Intl.NumberFormat(locale).format(num);
}

export function formatCompactNumber(num: number): string {
  const locale = i18n.language === 'ru' ? 'ru-RU' : 
                 i18n.language === 'hy' ? 'hy-AM' : 
                 'en-US';

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}
