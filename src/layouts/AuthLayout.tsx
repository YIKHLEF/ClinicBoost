import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import { Bluetooth as Tooth } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  
  // If the user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/\" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header with language and theme toggles */}
      <header className="w-full flex justify-end items-center p-4">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Decorative sidebar with image and pattern */}
        <div className="hidden md:block md:w-1/2 bg-primary-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-moroccan-pattern bg-repeat"></div>
          <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
            <div className="mb-8">
              <Tooth size={64} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('common.appName')}</h1>
            <p className="text-xl text-center max-w-md">
              {t('auth.loginDescription', 'AI-powered dental practice management for Moroccan clinics')}
            </p>
          </div>
        </div>
        
        {/* Auth content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="md:hidden flex items-center justify-center mb-8">
            <Tooth size={48} className="text-primary-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('common.appName')}</h1>
          </div>
          
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; 2025 {t('common.appName')} - {t('common.allRightsReserved', 'All rights reserved')}
      </footer>
    </div>
  );
};

export default AuthLayout;