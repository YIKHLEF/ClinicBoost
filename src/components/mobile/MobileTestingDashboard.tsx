import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  Battery,
  Cpu,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Download,
  RefreshCw,
  Eye,
  Zap,
  Target,
  Gauge,
  Bell,
  Share2,
  Maximize,
  Touch,
} from 'lucide-react';
import {
  mobileTestingFramework,
  type TestResult,
  type TestDevice,
  type TestSuite,
} from '../../lib/mobile/testing-framework';
import { useResponsive } from '../../hooks/useResponsive';
import { pwaFeatures, canInstallApp, showInstallPrompt, shareContent } from '../../lib/mobile/pwa-features';
import { pushNotifications, requestNotificationPermission, showNotification, getNotificationPermissionState } from '../../lib/mobile/push-notifications';
import TouchGestureHandler from './TouchGestureHandler';
import { MobileCard, MobileBottomSheet, MobileActionButton } from './MobileOptimizedComponents';

export const MobileTestingDashboard: React.FC = () => {
  const { addToast } = useToast();
  const responsive = useResponsive();

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Map<string, TestResult[]>>(new Map());
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [testDevices, setTestDevices] = useState<TestDevice[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [showPWASheet, setShowPWASheet] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setTestDevices(mobileTestingFramework.getTestDevices());
    setTestSuites(mobileTestingFramework.getTestSuites());
    setResults(mobileTestingFramework.getResults());

    // Initialize PWA features
    setCanInstall(canInstallApp());
    setNotificationPermission(getNotificationPermissionState().permission);

    // Listen for PWA events
    const handleInstallStatusChange = (event: CustomEvent) => {
      setCanInstall(!event.detail.isInstalled && canInstallApp());
    };

    window.addEventListener('pwa:installation-status-change', handleInstallStatusChange as EventListener);

    return () => {
      window.removeEventListener('pwa:installation-status-change', handleInstallStatusChange as EventListener);
    };
  }, []);

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const testResults = await mobileTestingFramework.runAllTests();
      setResults(testResults);
      addToast({
        type: 'success',
        title: 'Tests Completed',
        message: 'All mobile tests have been completed successfully.',
      });
    } catch (error) {
      console.error('Test execution failed:', error);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: 'Failed to run mobile tests. Please try again.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runTestSuite = async (suiteName: string) => {
    setIsRunning(true);
    try {
      const testResults = await mobileTestingFramework.runTestSuite(suiteName);
      setResults(prev => {
        const newResults = new Map(prev);
        testResults.forEach((deviceResults, deviceName) => {
          const existingResults = newResults.get(deviceName) || [];
          const updatedResults = existingResults.filter(r => 
            !deviceResults.some(dr => dr.test === r.test)
          );
          updatedResults.push(...deviceResults);
          newResults.set(deviceName, updatedResults);
        });
        return newResults;
      });
      addToast({
        type: 'success',
        title: 'Test Suite Completed',
        message: `${suiteName} tests completed successfully.`,
      });
    } catch (error) {
      console.error('Test suite execution failed:', error);
      addToast({
        type: 'error',
        title: 'Test Suite Failed',
        message: `Failed to run ${suiteName} tests.`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName.toLowerCase().includes('iphone') || deviceName.toLowerCase().includes('galaxy')) {
      return <Smartphone size={16} />;
    }
    if (deviceName.toLowerCase().includes('ipad') || deviceName.toLowerCase().includes('tab')) {
      return <Tablet size={16} />;
    }
    return <Monitor size={16} />;
  };

  const getTestStatusIcon = (result: TestResult) => {
    if (result.passed) {
      return <CheckCircle className="text-green-600" size={16} />;
    }
    if (result.score >= 50) {
      return <AlertTriangle className="text-yellow-600" size={16} />;
    }
    return <XCircle className="text-red-600" size={16} />;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    if (score >= 50) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const exportResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      currentDevice: {
        type: responsive.deviceInfo.type,
        viewport: responsive.viewport,
        network: responsive.network,
        performance: responsive.performance,
      },
      testResults: Object.fromEntries(results),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Mobile Test Results',
      text: `Mobile testing completed with ${overallStats.passed}/${overallStats.total} tests passed`,
      url: window.location.href,
    };

    const shared = await shareContent(shareData);
    if (shared) {
      addToast({
        type: 'success',
        title: 'Shared Successfully',
        message: 'Test results shared!',
      });
    }
  };

  const handleInstallApp = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      setCanInstall(false);
      addToast({
        type: 'success',
        title: 'App Installed',
        message: 'ClinicBoost has been installed successfully!',
      });
    }
  };

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      showNotification({
        title: 'Notifications Enabled',
        body: 'You will now receive test completion notifications!',
        icon: '/icons/notification-icon.png',
      });

      addToast({
        type: 'success',
        title: 'Notifications Enabled',
        message: 'Push notifications are now active!',
      });
    }
  };

  const testTouchGestures = () => {
    addToast({
      type: 'info',
      title: 'Touch Gesture Test',
      message: 'Try swiping, pinching, or long-pressing on the test cards below!',
    });
  };

  const filteredResults = selectedDevice 
    ? new Map([[selectedDevice, results.get(selectedDevice) || []]])
    : results;

  const overallStats = Array.from(results.values()).flat().reduce(
    (acc, result) => {
      acc.total++;
      if (result.passed) acc.passed++;
      acc.totalScore += result.score;
      return acc;
    },
    { total: 0, passed: 0, totalScore: 0 }
  );

  const averageScore = overallStats.total > 0 ? overallStats.totalScore / overallStats.total : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mobile Testing Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive mobile responsiveness and performance testing
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center"
          >
            {isRunning ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <Play size={16} className="mr-2" />
            )}
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          {results.size > 0 && (
            <>
              <Button variant="outline" onClick={exportResults}>
                <Download size={16} className="mr-2" />
                Export Results
              </Button>

              <Button variant="outline" onClick={handleShare}>
                <Share2 size={16} className="mr-2" />
                Share
              </Button>
            </>
          )}

          <Button variant="outline" onClick={() => setShowPWASheet(true)}>
            <Smartphone size={16} className="mr-2" />
            PWA Features
          </Button>
        </div>
      </div>

      {/* Current Device Info */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Current Device Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            {getDeviceIcon(responsive.deviceInfo.type)}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Device Type</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {responsive.deviceInfo.type}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Eye size={16} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Viewport</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {responsive.viewport.width} × {responsive.viewport.height}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Wifi size={16} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Network</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {responsive.network.effectiveType.toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Cpu size={16} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Performance</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {responsive.performance.isLowEndDevice ? 'Low-end' : 'High-end'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Test Overview */}
      {results.size > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overallStats.total}
                </p>
              </div>
              <Target className="text-blue-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Passed</p>
                <p className="text-2xl font-bold text-green-600">
                  {overallStats.passed}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {overallStats.total - overallStats.passed}
                </p>
              </div>
              <XCircle className="text-red-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(averageScore)}%
                </p>
              </div>
              <Gauge className="text-purple-600" size={24} />
            </div>
          </Card>
        </div>
      )}

      {/* Test Suites */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Test Suites
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {testSuites.map((suite) => (
            <div
              key={suite.name}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {suite.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {suite.description}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runTestSuite(suite.name)}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <RefreshCw size={14} className="mr-2 animate-spin" />
                ) : (
                  <Play size={14} className="mr-2" />
                )}
                Run Suite
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      {results.size > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Device
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Devices</option>
                {testDevices.map((device) => (
                  <option key={device.name} value={device.name}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Test Results */}
      {filteredResults.size > 0 && (
        <div className="space-y-6">
          {Array.from(filteredResults.entries()).map(([deviceName, deviceResults]) => (
            <Card key={deviceName}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getDeviceIcon(deviceName)}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {deviceName}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {deviceResults.filter(r => r.passed).length} / {deviceResults.length} passed
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {deviceResults.map((result, index) => (
                    <div
                      key={`${result.test}-${index}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getTestStatusIcon(result)}
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {result.test}
                          </h4>
                        </div>
                        
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(result.score)}`}>
                          {Math.round(result.score)}%
                        </span>
                      </div>

                      {result.issues.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Issues Found:
                          </h5>
                          {result.issues.map((issue, issueIndex) => (
                            <div
                              key={issueIndex}
                              className="flex items-start space-x-2 text-sm"
                            >
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <div className="flex-1">
                                <p className="text-gray-900 dark:text-white">{issue.message}</p>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  {issue.suggestion}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.recommendations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Recommendations:
                          </h5>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {result.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="flex items-start">
                                <span className="mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Touch Gesture Testing */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Touch Gesture Testing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TouchGestureHandler
            config={{
              enableSwipe: true,
              enablePinch: true,
              enableLongPress: true,
              enableDoubleTap: true,
            }}
            callbacks={{
              onSwipeLeft: () => addToast({ type: 'info', title: 'Gesture', message: 'Swiped Left!' }),
              onSwipeRight: () => addToast({ type: 'info', title: 'Gesture', message: 'Swiped Right!' }),
              onSwipeUp: () => addToast({ type: 'info', title: 'Gesture', message: 'Swiped Up!' }),
              onSwipeDown: () => addToast({ type: 'info', title: 'Gesture', message: 'Swiped Down!' }),
              onLongPress: () => addToast({ type: 'info', title: 'Gesture', message: 'Long Press!' }),
              onDoubleTap: () => addToast({ type: 'info', title: 'Gesture', message: 'Double Tap!' }),
              onPinchIn: () => addToast({ type: 'info', title: 'Gesture', message: 'Pinch In!' }),
              onPinchOut: () => addToast({ type: 'info', title: 'Gesture', message: 'Pinch Out!' }),
            }}
          >
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800">
              <Touch className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Touch Gesture Test Area
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try swiping, pinching, long-pressing, or double-tapping this area
              </p>
            </div>
          </TouchGestureHandler>

          <div className="space-y-4">
            <Button onClick={testTouchGestures} className="w-full">
              <Touch size={16} className="mr-2" />
              Test Touch Gestures
            </Button>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <h4 className="font-medium mb-2">Supported Gestures:</h4>
              <ul className="space-y-1">
                <li>• Swipe (left, right, up, down)</li>
                <li>• Pinch to zoom (in/out)</li>
                <li>• Long press (500ms)</li>
                <li>• Double tap (300ms)</li>
                <li>• Pan and drag</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {results.size === 0 && !isRunning && (
        <Card className="p-12 text-center">
          <Smartphone className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Test Results
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Run mobile tests to see responsiveness and performance results across different devices.
          </p>
          <Button onClick={runAllTests}>
            <Play size={16} className="mr-2" />
            Run All Tests
          </Button>
        </Card>
      )}

      {/* PWA Features Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showPWASheet}
        onClose={() => setShowPWASheet(false)}
        title="PWA Features Testing"
        height="half"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Download className="w-6 h-6 text-blue-600" />
              <div>
                <div className="font-medium">App Installation</div>
                <div className="text-sm text-gray-500">Install as PWA</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleInstallApp}
              disabled={!canInstall}
            >
              {canInstall ? 'Install' : 'Installed'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-orange-600" />
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-gray-500">Enable notifications</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleRequestNotifications}
              disabled={notificationPermission === 'granted'}
            >
              {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Share2 className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-medium">Web Share API</div>
                <div className="text-sm text-gray-500">Test sharing</div>
              </div>
            </div>
            <Button size="sm" onClick={handleShare}>
              Test Share
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Maximize className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-medium">Fullscreen Mode</div>
                <div className="text-sm text-gray-500">Toggle fullscreen</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                } else {
                  await document.documentElement.requestFullscreen();
                }
              }}
            >
              Toggle
            </Button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Mobile Action Button for quick actions */}
      <MobileActionButton
        onClick={() => setShowPWASheet(true)}
        icon={<Zap className="w-6 h-6" />}
        position="bottom-right"
      />
    </div>
  );
};
