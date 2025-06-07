/**
 * EHR/PMS Integration Page
 * 
 * Main page component for EHR/PMS integration management.
 * Provides comprehensive interface for managing healthcare system integrations,
 * FHIR R4 compliance, and data synchronization.
 */

import React from 'react';
import EHRIntegration from '../components/integrations/EHRIntegration';

const EHRIntegrationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EHRIntegration />
      </div>
    </div>
  );
};

export default EHRIntegrationPage;
