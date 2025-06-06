/**
 * I18n Test Component
 * 
 * This component tests the internationalization functionality including:
 * - Translation key usage
 * - Language switching
 * - RTL layout
 * - Date/time/currency formatting
 * - Medical terminology
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import LanguageSwitcher from '../LanguageSwitcher';
import { EmptyState } from '../ui/EmptyState';
import useTranslation from '../../hooks/useTranslation';
import { runTests } from '../../test/runI18nTests';
import { Calendar, User, Heart, DollarSign, Clock, Globe, Play } from 'lucide-react';

const I18nTest: React.FC = () => {
  const { 
    t, 
    tCommon, 
    tMedical, 
    tError, 
    tValidation,
    format,
    isRTL,
    getRTLClass,
    getLanguageClass,
    language,
    changeLanguage
  } = useTranslation();

  const [testDate] = useState(new Date());
  const [testAmount] = useState(1250.75);
  const [testNumber] = useState(42);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const formatResults = format({
    date: testDate,
    time: testDate,
    currency: testAmount,
    number: testNumber
  });

  const medicalTerms = [
    'teeth',
    'cavity',
    'crown',
    'extraction',
    'cleaning',
    'xray',
    'appointment',
    'treatment'
  ];

  const commonTerms = [
    'save',
    'cancel',
    'delete',
    'edit',
    'search',
    'loading',
    'welcome',
    'today'
  ];

  const errorMessages = [
    'required',
    'invalid',
    'networkError',
    'saveError',
    'loadError'
  ];

  const validationMessages = [
    'required',
    'email',
    'phone',
    'minLength',
    'strongPassword'
  ];

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
      setTestResults({ error: 'Test execution failed' });
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${getLanguageClass()} ${isRTL() ? 'rtl' : 'ltr'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className={getRTLClass("flex items-center justify-between")}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('test.i18nTitle', 'Internationalization Test')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('test.i18nDescription', 'Testing translation functionality and RTL support')}
            </p>
          </div>
          <LanguageSwitcher variant="tabs" />
        </div>

        {/* Current Language Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={20} />
              {t('test.currentLanguage', 'Current Language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('test.language', 'Language')}
                </label>
                <p className="text-lg font-semibold">{language}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('test.direction', 'Direction')}
                </label>
                <p className="text-lg font-semibold">{isRTL() ? 'RTL' : 'LTR'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('test.cssClass', 'CSS Class')}
                </label>
                <p className="text-lg font-semibold">{getLanguageClass()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formatting Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              {t('test.formatting', 'Formatting Tests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tCommon('date')}
                </label>
                <p className="text-lg font-semibold">{formatResults.date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tCommon('time')}
                </label>
                <p className="text-lg font-semibold">{formatResults.time}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('test.currency', 'Currency')}
                </label>
                <p className="text-lg font-semibold">{formatResults.currency}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('test.number', 'Number')}
                </label>
                <p className="text-lg font-semibold">{formatResults.number}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Terminology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart size={20} />
              {t('test.medicalTerms', 'Medical Terminology')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {medicalTerms.map((term) => (
                <div key={term} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{term}</p>
                  <p className="font-semibold">{tMedical(term)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Common UI Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              {t('test.commonTerms', 'Common UI Terms')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {commonTerms.map((term) => (
                <div key={term} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{term}</p>
                  <p className="font-semibold">{tCommon(term)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              {t('test.errorMessages', 'Error Messages')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {errorMessages.map((error) => (
                <div key={error} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  <p className="font-semibold text-red-800 dark:text-red-200">{tError(error)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Validation Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              {t('test.validationMessages', 'Validation Messages')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validationMessages.map((validation) => (
                <div key={validation} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">{validation}</p>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {tValidation(validation, { min: 8, max: 50 })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Empty State Test */}
        <Card>
          <CardHeader>
            <CardTitle>{t('test.emptyStateTest', 'Empty State Test')}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              type="patients"
              onAction={() => alert(t('test.actionClicked', 'Action clicked!'))}
            />
          </CardContent>
        </Card>

        {/* Language Switching Test */}
        <Card>
          <CardHeader>
            <CardTitle>{t('test.languageSwitching', 'Language Switching Test')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {t('test.switchLanguageDesc', 'Click the buttons below to test language switching:')}
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => changeLanguage('en')}
                  variant={language === 'en' ? 'default' : 'outline'}
                >
                  English
                </Button>
                <Button
                  onClick={() => changeLanguage('fr')}
                  variant={language === 'fr' ? 'default' : 'outline'}
                >
                  Français
                </Button>
                <Button
                  onClick={() => changeLanguage('ar')}
                  variant={language === 'ar' ? 'default' : 'outline'}
                >
                  العربية
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automated Test Runner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play size={20} />
              {t('test.automatedTests', 'Automated Test Runner')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {t('test.automatedTestsDesc', 'Run comprehensive tests to verify i18n functionality:')}
              </p>

              <Button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="flex items-center gap-2"
              >
                <Play size={16} />
                {isRunningTests ? t('test.runningTests', 'Running Tests...') : t('test.runTests', 'Run Tests')}
              </Button>

              {testResults && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-2">{t('test.testResults', 'Test Results')}</h4>
                  {testResults.error ? (
                    <div className="text-red-600 dark:text-red-400">
                      {t('test.testError', 'Error')}: {testResults.error}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-4">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {t('test.passed', 'Passed')}: {testResults.passed}
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          ✗ {t('test.failed', 'Failed')}: {testResults.failed}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          📈 {t('test.successRate', 'Success Rate')}: {((testResults.passed / testResults.total) * 100).toFixed(1)}%
                        </span>
                      </div>

                      {testResults.failed > 0 && (
                        <div className="mt-3">
                          <h5 className="font-medium text-red-600 dark:text-red-400 mb-1">
                            {t('test.failedTests', 'Failed Tests')}:
                          </h5>
                          <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                            {testResults.results
                              .filter((result: any) => result.status === 'FAIL')
                              .map((result: any, index: number) => (
                                <li key={index}>• {result.name}: {result.error}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default I18nTest;
