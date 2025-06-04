import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { demoAuth, DEMO_CREDENTIALS } from '../../lib/demo-auth';

export const AuthTest: React.FC = () => {
  const { login, logout, user, isDemoMode, loading } = useAuth();
  const [testEmail, setTestEmail] = useState('admin@clinicboost.demo');
  const [testPassword, setTestPassword] = useState('demo123');
  const [testResult, setTestResult] = useState<string>('');

  const testDemoAuth = async () => {
    try {
      setTestResult('Testing demo authentication...');
      
      // Test direct demo auth
      const demoUser = await demoAuth.login(testEmail, testPassword);
      setTestResult(`✅ Direct demo auth successful: ${demoUser.firstName} ${demoUser.lastName} (${demoUser.role})`);
      
      // Test logout
      await demoAuth.logout();
      setTestResult(prev => prev + '\n✅ Demo logout successful');
      
    } catch (error: any) {
      setTestResult(`❌ Demo auth failed: ${error.message}`);
    }
  };

  const testContextAuth = async () => {
    try {
      setTestResult('Testing context authentication...');
      await login(testEmail, testPassword);
      setTestResult('✅ Context auth successful');
    } catch (error: any) {
      setTestResult(`❌ Context auth failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setTestResult('✅ Logout successful');
    } catch (error: any) {
      setTestResult(`❌ Logout failed: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Authentication Test</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Demo Mode:</strong> {isDemoMode ? '✅ Active' : '❌ Inactive'}
          </div>
          <div>
            <strong>Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}
          </div>
          <div>
            <strong>User:</strong> {user ? `${(user as any).firstName || user.email}` : '❌ None'}
          </div>
          <div>
            <strong>Environment:</strong> {import.meta.env.VITE_DEMO_MODE}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Test Credentials:</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="input text-sm"
              placeholder="Email"
            />
            <input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              className="input text-sm"
              placeholder="Password"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={testDemoAuth}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Test Direct Demo Auth
          </button>
          <button
            onClick={testContextAuth}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Test Context Auth
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Logout
            </button>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Available Demo Credentials:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
              <button
                key={key}
                onClick={() => {
                  setTestEmail(cred.email);
                  setTestPassword(cred.password);
                }}
                className="p-2 text-left bg-gray-100 dark:bg-gray-700 rounded border hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <div className="font-medium">{cred.role}</div>
                <div className="text-gray-600 dark:text-gray-400">{cred.email}</div>
                <div className="text-gray-500 dark:text-gray-500">Password: {cred.password}</div>
              </button>
            ))}
          </div>
        </div>

        {testResult && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Test Result:</h3>
            <pre className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded whitespace-pre-wrap">
              {testResult}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
