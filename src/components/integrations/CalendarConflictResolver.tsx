/**
 * Calendar Conflict Resolver Component
 * 
 * Provides interface for resolving calendar synchronization conflicts
 * between clinic events and external calendar events.
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Merge,
  Eye,
  Edit,
} from 'lucide-react';
import {
  type CalendarConflict,
  type CalendarEvent,
} from '../../lib/integrations/calendar-sync';

interface CalendarConflictResolverProps {
  conflicts: CalendarConflict[];
  onResolveConflict: (conflictId: string, resolution: 'clinic-wins' | 'external-wins' | 'merge') => void;
}

const CalendarConflictResolver: React.FC<CalendarConflictResolverProps> = ({
  conflicts,
  onResolveConflict,
}) => {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'time':
        return <Clock className="text-orange-500" size={20} />;
      case 'content':
        return <FileText className="text-blue-500" size={20} />;
      case 'deletion':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <AlertTriangle className="text-yellow-500" size={20} />;
    }
  };

  const getConflictTypeText = (type: string) => {
    switch (type) {
      case 'time':
        return 'Time Conflict';
      case 'content':
        return 'Content Conflict';
      case 'deletion':
        return 'Deletion Conflict';
      default:
        return 'Unknown Conflict';
    }
  };

  const getConflictDescription = (conflict: CalendarConflict) => {
    switch (conflict.conflictType) {
      case 'time':
        return 'The event times differ between clinic and external calendar';
      case 'content':
        return 'The event details (title, description, attendees) differ';
      case 'deletion':
        return 'Event was deleted in one calendar but exists in the other';
      default:
        return 'Unknown conflict type';
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    return `${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
  };

  const toggleDetails = (conflictId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [conflictId]: !prev[conflictId],
    }));
  };

  const EventCard: React.FC<{ event: CalendarEvent; label: string; color: string }> = ({
    event,
    label,
    color,
  }) => (
    <div className={`p-4 border-2 rounded-lg ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
        <Calendar size={16} className="text-gray-500" />
      </div>
      
      <div className="space-y-2">
        <div>
          <h5 className="font-medium text-gray-900 dark:text-white">{event.title}</h5>
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock size={14} />
          <span>{formatEventTime(event)}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin size={14} />
            <span>{event.location}</span>
          </div>
        )}
        
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Users size={14} />
            <span>{event.attendees.length} attendee(s)</span>
          </div>
        )}
      </div>
    </div>
  );

  if (conflicts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Conflicts
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          All calendar events are synchronized without conflicts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Calendar Conflicts
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {conflicts.length} conflict(s) need resolution
          </p>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <Card key={conflict.id} className="overflow-hidden">
            {/* Conflict Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getConflictTypeIcon(conflict.conflictType)}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {getConflictTypeText(conflict.conflictType)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getConflictDescription(conflict)}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleDetails(conflict.id)}
                  >
                    <Eye size={14} className="mr-1" />
                    {showDetails[conflict.id] ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </div>
            </div>

            {/* Conflict Details */}
            {showDetails[conflict.id] && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EventCard
                    event={conflict.clinicEvent}
                    label="Clinic Event"
                    color="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800"
                  />
                  
                  <EventCard
                    event={conflict.externalEvent}
                    label="External Event"
                    color="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800"
                  />
                </div>

                {/* Differences Highlight */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Detected Differences:
                  </h4>
                  
                  <div className="space-y-2">
                    {conflict.clinicEvent.title !== conflict.externalEvent.title && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Title:</span>
                          <div className="mt-1 grid grid-cols-1 lg:grid-cols-2 gap-2">
                            <div>
                              <span className="text-blue-600">Clinic:</span> {conflict.clinicEvent.title}
                            </div>
                            <div>
                              <span className="text-purple-600">External:</span> {conflict.externalEvent.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {conflict.clinicEvent.startTime !== conflict.externalEvent.startTime && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Start Time:</span>
                          <div className="mt-1 grid grid-cols-1 lg:grid-cols-2 gap-2">
                            <div>
                              <span className="text-blue-600">Clinic:</span> {new Date(conflict.clinicEvent.startTime).toLocaleString()}
                            </div>
                            <div>
                              <span className="text-purple-600">External:</span> {new Date(conflict.externalEvent.startTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {conflict.clinicEvent.description !== conflict.externalEvent.description && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Description:</span>
                          <div className="mt-1 grid grid-cols-1 lg:grid-cols-2 gap-2">
                            <div>
                              <span className="text-blue-600">Clinic:</span> {conflict.clinicEvent.description || 'None'}
                            </div>
                            <div>
                              <span className="text-purple-600">External:</span> {conflict.externalEvent.description || 'None'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Resolution Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    Choose Resolution
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select which version to keep or merge the changes
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveConflict(conflict.id, 'clinic-wins')}
                    className="flex items-center"
                  >
                    <ArrowLeft size={14} className="mr-1" />
                    Keep Clinic
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolveConflict(conflict.id, 'external-wins')}
                    className="flex items-center"
                  >
                    <ArrowRight size={14} className="mr-1" />
                    Keep External
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => onResolveConflict(conflict.id, 'merge')}
                    className="flex items-center"
                  >
                    <Merge size={14} className="mr-1" />
                    Merge Changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bulk Actions */}
      {conflicts.length > 1 && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Bulk Actions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Apply the same resolution to all conflicts
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'clinic-wins');
                  });
                }}
              >
                Keep All Clinic
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'external-wins');
                  });
                }}
              >
                Keep All External
              </Button>
              
              <Button
                onClick={() => {
                  conflicts.forEach(conflict => {
                    onResolveConflict(conflict.id, 'merge');
                  });
                }}
              >
                Merge All
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CalendarConflictResolver;
