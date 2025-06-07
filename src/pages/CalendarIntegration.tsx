/**
 * Calendar Integration Page
 * 
 * Main page component for calendar integration management.
 * Provides comprehensive interface for managing calendar providers,
 * synchronization settings, and monitoring sync status.
 */

import React from 'react';
import CalendarIntegration from '../components/integrations/CalendarIntegration';

const CalendarIntegrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CalendarIntegration />
      </div>
    </div>
  );
};

export default CalendarIntegrationPage;
