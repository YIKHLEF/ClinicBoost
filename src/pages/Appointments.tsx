import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Plus, Filter, Search, Clock, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Calendar, { CalendarEvent } from '../components/ui/Calendar';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { format, addHours, startOfDay } from 'date-fns';

// Mock data for appointments
const mockAppointments: CalendarEvent[] = [
  {
    id: '1',
    title: 'Dental Checkup',
    start: new Date(2024, 11, 15, 9, 0),
    end: new Date(2024, 11, 15, 10, 0),
    type: 'appointment',
    patient: { name: 'Mohammed Karimi', phone: '+212 6 12 34 56 78' },
    status: 'confirmed'
  },
  {
    id: '2',
    title: 'Root Canal',
    start: new Date(2024, 11, 15, 14, 30),
    end: new Date(2024, 11, 15, 16, 0),
    type: 'appointment',
    patient: { name: 'Fatima Benali', phone: '+212 6 87 65 43 21' },
    status: 'scheduled'
  },
  {
    id: '3',
    title: 'Cleaning',
    start: new Date(2024, 11, 16, 10, 0),
    end: new Date(2024, 11, 16, 11, 0),
    type: 'appointment',
    patient: { name: 'Omar Saidi', phone: '+212 6 11 22 33 44' },
    status: 'confirmed'
  },
  {
    id: '4',
    title: 'Lunch Break',
    start: new Date(2024, 11, 15, 12, 0),
    end: new Date(2024, 11, 15, 13, 0),
    type: 'break',
    status: 'scheduled'
  }
];

type ViewMode = 'month' | 'week' | 'day';

const Appointments: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState<CalendarEvent[]>(mockAppointments);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
    setIsCreateModalOpen(true);
  };

  const handleEventCreate = (date: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time || '');
    setIsCreateModalOpen(true);
  };

  const handleCreateAppointment = () => {
    // This would normally call an API
    addToast({
      type: 'success',
      title: 'Appointment Created',
      message: 'New appointment has been scheduled successfully.',
    });
    setIsCreateModalOpen(false);
  };

  const handleUpdateAppointment = () => {
    // This would normally call an API
    addToast({
      type: 'success',
      title: 'Appointment Updated',
      message: 'Appointment has been updated successfully.',
    });
    setIsEventModalOpen(false);
  };

  const handleDeleteAppointment = () => {
    if (selectedEvent) {
      setAppointments(prev => prev.filter(apt => apt.id !== selectedEvent.id));
      addToast({
        type: 'success',
        title: 'Appointment Deleted',
        message: 'Appointment has been deleted successfully.',
      });
      setIsEventModalOpen(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'no_show': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const todayAppointments = appointments.filter(apt => 
    format(apt.start, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('appointments.title', 'Appointments')}
        </h1>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t(`appointments.${mode}`, mode.charAt(0).toUpperCase() + mode.slice(1))}
              </button>
            ))}
          </div>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            {t('appointments.newAppointment', 'New Appointment')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <CalendarIcon size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('appointments.today', "Today's Appointments")}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {todayAppointments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                <Clock size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('appointments.confirmed', 'Confirmed')}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {appointments.filter(apt => apt.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg">
                <Users size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('appointments.pending', 'Pending')}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {appointments.filter(apt => apt.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                <CalendarIcon size={20} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('appointments.thisWeek', 'This Week')}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {appointments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Calendar
        events={appointments}
        view={viewMode}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onEventCreate={handleEventCreate}
      />

      {/* Event Details Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={selectedEvent?.title}
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('appointments.date', 'Date')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('appointments.time', 'Time')}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                </p>
              </div>
            </div>

            {selectedEvent.patient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('appointments.patient', 'Patient')}
                </label>
                <p className="text-gray-900 dark:text-white">{selectedEvent.patient.name}</p>
                {selectedEvent.patient.phone && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedEvent.patient.phone}</p>
                )}
              </div>
            )}

            {selectedEvent.status && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('appointments.status', 'Status')}
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedEvent.status)}`}>
                  {t(`appointments.status_${selectedEvent.status}`, selectedEvent.status)}
                </span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="outline" onClick={handleDeleteAppointment} className="text-red-600 hover:text-red-700">
                {t('common.delete', 'Delete')}
              </Button>
              <Button onClick={handleUpdateAppointment}>
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Appointment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('appointments.newAppointment', 'New Appointment')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('appointments.date', 'Date')}
              </label>
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('appointments.time', 'Time')}
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('appointments.patient', 'Patient')}
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">{t('appointments.selectPatient', 'Select a patient')}</option>
              <option value="1">Mohammed Karimi</option>
              <option value="2">Fatima Benali</option>
              <option value="3">Omar Saidi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('appointments.treatment', 'Treatment')}
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">{t('appointments.selectTreatment', 'Select treatment type')}</option>
              <option value="checkup">Dental Checkup</option>
              <option value="cleaning">Cleaning</option>
              <option value="filling">Filling</option>
              <option value="root_canal">Root Canal</option>
              <option value="extraction">Extraction</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('appointments.notes', 'Notes')}
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('appointments.notesPlaceholder', 'Additional notes...')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreateAppointment}>
              {t('appointments.createAppointment', 'Create Appointment')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Appointments;
