/**
 * I18n Test Suite
 * 
 * Tests for internationalization functionality including:
 * - Translation key resolution
 * - Language switching
 * - RTL support
 * - Date/time/currency formatting
 * - Medical terminology
 */

import i18n from '../i18n/i18n';
import { formatDate, formatTime, formatCurrency, formatNumber } from '../i18n/i18n';

// Mock console methods for testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('I18n Configuration', () => {
  test('should initialize with correct default language', () => {
    expect(i18n.language).toBeDefined();
    expect(['en', 'fr', 'ar']).toContain(i18n.language);
  });

  test('should support all required languages', () => {
    const supportedLanguages = i18n.options.supportedLngs;
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('fr');
    expect(supportedLanguages).toContain('ar');
  });

  test('should have fallback language configured', () => {
    expect(i18n.options.fallbackLng).toBe('en');
  });
});

describe('Translation Keys', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  test('should translate common UI terms', () => {
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(i18n.t('common.delete')).toBe('Delete');
    expect(i18n.t('common.edit')).toBe('Edit');
    expect(i18n.t('common.loading')).toBe('Loading...');
  });

  test('should translate authentication terms', () => {
    expect(i18n.t('auth.login')).toBe('Login');
    expect(i18n.t('auth.email')).toBe('Email');
    expect(i18n.t('auth.password')).toBe('Password');
    expect(i18n.t('auth.signUp')).toBe('Sign Up');
  });

  test('should translate medical terminology', () => {
    expect(i18n.t('medical.teeth')).toBe('Teeth');
    expect(i18n.t('medical.cavity')).toBe('Cavity');
    expect(i18n.t('medical.crown')).toBe('Crown');
    expect(i18n.t('medical.extraction')).toBe('Extraction');
    expect(i18n.t('medical.cleaning')).toBe('Cleaning');
  });

  test('should translate patient management terms', () => {
    expect(i18n.t('patients.title')).toBe('Patients');
    expect(i18n.t('patients.addPatient')).toBe('Add Patient');
    expect(i18n.t('patients.patientDetails')).toBe('Patient Details');
    expect(i18n.t('patients.medicalHistory')).toBe('Medical History');
  });

  test('should translate appointment terms', () => {
    expect(i18n.t('appointments.title')).toBe('Appointments');
    expect(i18n.t('appointments.newAppointment')).toBe('New Appointment');
    expect(i18n.t('appointments.scheduleAppointment')).toBe('Schedule Appointment');
    expect(i18n.t('appointments.appointmentDetails')).toBe('Appointment Details');
  });

  test('should handle missing keys with fallback', () => {
    const result = i18n.t('nonexistent.key', 'Fallback Text');
    expect(result).toBe('Fallback Text');
  });
});

describe('Language Switching', () => {
  test('should switch to French', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');
    expect(i18n.t('common.save')).toBe('Enregistrer');
    expect(i18n.t('common.cancel')).toBe('Annuler');
    expect(i18n.t('auth.login')).toBe('Connexion');
  });

  test('should switch to Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.language).toBe('ar');
    expect(i18n.t('common.save')).toBe('حفظ');
    expect(i18n.t('common.cancel')).toBe('إلغاء');
    expect(i18n.t('auth.login')).toBe('تسجيل الدخول');
  });

  test('should switch back to English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('common.cancel')).toBe('Cancel');
  });
});

describe('RTL Support', () => {
  test('should detect RTL for Arabic', async () => {
    await i18n.changeLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  test('should detect LTR for English', async () => {
    await i18n.changeLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  test('should detect LTR for French', async () => {
    await i18n.changeLanguage('fr');
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('Formatting Functions', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');
  const testAmount = 1250.75;
  const testNumber = 42;

  test('should format dates correctly for English', () => {
    const formatted = formatDate(testDate, 'en');
    expect(formatted).toMatch(/January 15, 2024/);
  });

  test('should format dates correctly for French', () => {
    const formatted = formatDate(testDate, 'fr');
    expect(formatted).toMatch(/15 janvier 2024/);
  });

  test('should format dates correctly for Arabic', () => {
    const formatted = formatDate(testDate, 'ar');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  test('should format currency correctly for English', () => {
    const formatted = formatCurrency(testAmount, 'en');
    expect(formatted).toMatch(/\$1,250\.75/);
  });

  test('should format currency correctly for French', () => {
    const formatted = formatCurrency(testAmount, 'fr');
    expect(formatted).toMatch(/1 250,75 €/);
  });

  test('should format currency correctly for Arabic', () => {
    const formatted = formatCurrency(testAmount, 'ar');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  test('should format numbers correctly', () => {
    expect(formatNumber(testNumber, 'en')).toBe('42');
    expect(formatNumber(1000, 'en')).toBe('1,000');
    expect(formatNumber(1000, 'fr')).toBe('1 000');
  });

  test('should format time correctly', () => {
    const timeFormatted = formatTime(testDate, 'en');
    expect(timeFormatted).toBeDefined();
    expect(typeof timeFormatted).toBe('string');
  });
});

describe('Error Handling', () => {
  test('should handle invalid language gracefully', async () => {
    const originalLanguage = i18n.language;
    
    try {
      await i18n.changeLanguage('invalid');
      // Should fallback to default language
      expect(['en', 'fr', 'ar']).toContain(i18n.language);
    } catch (error) {
      // Error is expected for invalid language
      expect(error).toBeDefined();
    }
    
    // Restore original language
    await i18n.changeLanguage(originalLanguage);
  });

  test('should handle missing translation resources', () => {
    const result = i18n.t('completely.missing.key');
    expect(result).toBe('completely.missing.key'); // Should return key as fallback
  });
});

describe('Interpolation', () => {
  test('should handle variable interpolation', () => {
    const result = i18n.t('validation.minLength', { min: 8 });
    expect(result).toContain('8');
  });

  test('should handle pluralization', () => {
    // Test English pluralization
    expect(i18n.t('common.patient', { count: 1 })).toBeDefined();
    expect(i18n.t('common.patient', { count: 2 })).toBeDefined();
  });
});

describe('Medical Terminology Accuracy', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  test('should have accurate dental terminology', () => {
    const dentalTerms = [
      'teeth', 'tooth', 'cavity', 'crown', 'bridge', 'implant',
      'extraction', 'filling', 'cleaning', 'xray', 'gums', 'enamel'
    ];

    dentalTerms.forEach(term => {
      const translation = i18n.t(`medical.${term}`);
      expect(translation).toBeDefined();
      expect(translation).not.toBe(`medical.${term}`); // Should not return the key
    });
  });

  test('should have accurate French medical terms', async () => {
    await i18n.changeLanguage('fr');
    
    expect(i18n.t('medical.teeth')).toBe('Dents');
    expect(i18n.t('medical.cavity')).toBe('Carie');
    expect(i18n.t('medical.crown')).toBe('Couronne');
    expect(i18n.t('medical.extraction')).toBe('Extraction');
  });

  test('should have accurate Arabic medical terms', async () => {
    await i18n.changeLanguage('ar');
    
    expect(i18n.t('medical.teeth')).toBe('الأسنان');
    expect(i18n.t('medical.cavity')).toBe('تسوس');
    expect(i18n.t('medical.crown')).toBe('تاج');
    expect(i18n.t('medical.extraction')).toBe('خلع');
  });
});

// Mock Jest functions if not in test environment
if (typeof jest === 'undefined') {
  global.jest = {
    fn: () => () => {},
  } as any;
  
  global.beforeAll = (fn: () => void) => fn();
  global.afterAll = (fn: () => void) => fn();
  global.beforeEach = (fn: () => void) => fn();
  global.describe = (name: string, fn: () => void) => {
    console.log(`Running test suite: ${name}`);
    fn();
  };
  global.test = (name: string, fn: () => void) => {
    console.log(`Running test: ${name}`);
    try {
      fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}:`, error);
    }
  };
  global.expect = (value: any) => ({
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toBeDefined: () => {
      if (value === undefined) {
        throw new Error(`Expected ${value} to be defined`);
      }
    },
    toContain: (expected: any) => {
      if (!value.includes(expected)) {
        throw new Error(`Expected ${value} to contain ${expected}`);
      }
    },
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(value)) {
        throw new Error(`Expected ${value} to match ${pattern}`);
      }
    },
    not: {
      toBe: (expected: any) => {
        if (value === expected) {
          throw new Error(`Expected ${value} not to be ${expected}`);
        }
      }
    }
  });
}
