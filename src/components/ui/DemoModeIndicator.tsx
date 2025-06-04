import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TestTube, Info } from 'lucide-react';

export const DemoModeIndicator: React.FC = () => {
  const { isDemoMode, user } = useAuth();

  if (!isDemoMode) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 text-sm">
        <TestTube size={16} />
        <span className="font-medium">Demo Mode</span>
        {user && (
          <span className="text-blue-100">
            | {(user as any).firstName} {(user as any).lastName} ({(user as any).role})
          </span>
        )}
        <div className="group relative">
          <Info size={14} className="cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="font-medium mb-1">Demo Mode Active</p>
            <p>You're using simulated data for testing. All actions are safe and won't affect real data.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
