/**
 * Demo Mode Test Panel Component
 * 
 * Interactive UI for testing demo mode functionality
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_CREDENTIALS, demoAuth } from '../../lib/demo-auth';
import DemoModeTester, { type DemoTestSuite, type DemoTestResult } from '../../test/demo/demo-mode-tester';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Shield,
  Database,
  Monitor,
  Zap,
  AlertTriangle,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

interface DemoModeTestPanelProps {
  className?: string;
}

const DemoModeTestPanel: React.FC<DemoModeTestPanelProps> = ({ className = '' }) => {
  const { user, isDemoMode, login, logout } = useAuth();
  const [testResults, setTestResults] = useState<DemoTestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState('admin');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState<string>('');

  // Demo mode status
  const demoModeStatus = {
    enabled: isDemoMode,
    envVar: import.meta.env.VITE_DEMO_MODE === 'true',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    autoDetected: !import.meta.env.VITE_SUPABASE_URL || 
                  import.meta.env.VITE_SUPABASE_URL === 'https://demo.supabase.co'
  };

  /**
   * Run comprehensive demo tests
   */
  const runDemoTests = async () => {
    setIsRunning(true);
    setTestProgress('Initializing demo tests...');
    
    try {
      const tester = new DemoModeTester();
      
      // Add progress tracking
      setTestProgress('Running authentication tests...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setTestProgress('Running data persistence tests...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setTestProgress('Running role-based access tests...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setTestProgress('Running UI tests...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setTestProgress('Running performance tests...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setTestProgress('Finalizing tests...');
      const results = await tester.runAllTests();
      
      setTestResults(results);
      setTestProgress('Tests completed!');
      
      // Cleanup
      await tester.cleanup();
      
    } catch (error) {
      console.error('Demo tests failed:', error);
      setTestProgress(`Tests failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Quick login test with selected credentials
   */
  const testQuickLogin = async () => {
    try {
      const credentials = DEMO_CREDENTIALS[selectedCredential as keyof typeof DEMO_CREDENTIALS];
      await login(credentials.email, credentials.password);
    } catch (error) {
      console.error('Quick login failed:', error);
    }
  };

  /**
   * Test logout functionality
   */
  const testLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout test failed:', error);
    }
  };

  /**
   * Export test results
   */
  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      demoModeStatus,
      testResults,
      summary: {
        totalSuites: testResults.length,
        passedSuites: testResults.filter(s => s.passed).length,
        totalTests: testResults.reduce((sum, s) => sum + s.totalTests, 0),
        passedTests: testResults.reduce((sum, s) => sum + s.passedTests, 0)
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-test-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Get status icon for test result
   */
  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  /**
   * Get suite icon based on suite name
   */
  const getSuiteIcon = (suiteName: string) => {
    if (suiteName.includes('Authentication')) return <Shield className="w-5 h-5" />;
    if (suiteName.includes('Data')) return <Database className="w-5 h-5" />;
    if (suiteName.includes('Role')) return <User className="w-5 h-5" />;
    if (suiteName.includes('Interface')) return <Monitor className="w-5 h-5" />;
    if (suiteName.includes('Performance')) return <Zap className="w-5 h-5" />;
    if (suiteName.includes('Error')) return <AlertTriangle className="w-5 h-5" />;
    return <Settings className="w-5 h-5" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-6 h-6 text-blue-500" />
            Demo Mode Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Demo Mode:</span>
              <Badge variant={demoModeStatus.enabled ? 'default' : 'destructive'}>
                {demoModeStatus.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Environment:</span>
              <Badge variant={demoModeStatus.envVar ? 'default' : 'secondary'}>
                {demoModeStatus.envVar ? 'Explicit' : 'Auto-detected'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current User:</span>
              <Badge variant={user ? 'default' : 'outline'}>
                {user ? `${user.email} (${user.role || 'unknown'})` : 'Not logged in'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Supabase URL:</span>
              <Badge variant="outline" className="text-xs">
                {demoModeStatus.supabaseUrl || 'Not set'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedCredential}
                onChange={(e) => setSelectedCredential(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
                  <option key={key} value={key}>
                    {cred.role} ({cred.email})
                  </option>
                ))}
              </select>
              <Button onClick={testQuickLogin} size="sm" disabled={isRunning}>
                Quick Login
              </Button>
            </div>
            
            <Button onClick={testLogout} size="sm" variant="outline" disabled={!user || isRunning}>
              Test Logout
            </Button>
            
            <Button onClick={runDemoTests} disabled={isRunning} className="flex items-center gap-2">
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>

            {testResults.length > 0 && (
              <Button onClick={exportResults} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>

          {isRunning && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-300">{testProgress}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {testResults.filter(s => s.passed).length}/{testResults.length} Suites Passed
                </Badge>
                <Badge variant="outline">
                  {testResults.reduce((sum, s) => sum + s.passedTests, 0)}/
                  {testResults.reduce((sum, s) => sum + s.totalTests, 0)} Tests Passed
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((suite, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setShowDetails(showDetails === suite.suiteName ? null : suite.suiteName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSuiteIcon(suite.suiteName)}
                        <span className="font-medium">{suite.suiteName}</span>
                        {getStatusIcon(suite.passed)}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {suite.passedTests}/{suite.totalTests} tests
                        </span>
                        <span className="text-sm text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {suite.duration.toFixed(2)}ms
                        </span>
                        {showDetails === suite.suiteName ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {showDetails === suite.suiteName && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="space-y-2">
                        {suite.results.map((test, testIndex) => (
                          <div key={testIndex} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(test.passed)}
                              <span className="text-sm">{test.testName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {test.duration.toFixed(2)}ms
                              </span>
                              {!test.passed && (
                                <Badge variant="destructive" className="text-xs">
                                  {test.message}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Credentials Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Credentials Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
              <div key={key} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{cred.role}</span>
                  <Badge variant="outline">{key}</Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Email: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{cred.email}</code></div>
                  <div>Password: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{cred.password}</code></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoModeTestPanel;
