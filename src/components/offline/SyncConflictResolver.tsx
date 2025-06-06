/**
 * Sync Conflict Resolver Component
 * 
 * UI for resolving conflicts when offline changes conflict with server data
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, RefreshCw, Clock, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import { syncService } from '../../lib/offline/sync-service';
import { logger } from '../../lib/logging-monitoring';

export interface SyncConflict {
  id: string;
  table: string;
  recordId: string;
  localData: any;
  serverData: any;
  conflictFields: string[];
  timestamp: number;
  lastModifiedBy?: string;
}

interface SyncConflictResolverProps {
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  onResolveAll: (resolution: 'local' | 'server') => Promise<void>;
  isResolving?: boolean;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = ({
  conflicts,
  onResolve,
  onResolveAll,
  isResolving = false
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);
  const [mergeData, setMergeData] = useState<any>({});

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ) => {
    try {
      setResolvingConflict(conflictId);
      await onResolve(conflictId, resolution, mergedData);
      
      addToast({
        type: 'success',
        title: t('sync.conflictResolved', 'Conflict Resolved'),
        message: t('sync.conflictResolvedMessage', 'The sync conflict has been resolved successfully.'),
      });
    } catch (error) {
      logger.error('Failed to resolve sync conflict', 'sync-conflict', { error, conflictId });
      addToast({
        type: 'error',
        title: t('sync.conflictResolveFailed', 'Resolution Failed'),
        message: t('sync.conflictResolveFailedMessage', 'Failed to resolve the conflict. Please try again.'),
      });
    } finally {
      setResolvingConflict(null);
      setSelectedConflict(null);
    }
  };

  const handleResolveAll = async (resolution: 'local' | 'server') => {
    try {
      await onResolveAll(resolution);
      
      addToast({
        type: 'success',
        title: t('sync.allConflictsResolved', 'All Conflicts Resolved'),
        message: t('sync.allConflictsResolvedMessage', 'All sync conflicts have been resolved.'),
      });
    } catch (error) {
      logger.error('Failed to resolve all conflicts', 'sync-conflict', { error });
      addToast({
        type: 'error',
        title: t('sync.resolveAllFailed', 'Resolution Failed'),
        message: t('sync.resolveAllFailedMessage', 'Failed to resolve all conflicts. Please try again.'),
      });
    }
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  };

  const getTableDisplayName = (table: string): string => {
    const tableNames: Record<string, string> = {
      patients: t('sync.patients', 'Patients'),
      appointments: t('sync.appointments', 'Appointments'),
      treatments: t('sync.treatments', 'Treatments'),
      clinics: t('sync.clinics', 'Clinics'),
    };
    return tableNames[table] || table;
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-800 dark:text-orange-200">
              {t('sync.conflictsDetected', 'Sync Conflicts Detected')}
            </CardTitle>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            {t('sync.conflictsDescription', 
              'The following data conflicts were detected during synchronization. Please review and resolve them.'
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('local')}
              disabled={isResolving}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {t('sync.keepLocal', 'Keep All Local Changes')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveAll('server')}
              disabled={isResolving}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {t('sync.keepServer', 'Keep All Server Changes')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflict List */}
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className="border-orange-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    {getTableDisplayName(conflict.table)}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ID: {conflict.recordId}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {new Date(conflict.timestamp).toLocaleString()}
                </div>
              </div>
              {conflict.lastModifiedBy && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  {t('sync.lastModifiedBy', 'Last modified by')}: {conflict.lastModifiedBy}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedConflict === conflict.id ? (
                <div className="space-y-4">
                  {/* Conflict Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-700 dark:text-blue-300">
                        {t('sync.localChanges', 'Local Changes')}
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border">
                        {conflict.conflictFields.map((field) => (
                          <div key={field} className="mb-2 last:mb-0">
                            <span className="font-medium text-sm">{field}:</span>
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {formatFieldValue(conflict.localData[field])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700 dark:text-green-300">
                        {t('sync.serverChanges', 'Server Changes')}
                      </h4>
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded border">
                        {conflict.conflictFields.map((field) => (
                          <div key={field} className="mb-2 last:mb-0">
                            <span className="font-medium text-sm">{field}:</span>
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {formatFieldValue(conflict.serverData[field])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveConflict(conflict.id, 'local')}
                      disabled={resolvingConflict === conflict.id}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('sync.keepLocal', 'Keep Local')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolveConflict(conflict.id, 'server')}
                      disabled={resolvingConflict === conflict.id}
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('sync.keepServer', 'Keep Server')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedConflict(null)}
                      disabled={resolvingConflict === conflict.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('sync.conflictFields', 'Conflicting fields')}: {conflict.conflictFields.join(', ')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedConflict(conflict.id)}
                    disabled={isResolving}
                  >
                    {t('sync.reviewConflict', 'Review Conflict')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
