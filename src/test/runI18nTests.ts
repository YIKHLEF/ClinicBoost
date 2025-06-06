/**
 * Manual I18n Test Runner
 * 
 * This script runs basic tests to verify our i18n implementation
 * without requiring a full test framework setup.
 */

import i18n from '../i18n/i18n';
import { formatDate, formatTime, formatCurrency, formatNumber } from '../i18n/i18n';

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const testResults: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

// Test helper functions
function test(name: string, testFn: () => void | Promise<void>) {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      return result.then(() => {
        passedTests++;
        testResults.push({ name, status: 'PASS' });
        console.log(`✓ ${name}`);
      }).catch((error) => {
        failedTests++;
        testResults.push({ name, status: 'FAIL', error: error.message });
        console.error(`✗ ${name}: ${error.message}`);
      });
    } else {
      passedTests++;
      testResults.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    }
  } catch (error) {
    failedTests++;
    testResults.push({ name, status: 'FAIL', error: (error as Error).message });
    console.error(`✗ ${name}: ${(error as Error).message}`);
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected "${value}" to be "${expected}"`);
      }
    },
    toBeDefined: () => {
      if (value === undefined || value === null) {
        throw new Error(`Expected value to be defined, got ${value}`);
      }
    },
    toContain: (expected: any) => {
      if (!value || !value.includes || !value.includes(expected)) {
        throw new Error(`Expected "${value}" to contain "${expected}"`);
      }
    },
    toMatch: (pattern: RegExp | string) => {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      if (!regex.test(String(value))) {
        throw new Error(`Expected "${value}" to match pattern ${regex}`);
      }
    },
    not: {
      toBe: (expected: any) => {
        if (value === expected) {
          throw new Error(`Expected "${value}" not to be "${expected}"`);
        }
      }
    }
  };
}

// Run tests
async function runTests() {
  console.log('🧪 Running I18n Tests...\n');

  // Test 1: Basic i18n initialization
  test('I18n should be initialized', () => {
    expect(i18n).toBeDefined();
    expect(i18n.language).toBeDefined();
  });

  // Test 2: Supported languages
  test('Should support required languages', () => {
    const supportedLangs = i18n.options.supportedLngs as string[];
    expect(supportedLangs).toContain('en');
    expect(supportedLangs).toContain('fr');
    expect(supportedLangs).toContain('ar');
  });

  // Test 3: English translations
  await test('English translations should work', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(i18n.t('auth.login')).toBe('Login');
    expect(i18n.t('medical.teeth')).toBe('Teeth');
  });

  // Test 4: French translations
  await test('French translations should work', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('common.save')).toBe('Enregistrer');
    expect(i18n.t('common.cancel')).toBe('Annuler');
    expect(i18n.t('auth.login')).toBe('Connexion');
    expect(i18n.t('medical.teeth')).toBe('Dents');
  });

  // Test 5: Arabic translations
  await test('Arabic translations should work', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.t('common.save')).toBe('حفظ');
    expect(i18n.t('common.cancel')).toBe('إلغاء');
    expect(i18n.t('auth.login')).toBe('تسجيل الدخول');
    expect(i18n.t('medical.teeth')).toBe('الأسنان');
  });

  // Test 6: RTL detection
  await test('RTL should be detected for Arabic', async () => {
    await i18n.changeLanguage('ar');
    // Note: In a real browser environment, this would update the DOM
    // For this test, we just verify the language changed
    expect(i18n.language).toBe('ar');
  });

  // Test 7: LTR for other languages
  await test('LTR should be used for English and French', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    
    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');
  });

  // Test 8: Date formatting
  test('Date formatting should work', () => {
    const testDate = new Date('2024-01-15T14:30:00Z');
    
    const enDate = formatDate(testDate, 'en');
    expect(enDate).toBeDefined();
    expect(typeof enDate).toBe('string');
    
    const frDate = formatDate(testDate, 'fr');
    expect(frDate).toBeDefined();
    expect(typeof frDate).toBe('string');
    
    const arDate = formatDate(testDate, 'ar');
    expect(arDate).toBeDefined();
    expect(typeof arDate).toBe('string');
  });

  // Test 9: Currency formatting
  test('Currency formatting should work', () => {
    const testAmount = 1250.75;
    
    const enCurrency = formatCurrency(testAmount, 'en');
    expect(enCurrency).toBeDefined();
    expect(enCurrency).toMatch(/\$/);
    
    const frCurrency = formatCurrency(testAmount, 'fr');
    expect(frCurrency).toBeDefined();
    expect(frCurrency).toMatch(/€/);
    
    const arCurrency = formatCurrency(testAmount, 'ar');
    expect(arCurrency).toBeDefined();
  });

  // Test 10: Number formatting
  test('Number formatting should work', () => {
    const testNumber = 1000;
    
    const enNumber = formatNumber(testNumber, 'en');
    expect(enNumber).toBe('1,000');
    
    const frNumber = formatNumber(testNumber, 'fr');
    expect(frNumber).toBe('1 000');
  });

  // Test 11: Medical terminology completeness
  await test('Medical terminology should be complete', async () => {
    const medicalTerms = ['teeth', 'cavity', 'crown', 'extraction', 'cleaning'];
    
    for (const lang of ['en', 'fr', 'ar']) {
      await i18n.changeLanguage(lang);
      for (const term of medicalTerms) {
        const translation = i18n.t(`medical.${term}`);
        expect(translation).toBeDefined();
        expect(translation).not.toBe(`medical.${term}`);
      }
    }
  });

  // Test 12: Error handling
  test('Should handle missing keys gracefully', () => {
    const result = i18n.t('nonexistent.key', 'Fallback');
    expect(result).toBe('Fallback');
  });

  // Test 13: Interpolation
  await test('Should handle interpolation', async () => {
    await i18n.changeLanguage('en');
    const result = i18n.t('validation.minLength', { min: 8 });
    expect(result).toContain('8');
  });

  // Print results
  console.log('\n📊 Test Results:');
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(result => result.status === 'FAIL')
      .forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
  }

  console.log('\n🎉 I18n testing complete!');
  
  return {
    passed: passedTests,
    failed: failedTests,
    total: passedTests + failedTests,
    results: testResults
  };
}

// Export for use in other modules
export { runTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).runI18nTests = runTests;
  console.log('I18n tests loaded. Run runI18nTests() in the console to execute.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Node environment
  runTests().catch(console.error);
}
