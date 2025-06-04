import React from 'react';

export const EnvTest: React.FC = () => {
  const envVars = {
    VITE_DEMO_MODE: import.meta.env.VITE_DEMO_MODE,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***configured***' : 'not set',
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Environment Variables Test</h2>
      
      <div className="space-y-2">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="font-mono text-sm">{key}:</span>
            <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
              {String(value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Demo Mode Status:</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {import.meta.env.VITE_DEMO_MODE === 'true' 
            ? '✅ Demo mode is ENABLED - Demo credentials should work'
            : '❌ Demo mode is DISABLED - Supabase authentication will be used'
          }
        </p>
      </div>

      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded">
        <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Quick Fix:</h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          If demo credentials aren't working, make sure <code className="bg-green-200 dark:bg-green-800 px-1 rounded">VITE_DEMO_MODE=true</code> is set in your .env.local file.
        </p>
      </div>
    </div>
  );
};
