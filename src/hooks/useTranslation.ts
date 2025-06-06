/**
 * Enhanced Translation Hook
 * 
 * This hook extends react-i18next's useTranslation with additional
 * functionality for medical terminology, formatting, and RTL support.
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';
import { formatDate, formatTime, formatCurrency, formatNumber } from '../i18n/i18n';

export interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
  lng?: string;
}

export interface FormattingOptions {
  date?: Date;
  time?: Date;
  currency?: number;
  number?: number;
  language?: string;
}

/**
 * Enhanced translation hook with medical terminology support
 */
export const useTranslation = (namespace?: string) => {
  const { t: originalT, i18n, ready } = useI18nTranslation(namespace);

  /**
   * Enhanced translation function with better typing and formatting
   */
  const t = (key: string, options?: TranslationOptions | string) => {
    if (typeof options === 'string') {
      return originalT(key, { defaultValue: options });
    }
    return originalT(key, options);
  };

  /**
   * Translation function specifically for medical terminology
   */
  const tMedical = (key: string, options?: TranslationOptions) => {
    return originalT(`medical.${key}`, options);
  };

  /**
   * Translation function for common UI elements
   */
  const tCommon = (key: string, options?: TranslationOptions) => {
    return originalT(`common.${key}`, options);
  };

  /**
   * Translation function for error messages
   */
  const tError = (key: string, options?: TranslationOptions) => {
    return originalT(`errors.${key}`, options);
  };

  /**
   * Translation function for validation messages
   */
  const tValidation = (key: string, options?: TranslationOptions) => {
    return originalT(`validation.${key}`, options);
  };

  /**
   * Format values according to current language
   */
  const format = (options: FormattingOptions) => {
    const language = options.language || i18n.language;
    
    const result: Record<string, string> = {};
    
    if (options.date) {
      result.date = formatDate(options.date, language);
    }
    
    if (options.time) {
      result.time = formatTime(options.time, language);
    }
    
    if (options.currency !== undefined) {
      result.currency = formatCurrency(options.currency, language);
    }
    
    if (options.number !== undefined) {
      result.number = formatNumber(options.number, language);
    }
    
    return result;
  };

  /**
   * Get current language direction
   */
  const getDirection = () => {
    return i18n.language === 'ar' ? 'rtl' : 'ltr';
  };

  /**
   * Check if current language is RTL
   */
  const isRTL = () => {
    return i18n.language === 'ar';
  };

  /**
   * Get language-specific CSS class
   */
  const getLanguageClass = () => {
    return `lang-${i18n.language}`;
  };

  /**
   * Get RTL-aware CSS class
   */
  const getRTLClass = (baseClass: string) => {
    return isRTL() ? `${baseClass} rtl` : baseClass;
  };

  /**
   * Pluralization helper for Arabic
   */
  const tPlural = (key: string, count: number, options?: Omit<TranslationOptions, 'count'>) => {
    return originalT(key, { ...options, count });
  };

  /**
   * Get available languages
   */
  const getLanguages = () => {
    return [
      { code: 'en', name: t('common.english', 'English'), nativeName: 'English' },
      { code: 'fr', name: t('common.french', 'French'), nativeName: 'Français' },
      { code: 'ar', name: t('common.arabic', 'Arabic'), nativeName: 'العربية' }
    ];
  };

  /**
   * Change language with proper RTL handling
   */
  const changeLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
    
    // Update document direction
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    
    // Update body class for language-specific styling
    document.body.className = document.body.className.replace(/lang-\w+/g, '');
    document.body.classList.add(`lang-${language}`);
    
    // Store language preference
    localStorage.setItem('i18nextLng', language);
  };

  /**
   * Get medical term with proper context
   */
  const getMedicalTerm = (term: string, context?: 'singular' | 'plural') => {
    const key = context ? `medical.${term}_${context}` : `medical.${term}`;
    return originalT(key, { defaultValue: tMedical(term) });
  };

  /**
   * Get appointment status translation
   */
  const getAppointmentStatus = (status: string) => {
    return originalT(`appointments.${status}`, { defaultValue: status });
  };

  /**
   * Get patient status translation
   */
  const getPatientStatus = (status: string) => {
    return originalT(`patients.${status}`, { defaultValue: status });
  };

  /**
   * Format patient name according to language conventions
   */
  const formatPatientName = (firstName: string, lastName: string) => {
    if (isRTL()) {
      // In Arabic, typically first name comes first
      return `${firstName} ${lastName}`;
    } else {
      // In English/French, can be either way depending on context
      return `${firstName} ${lastName}`;
    }
  };

  /**
   * Get date format pattern for current language
   */
  const getDateFormat = () => {
    switch (i18n.language) {
      case 'ar':
        return 'dd/MM/yyyy';
      case 'fr':
        return 'dd/MM/yyyy';
      case 'en':
      default:
        return 'MM/dd/yyyy';
    }
  };

  /**
   * Get time format pattern for current language
   */
  const getTimeFormat = () => {
    switch (i18n.language) {
      case 'ar':
      case 'fr':
        return 'HH:mm';
      case 'en':
      default:
        return 'h:mm a';
    }
  };

  return {
    t,
    tMedical,
    tCommon,
    tError,
    tValidation,
    tPlural,
    format,
    getDirection,
    isRTL,
    getLanguageClass,
    getRTLClass,
    getLanguages,
    changeLanguage,
    getMedicalTerm,
    getAppointmentStatus,
    getPatientStatus,
    formatPatientName,
    getDateFormat,
    getTimeFormat,
    i18n,
    ready,
    language: i18n.language,
    languages: i18n.languages
  };
};

export default useTranslation;
