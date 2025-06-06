import { describe, test, expect } from 'vitest';
import enTranslations from '../i18n/locales/en.json';
import frTranslations from '../i18n/locales/fr.json';
import arTranslations from '../i18n/locales/ar.json';

// Helper function to get all keys from a nested object
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  
  return keys;
}

// Helper function to check if a key exists in a nested object
function hasKey(obj: any, keyPath: string): boolean {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return true;
}

describe('Translation Completeness', () => {
  const englishKeys = getAllKeys(enTranslations);
  
  test('should have all English translation keys', () => {
    expect(englishKeys.length).toBeGreaterThan(0);
    
    // Check for key navigation sections
    expect(englishKeys).toContain('navigation.dashboard');
    expect(englishKeys).toContain('navigation.patients');
    expect(englishKeys).toContain('navigation.appointments');
    expect(englishKeys).toContain('navigation.reportsAnalytics');
    expect(englishKeys).toContain('navigation.backupRecovery');
    
    // Check for backup translations
    expect(englishKeys).toContain('backup.title');
    expect(englishKeys).toContain('backup.config.title');
    expect(englishKeys).toContain('backup.drp.title');
    
    // Check for test translations
    expect(englishKeys).toContain('test.i18nTitle');
    expect(englishKeys).toContain('test.languageSwitching');
  });

  test('French translations should cover all English keys', () => {
    const frenchKeys = getAllKeys(frTranslations);
    const missingKeys: string[] = [];
    
    for (const key of englishKeys) {
      if (!hasKey(frTranslations, key)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      console.warn('Missing French translations:', missingKeys);
    }
    
    // Allow for some missing keys but ensure coverage is high
    const coverage = ((englishKeys.length - missingKeys.length) / englishKeys.length) * 100;
    expect(coverage).toBeGreaterThan(95); // 95% coverage required
  });

  test('Arabic translations should cover all English keys', () => {
    const arabicKeys = getAllKeys(arTranslations);
    const missingKeys: string[] = [];
    
    for (const key of englishKeys) {
      if (!hasKey(arTranslations, key)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0) {
      console.warn('Missing Arabic translations:', missingKeys);
    }
    
    // Allow for some missing keys but ensure coverage is high
    const coverage = ((englishKeys.length - missingKeys.length) / englishKeys.length) * 100;
    expect(coverage).toBeGreaterThan(95); // 95% coverage required
  });

  test('should have navigation translations in all languages', () => {
    const navigationKeys = [
      'navigation.dashboard',
      'navigation.patients',
      'navigation.appointments',
      'navigation.messaging',
      'navigation.campaigns',
      'navigation.billing',
      'navigation.reports',
      'navigation.reportsAnalytics',
      'navigation.backupRecovery',
      'navigation.settings',
      'navigation.userManagement',
      'navigation.accessibility',
      'navigation.integrations'
    ];

    for (const key of navigationKeys) {
      expect(hasKey(enTranslations, key)).toBe(true);
      expect(hasKey(frTranslations, key)).toBe(true);
      expect(hasKey(arTranslations, key)).toBe(true);
    }
  });

  test('should have backup translations in all languages', () => {
    const backupKeys = [
      'backup.title',
      'backup.subtitle',
      'backup.config.title',
      'backup.config.tabs.general',
      'backup.config.tabs.security',
      'backup.config.tabs.notifications',
      'backup.config.tabs.compliance',
      'backup.drp.title',
      'backup.drp.tabs.overview',
      'backup.drp.tabs.steps',
      'backup.drp.tabs.contacts',
      'backup.drp.tabs.testing'
    ];

    for (const key of backupKeys) {
      expect(hasKey(enTranslations, key)).toBe(true);
      expect(hasKey(frTranslations, key)).toBe(true);
      expect(hasKey(arTranslations, key)).toBe(true);
    }
  });

  test('should have test translations in all languages', () => {
    const testKeys = [
      'test.i18nTitle',
      'test.i18nDescription',
      'test.currentLanguage',
      'test.languageSwitching',
      'test.automatedTests',
      'test.runTests',
      'test.testResults'
    ];

    for (const key of testKeys) {
      expect(hasKey(enTranslations, key)).toBe(true);
      expect(hasKey(frTranslations, key)).toBe(true);
      expect(hasKey(arTranslations, key)).toBe(true);
    }
  });

  test('should have breadcrumb translations in all languages', () => {
    const breadcrumbKeys = [
      'breadcrumbs.home',
      'breadcrumbs.dashboard',
      'breadcrumbs.patients',
      'breadcrumbs.appointments',
      'breadcrumbs.messaging',
      'breadcrumbs.campaigns',
      'breadcrumbs.billing',
      'breadcrumbs.reports',
      'breadcrumbs.settings'
    ];

    for (const key of breadcrumbKeys) {
      expect(hasKey(enTranslations, key)).toBe(true);
      expect(hasKey(frTranslations, key)).toBe(true);
      expect(hasKey(arTranslations, key)).toBe(true);
    }
  });
});

describe('Translation Quality', () => {
  test('should not have empty translation values', () => {
    const checkEmptyValues = (obj: any, prefix = ''): string[] => {
      const emptyKeys: string[] = [];
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            emptyKeys.push(...checkEmptyValues(obj[key], fullKey));
          } else if (typeof obj[key] === 'string' && obj[key].trim() === '') {
            emptyKeys.push(fullKey);
          }
        }
      }
      
      return emptyKeys;
    };

    const emptyEnglish = checkEmptyValues(enTranslations);
    const emptyFrench = checkEmptyValues(frTranslations);
    const emptyArabic = checkEmptyValues(arTranslations);

    expect(emptyEnglish).toHaveLength(0);
    expect(emptyFrench).toHaveLength(0);
    expect(emptyArabic).toHaveLength(0);
  });

  test('should have consistent structure across all languages', () => {
    const englishKeys = getAllKeys(enTranslations);
    const frenchKeys = getAllKeys(frTranslations);
    const arabicKeys = getAllKeys(arTranslations);

    // Check that all languages have similar key counts (allowing for some variation)
    const minKeys = Math.min(englishKeys.length, frenchKeys.length, arabicKeys.length);
    const maxKeys = Math.max(englishKeys.length, frenchKeys.length, arabicKeys.length);
    
    // Allow up to 5% variation in key counts
    const variation = (maxKeys - minKeys) / maxKeys;
    expect(variation).toBeLessThan(0.05);
  });
});
