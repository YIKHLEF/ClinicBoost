/**
 * Mock i18n for testing
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common translations for testing
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      
      // Navigation
      'navigation.dashboard': 'Dashboard',
      'navigation.patients': 'Patients',
      'navigation.appointments': 'Appointments',
      'navigation.billing': 'Billing',
      'navigation.reports': 'Reports',
      'navigation.settings': 'Settings',
      'navigation.compliance': 'Compliance',
      
      // Patients
      'patients.title': 'Patients',
      'patients.addPatient': 'Add Patient',
      'patients.firstName': 'First Name',
      'patients.lastName': 'Last Name',
      'patients.email': 'Email',
      'patients.phone': 'Phone',
      
      // Appointments
      'appointments.title': 'Appointments',
      'appointments.schedule': 'Schedule Appointment',
      'appointments.date': 'Date',
      'appointments.time': 'Time',
      'appointments.duration': 'Duration',
      'appointments.status': 'Status',
      
      // Compliance
      'compliance.title': 'Compliance Center',
      'compliance.gdpr': 'GDPR Compliance',
      'compliance.consent.title': 'We value your privacy',
      'compliance.consent.acceptAll': 'Accept All',
      'compliance.consent.rejectAll': 'Reject All',
      
      // Forms
      'forms.required': 'This field is required',
      'forms.invalidEmail': 'Invalid email address',
      'forms.invalidPhone': 'Invalid phone number',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
