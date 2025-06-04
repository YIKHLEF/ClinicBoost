import React from 'react';
import { secureConfig } from '../../lib/config/secure-config';
import { useResponsive } from '../../hooks/useResponsive';
import { logger } from '../../lib/logging-monitoring';

export const ConfigTest: React.FC = () => {
  const responsive = useResponsive();
  
  const testConfig = () => {
    try {
      const config = secureConfig.getConfig();
      console.log('✅ Config loaded successfully:', config);
      
      const appConfig = secureConfig.getAppConfig();
      console.log('✅ App config:', appConfig);
      
      const isDev = secureConfig.isDevelopment();
      console.log('✅ Is development:', isDev);
      
      return true;
    } catch (error) {
      console.error('❌ Config error:', error);
      return false;
    }
  };

  const testResponsive = () => {
    try {
      console.log('✅ Responsive data:', {
        deviceType: responsive.deviceInfo.type,
        viewport: responsive.viewport,
        network: responsive.network,
        isMobile: responsive.isMobile,
        isTablet: responsive.isTablet,
        isDesktop: responsive.isDesktop,
      });
      return true;
    } catch (error) {
      console.error('❌ Responsive error:', error);
      return false;
    }
  };

  const testLogging = () => {
    try {
      logger.info('Testing logging system', 'config-test');
      logger.debug('Debug message test', 'config-test');
      logger.warn('Warning message test', 'config-test');

      const stats = logger.getStatistics();
      console.log('✅ Logging stats:', stats);
      return true;
    } catch (error) {
      console.error('❌ Logging error:', error);
      return false;
    }
  };

  const configWorking = testConfig();
  const responsiveWorking = testResponsive();
  const loggingWorking = testLogging();

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">System Status Test</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className={configWorking ? 'text-green-600' : 'text-red-600'}>
            {configWorking ? '✅' : '❌'}
          </span>
          <span>Configuration System</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={responsiveWorking ? 'text-green-600' : 'text-red-600'}>
            {responsiveWorking ? '✅' : '❌'}
          </span>
          <span>Responsive System</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className={loggingWorking ? 'text-green-600' : 'text-red-600'}>
            {loggingWorking ? '✅' : '❌'}
          </span>
          <span>Logging & Monitoring System</span>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
          <h3 className="font-medium mb-2">Current Device Info:</h3>
          <ul className="text-sm space-y-1">
            <li>Type: {responsive.deviceInfo.type}</li>
            <li>Viewport: {responsive.viewport.width} × {responsive.viewport.height}</li>
            <li>Breakpoint: {responsive.viewport.breakpoint}</li>
            <li>Network: {responsive.network.effectiveType}</li>
            <li>Touch Device: {responsive.isTouchDevice ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
