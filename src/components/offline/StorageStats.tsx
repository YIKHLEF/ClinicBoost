/**
 * Storage Statistics Component
 * Displays offline storage usage and statistics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { 
  Database, 
  HardDrive, 
  RefreshCw, 
  Trash2, 
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { offlineStorageService } from '../../lib/offline/storage-service';
import { logger } from '../../lib/logging-monitoring';

interface StorageStatsData {
  totalItems: number;
  unsyncedItems: number;
  syncQueueSize: number;
  storageSize: number;
}

interface DetailedStorageStats {
  totalStats: StorageStatsData;
  storeStats: Record<string, {
    itemCount: number;
    storageSize: number;
    unsyncedCount: number;
  }>;
}

export const StorageStats: React.FC = () => {
  const [stats, setStats] = useState<StorageStatsData | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStorageStats | null>(null);
  const [usagePercentage, setUsagePercentage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailed, setShowDetailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [basicStats, detailed, usage] = await Promise.all([
        offlineStorageService.getStorageStats(),
        offlineStorageService.getDetailedStorageStats(),
        offlineStorageService.getStorageUsagePercentage()
      ]);

      setStats(basicStats);
      setDetailedStats(detailed);
      setUsagePercentage(usage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load storage stats';
      setError(errorMessage);
      logger.error('Failed to load storage statistics', 'offline-storage', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setLoading(true);
      await offlineStorageService.cleanupOldData();
      await loadStats(); // Reload stats after cleanup
      logger.info('Storage cleanup completed', 'offline-storage');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup storage';
      setError(errorMessage);
      logger.error('Storage cleanup failed', 'offline-storage', { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getStorageStatusColor = (percentage: number | null) => {
    if (percentage === null) return 'bg-gray-500';
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStorageStatusIcon = (percentage: number | null) => {
    if (percentage === null) return <Info className="h-4 w-4" />;
    if (percentage < 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading storage statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={loadStats} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage Statistics
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDetailed(!showDetailed)}
                variant="outline"
                size="sm"
              >
                {showDetailed ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button
                onClick={loadStats}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.unsyncedItems}</div>
                <div className="text-sm text-gray-600">Unsynced Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.syncQueueSize}</div>
                <div className="text-sm text-gray-600">Sync Queue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {offlineStorageService.formatStorageSize(stats.storageSize)}
                </div>
                <div className="text-sm text-gray-600">Storage Used</div>
              </div>
            </div>
          )}

          {usagePercentage !== null && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-sm font-medium">Storage Quota Usage</span>
                  {getStorageStatusIcon(usagePercentage)}
                </div>
                <span className="text-sm text-gray-600">
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${getStorageStatusColor(usagePercentage)}`}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCleanup}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old Data
            </Button>
            {stats && stats.unsyncedItems > 0 && (
              <Badge variant="secondary">
                {stats.unsyncedItems} items need sync
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {showDetailed && detailedStats && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Storage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(detailedStats.storeStats).map(([storeName, storeStats]) => (
                <div key={storeName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{storeName}</h4>
                    <Badge variant="outline">
                      {offlineStorageService.formatStorageSize(storeStats.storageSize)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <span className="ml-2 font-medium">{storeStats.itemCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unsynced:</span>
                      <span className="ml-2 font-medium">{storeStats.unsyncedCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Size:</span>
                      <span className="ml-2 font-medium">
                        {storeStats.itemCount > 0 
                          ? offlineStorageService.formatStorageSize(
                              Math.round(storeStats.storageSize / storeStats.itemCount)
                            )
                          : '0 B'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StorageStats;
