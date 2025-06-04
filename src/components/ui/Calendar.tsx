import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  isToday
} from 'date-fns';
import { cn } from '../../utils/cn';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: 'appointment' | 'blocked' | 'break';
  patient?: {
    name: string;
    phone?: string;
  };
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

interface CalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventCreate?: (date: Date, time?: string) => void;
  view?: 'month' | 'week' | 'day';
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({
  events = [],
  onDateClick,
  onEventClick,
  onEventCreate,
  view = 'month',
  className,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.start, date));
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'blocked') return 'bg-gray-500';
    if (event.type === 'break') return 'bg-yellow-500';
    
    switch (event.status) {
      case 'confirmed': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      case 'no_show': return 'bg-orange-500';
      default: return 'bg-primary-500';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-white dark:bg-gray-900 min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                !isCurrentMonth && 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div className={cn(
                'text-sm font-medium mb-1',
                isCurrentDay && 'bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center'
              )}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      'text-xs p-1 rounded text-white truncate cursor-pointer',
                      getEventColor(event)
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    {format(event.start, 'HH:mm')} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
              
              {onEventCreate && (
                <button
                  className="mt-1 w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventCreate(day);
                  }}
                >
                  <Plus size={12} className="mr-1" />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col">
        {/* Week day headers */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-4"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-4 text-center border-l border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'text-lg font-semibold mt-1',
                isToday(day) && 'bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-800">
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 text-right">
                {format(new Date().setHours(hour, 0), 'HH:mm')}
              </div>
              {weekDays.map(day => {
                const dayEvents = getEventsForDate(day).filter(event => 
                  event.start.getHours() === hour
                );

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="min-h-[60px] p-1 border-l border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => onEventCreate?.(day, `${hour.toString().padStart(2, '0')}:00`)}
                  >
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-xs p-1 rounded text-white mb-1 cursor-pointer',
                          getEventColor(event)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        {event.patient && (
                          <div className="opacity-90">{event.patient.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getViewTitle = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getViewTitle()}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600"
          >
            Today
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="p-4">
        {view === 'month' ? renderMonthView() : renderWeekView()}
      </div>
    </div>
  );
};

export default Calendar;
