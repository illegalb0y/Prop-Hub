import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ru from './locales/ru.json';
import am from './locales/am.json';

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'am'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  ru: 'Русский',
  am: 'Hayeren'
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: 'EN',
  ru: 'RU',
  am: 'HY'
};

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  am: { translation: am }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['localStorage', 'cookie', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18nextLng',
      caches: ['localStorage', 'cookie']
    },
    interpolation: {
      escapeValue: false
    }
  });

export function setLanguage(lang: SupportedLanguage): void {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);
  document.cookie = `i18nextLng=${lang};path=/;max-age=31536000;SameSite=Lax`;
  window.location.reload();
}

export function getCurrentLanguage(): SupportedLanguage {
  const lang = i18n.language;
  if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return 'en';
}

export default i18n;
