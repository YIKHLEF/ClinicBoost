import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login, isDemoMode, demoCredentials } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('auth.loginError', 'Invalid email or password'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Demo credentials: prefill for ease of use
  const fillDemoCredentials = (role: 'admin' | 'dentist' | 'staff' | 'billing') => {
    const credentials = demoCredentials[role];
    setEmail(credentials.email);
    setPassword(credentials.password);
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('auth.login')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('auth.loginSubtitle', 'Welcome back to ClinicBoost')}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              {t('auth.rememberMe')}
            </label>
          </div>
          
          <div className="text-sm">
            <a href="#" className="text-primary-500 hover:text-primary-600">
              {t('auth.forgotPassword')}
            </a>
          </div>
        </div>
        
        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('auth.login')}
          </Button>
        </div>
        
        {isDemoMode && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              🎯 Demo Credentials - Click to use:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(demoCredentials).map(([key, cred]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => fillDemoCredentials(key as any)}
                  className="p-2 text-left bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <div className="font-medium text-blue-900 dark:text-blue-100">{cred.role}</div>
                  <div className="text-blue-600 dark:text-blue-300 truncate">{cred.email}</div>
                  <div className="text-blue-500 dark:text-blue-400">Password: {cred.password}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
              💡 This is demo mode. All data is simulated for testing purposes.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;