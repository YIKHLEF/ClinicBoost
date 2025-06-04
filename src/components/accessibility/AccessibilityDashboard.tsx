import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Eye,
  Keyboard,
  Palette,
  Focus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Play,
  Download,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
} from 'lucide-react';
import {
  accessibilityTester,
  runAccessibilityAudit,
  type AuditResult,
  type AccessibilityIssue,
  AccessibilityCategory,
} from '../../lib/accessibility/testing-core';
import { colorContrastManager, getVisualPreferences } from '../../lib/accessibility/color-contrast';
import { focusManager } from '../../lib/accessibility/focus-management';
import { keyboardNavigation } from '../../lib/accessibility/keyboard-navigation';

export const AccessibilityDashboard: React.FC = () => {
  const { addToast } = useToast();
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AccessibilityCategory | 'all'>('all');
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [auditLevel, setAuditLevel] = useState<'A' | 'AA' | 'AAA'>('AA');
  const [visualPreferences, setVisualPreferences] = useState(getVisualPreferences());

  // Load latest audit result on mount
  useEffect(() => {
    const history = accessibilityTester.getAuditHistory();
    if (history.length > 0) {
      setAuditResult(history[history.length - 1]);
    }
  }, []);

  // Run accessibility audit
  const handleRunAudit = useCallback(async () => {
    try {
      setIsRunningAudit(true);
      
      const result = await runAccessibilityAudit(document.body, auditLevel);
      setAuditResult(result);
      
      addToast({
        type: result.passed ? 'success' : 'warning',
        title: 'Accessibility Audit Complete',
        message: `Score: ${result.overallScore.toFixed(1)}% - ${result.issues.length} issues found`,
      });
    } catch (error) {
      console.error('Audit failed:', error);
      addToast({
        type: 'error',
        title: 'Audit Failed',
        message: 'Failed to run accessibility audit. Please try again.',
      });
    } finally {
      setIsRunningAudit(false);
    }
  }, [auditLevel, addToast]);

  // Export audit results
  const handleExportResults = useCallback(() => {
    if (!auditResult) return;

    const exportData = {
      ...auditResult,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [auditResult]);

  // Filter issues by category
  const filteredIssues = auditResult?.issues.filter(issue => {
    if (selectedCategory === 'all') return true;
    
    // Find the test that generated this issue
    const categoryTests = accessibilityTester.getTestsByCategory(selectedCategory);
    return categoryTests.some(test => issue.wcagCriterion === test.wcagCriterion);
  }) || [];

  // Get severity icon
  const getSeverityIcon = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="text-red-600" size={16} />;
      case 'serious':
        return <AlertTriangle className="text-orange-600" size={16} />;
      case 'moderate':
        return <AlertTriangle className="text-yellow-600" size={16} />;
      case 'minor':
        return <Info className="text-blue-600" size={16} />;
      default:
        return <Info className="text-gray-600" size={16} />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: AccessibilityIssue['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'serious':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'minor':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: AccessibilityCategory) => {
    switch (category) {
      case AccessibilityCategory.PERCEIVABLE:
        return <Eye size={20} />;
      case AccessibilityCategory.OPERABLE:
        return <Keyboard size={20} />;
      case AccessibilityCategory.UNDERSTANDABLE:
        return <Users size={20} />;
      case AccessibilityCategory.ROBUST:
        return <Shield size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Accessibility Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            WCAG 2.1 compliance testing and accessibility monitoring
          </p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={auditLevel}
            onChange={(e) => setAuditLevel(e.target.value as 'A' | 'AA' | 'AAA')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
          >
            <option value="A">WCAG A</option>
            <option value="AA">WCAG AA</option>
            <option value="AAA">WCAG AAA</option>
          </select>
          
          <Button
            onClick={handleRunAudit}
            disabled={isRunningAudit}
            className="flex items-center"
          >
            <Play size={16} className="mr-2" />
            {isRunningAudit ? 'Running Audit...' : 'Run Audit'}
          </Button>
          
          {auditResult && (
            <Button variant="outline" onClick={handleExportResults}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Audit Results Summary */}
      {auditResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auditResult.overallScore.toFixed(1)}%
                </p>
                <p className={`text-sm ${auditResult.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {auditResult.passed ? 'Passed' : 'Failed'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${auditResult.passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {auditResult.passed ? (
                  <CheckCircle className="text-green-600" size={24} />
                ) : (
                  <XCircle className="text-red-600" size={24} />
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auditResult.summary.critical}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <XCircle className="text-red-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auditResult.issues.length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <AlertTriangle className="text-orange-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tests Passed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {auditResult.passedTests}/{auditResult.totalTests}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <BarChart3 className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Results */}
      {auditResult && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              WCAG Categories
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(auditResult.categories).map(([category, result]) => (
                <div
                  key={category}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCategory === category
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedCategory(category as AccessibilityCategory)}
                >
                  <div className="flex items-center space-x-3">
                    {getCategoryIcon(category as AccessibilityCategory)}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                        {category}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {result.score.toFixed(1)}% - {result.issues.length} issues
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Issues List */}
      {auditResult && (
        <Card>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Accessibility Issues ({filteredIssues.length})
              </h2>
              
              <div className="flex items-center space-x-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as AccessibilityCategory | 'all')}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="all">All Categories</option>
                  <option value={AccessibilityCategory.PERCEIVABLE}>Perceivable</option>
                  <option value={AccessibilityCategory.OPERABLE}>Operable</option>
                  <option value={AccessibilityCategory.UNDERSTANDABLE}>Understandable</option>
                  <option value={AccessibilityCategory.ROBUST}>Robust</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No issues found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedCategory === 'all' 
                    ? 'Great! No accessibility issues detected.'
                    : `No issues found in the ${selectedCategory} category.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map((issue, index) => (
                  <div
                    key={`${issue.id}-${index}`}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(issue.severity)}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {issue.message}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            WCAG {issue.wcagCriterion} - {issue.howToFix}
                          </p>
                          
                          {issue.selector && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                              {issue.selector}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Issue Details
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedIssue(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Issue
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedIssue.message}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Severity
                  </h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSeverityColor(selectedIssue.severity)}`}>
                    {selectedIssue.severity}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    WCAG Criterion
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedIssue.wcagCriterion}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    How to Fix
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedIssue.howToFix}
                  </p>
                </div>

                {selectedIssue.selector && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Element Selector
                    </h3>
                    <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {selectedIssue.selector}
                    </code>
                  </div>
                )}

                {selectedIssue.helpUrl && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Learn More
                    </h3>
                    <a
                      href={selectedIssue.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      WCAG Guidelines
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Accessibility Tools
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
              onClick={() => {
                // Toggle high contrast mode
                const prefs = getVisualPreferences();
                colorContrastManager.updatePreferences({
                  highContrast: !prefs.highContrast
                });
                setVisualPreferences(getVisualPreferences());
              }}
            >
              <Palette size={20} />
              <span className="text-sm">Toggle High Contrast</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
              onClick={() => {
                // Show focus indicators
                document.body.classList.add('keyboard-navigation');
              }}
            >
              <Focus size={20} />
              <span className="text-sm">Show Focus Indicators</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
              onClick={() => {
                // Test keyboard navigation
                const firstFocusable = document.querySelector('a, button, input, select, textarea, [tabindex]') as HTMLElement;
                if (firstFocusable) {
                  firstFocusable.focus();
                }
              }}
            >
              <Keyboard size={20} />
              <span className="text-sm">Test Keyboard Nav</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center justify-center h-20 flex-col space-y-2"
              onClick={() => {
                // Toggle reduced motion
                const prefs = getVisualPreferences();
                colorContrastManager.updatePreferences({
                  reducedMotion: !prefs.reducedMotion
                });
                setVisualPreferences(getVisualPreferences());
              }}
            >
              <Settings size={20} />
              <span className="text-sm">Toggle Reduced Motion</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
