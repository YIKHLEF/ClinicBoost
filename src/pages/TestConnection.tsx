import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { runAllTests, testUserRegistration, testUserLogin } from '../utils/testSupabaseConnection';

const TestConnection: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Capture console logs
  const originalLog = console.log;
  const originalError = console.error;

  const captureConsole = () => {
    console.log = (...args) => {
      setLogs(prev => [...prev, args.join(' ')]);
      originalLog(...args);
    };
    console.error = (...args) => {
      setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
      originalError(...args);
    };
  };

  const restoreConsole = () => {
    console.log = originalLog;
    console.error = originalError;
  };

  const runTests = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);
    
    captureConsole();
    
    try {
      const testResults = await runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  const testRegistration = async () => {
    setIsRunning(true);
    captureConsole();
    
    try {
      await testUserRegistration(
        'test@clinicboost.com',
        'TestPassword123!',
        {
          first_name: 'Test',
          last_name: 'User',
          role: 'staff'
        }
      );
    } catch (error) {
      console.error('Registration test failed:', error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  const testLogin = async () => {
    setIsRunning(true);
    captureConsole();
    
    try {
      await testUserLogin('test@clinicboost.com', 'TestPassword123!');
    } catch (error) {
      console.error('Login test failed:', error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🔧 Supabase Connection Test
          </h1>
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Use this page to test your Supabase connection and verify that everything is working correctly.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Before running tests:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Make sure you've updated the .env.local file with your Supabase credentials</li>
                <li>• Ensure you've run the database schema in your Supabase SQL editor</li>
                <li>• Check that RLS policies have been applied</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              loading={isRunning}
            >
              Run All Tests
            </Button>
            
            <Button 
              onClick={testRegistration} 
              disabled={isRunning}
              variant="outline"
            >
              Test Registration
            </Button>
            
            <Button 
              onClick={testLogin} 
              disabled={isRunning}
              variant="outline"
            >
              Test Login
            </Button>
          </div>

          {results && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                📊 Test Results Summary:
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className={results.connection ? 'text-green-600' : 'text-red-600'}>
                    {results.connection ? '✅' : '❌'}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Database Connection
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={results.patientCreation ? 'text-green-600' : 'text-red-600'}>
                    {results.patientCreation ? '✅' : '❌'}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Patient Creation
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  Object.values(results).every(r => r)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {Object.values(results).every(r => r) ? '🎉 All Tests Passed' : '⚠️ Some Tests Failed'}
                </span>
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <h3 className="text-white mb-2">Console Output:</h3>
              {logs.map((log, index) => (
                <div key={index} className={log.startsWith('ERROR:') ? 'text-red-400' : 'text-green-400'}>
                  {log}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              🔍 Troubleshooting Tips:
            </h3>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• If connection fails: Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
              <li>• If tables are not accessible: Make sure you ran the database schema</li>
              <li>• If RLS errors occur: Verify that RLS policies were applied correctly</li>
              <li>• Check the browser console for additional error details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection;
