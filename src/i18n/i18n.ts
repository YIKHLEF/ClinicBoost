import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';
import arTranslation from './locales/ar.json';

// Pluralization rules for Arabic
const arabicPluralRule = (count: number) => {
  if (count === 0) return 0; // zero
  if (count === 1) return 1; // one
  if (count === 2) return 2; // two
  if (count >= 3 && count <= 10) return 3; // few
  if (count >= 11 && count <= 99) return 4; // many
  return 5; // other
};

// Date and number formatting configurations
export const formatters = {
  en: {
    date: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    currency: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }),
    number: new Intl.NumberFormat('en-US')
  },
  fr: {
    date: new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    currency: new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }),
    number: new Intl.NumberFormat('fr-FR')
  },
  ar: {
    date: new Intl.DateTimeFormat('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: new Intl.DateTimeFormat('ar-MA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    currency: new Intl.NumberFormat('ar-MA', {
      style: 'currency',
      currency: 'MAD'
    }),
    number: new Intl.NumberFormat('ar-MA')
  }
};

// Helper functions for formatting
export const formatDate = (date: Date, language: string = i18n.language) => {
  const formatter = formatters[language as keyof typeof formatters]?.date || formatters.en.date;
  return formatter.format(date);
};

export const formatTime = (date: Date, language: string = i18n.language) => {
  const formatter = formatters[language as keyof typeof formatters]?.time || formatters.en.time;
  return formatter.format(date);
};

export const formatCurrency = (amount: number, language: string = i18n.language) => {
  const formatter = formatters[language as keyof typeof formatters]?.currency || formatters.en.currency;
  return formatter.format(amount);
};

export const formatNumber = (number: number, language: string = i18n.language) => {
  const formatter = formatters[language as keyof typeof formatters]?.number || formatters.en.number;
  return formatter.format(number);
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      fr: {
        translation: frTranslation
      },
      ar: {
        translation: arTranslation
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ar'],
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'currency') return formatCurrency(value, lng);
        if (format === 'number') return formatNumber(value, lng);
        if (format === 'date') return formatDate(new Date(value), lng);
        if (format === 'time') return formatTime(new Date(value), lng);
        return value;
      }
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      checkWhitelist: true
    },
    pluralSeparator: '_',
    contextSeparator: '_',
    nsSeparator: ':',
    keySeparator: '.',
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,
    joinArrays: false,
    overloadTranslationOptionHandler: (args) => {
      return {
        defaultValue: args[1]
      };
    }
  });

// Set document direction based on language
i18n.on('languageChanged', (lng) => {
  const direction = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = direction;
  document.documentElement.lang = lng;

  // Update CSS custom properties for RTL support
  document.documentElement.style.setProperty('--text-align-start', direction === 'rtl' ? 'right' : 'left');
  document.documentElement.style.setProperty('--text-align-end', direction === 'rtl' ? 'left' : 'right');
  document.documentElement.style.setProperty('--margin-start', direction === 'rtl' ? 'margin-right' : 'margin-left');
  document.documentElement.style.setProperty('--margin-end', direction === 'rtl' ? 'margin-left' : 'margin-right');
  document.documentElement.style.setProperty('--padding-start', direction === 'rtl' ? 'padding-right' : 'padding-left');
  document.documentElement.style.setProperty('--padding-end', direction === 'rtl' ? 'padding-left' : 'padding-right');
  document.documentElement.style.setProperty('--border-start', direction === 'rtl' ? 'border-right' : 'border-left');
  document.documentElement.style.setProperty('--border-end', direction === 'rtl' ? 'border-left' : 'border-right');
  document.documentElement.style.setProperty('--transform-x', direction === 'rtl' ? 'scaleX(-1)' : 'scaleX(1)');
});

export default i18n;