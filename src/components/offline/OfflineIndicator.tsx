import React from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';
import { cn } from '../../lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className,
  showDetails = false 
}) => {
  const { 
    isOnline, 
    isOffline, 
    isSyncing, 
    pendingOperations, 
    lastSyncTime,
    networkStatus 
  } = useOffline();

  const getStatusColor = () => {
    if (isOffline) return 'text-red-500 bg-red-50 border-red-200';
    if (isSyncing) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    if (pendingOperations > 0) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (isOffline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (pendingOperations > 0) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isOffline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingOperations > 0) return `${pendingOperations} pending`;
    return 'Online';
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = Date.now();
    const diff = now - lastSyncTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      
      {showDetails && (
        <div className="ml-2 text-xs opacity-75">
          {isOnline && (
            <>
              <span>Last sync: {formatLastSync()}</span>
              {networkStatus.isSlowConnection && (
                <span className="ml-2 text-yellow-600">(Slow)</span>
              )}
            </>
          )}
          {isOffline && (
            <span>Working offline</span>
          )}
        </div>
      )}
    </div>
  );
};

interface SyncStatusProps {
  className?: string;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ className }) => {
  const { 
    isSyncing, 
    pendingOperations, 
    syncErrors, 
    triggerSync,
    isOnline 
  } = useOffline();

  if (!isOnline && pendingOperations === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg',
      className
    )}>
      <div className="flex-1">
        {isSyncing ? (
          <div className="flex items-center gap-2 text-blue-700">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Syncing data...</span>
          </div>
        ) : pendingOperations > 0 ? (
          <div className="text-blue-700">
            <div className="text-sm font-medium">
              {pendingOperations} change{pendingOperations !== 1 ? 's' : ''} pending sync
            </div>
            {syncErrors.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {syncErrors.length} error{syncErrors.length !== 1 ? 's' : ''} occurred
              </div>
            )}
          </div>
        ) : null}
      </div>
      
      {!isSyncing && isOnline && pendingOperations > 0 && (
        <button
          onClick={triggerSync}
          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};

interface OfflineBannerProps {
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ className }) => {
  const { isOffline, pendingOperations } = useOffline();

  if (!isOffline) return null;

  return (
    <div className={cn(
      'flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm font-medium',
      className
    )}>
      <WifiOff className="h-4 w-4" />
      <span>
        You're working offline. 
        {pendingOperations > 0 && (
          <> {pendingOperations} change{pendingOperations !== 1 ? 's' : ''} will sync when connection is restored.</>
        )}
      </span>
    </div>
  );
};

export default OfflineIndicator;
