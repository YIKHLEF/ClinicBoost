import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-500">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          {t('common.pageNotFound', "Page Not Found")}
        </h2>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          {t('common.pageNotFoundDesc', "Sorry, we couldn't find the page you're looking for.")}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="inline-flex items-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            {t('common.goBack', "Go Back")}
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="inline-flex items-center"
          >
            <Home size={16} className="mr-2" />
            {t('common.goHome', "Go to Home")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;