import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useCreatePatient, useUpdatePatient } from '../../hooks/usePatients';
import { patientSchema } from '../../lib/validation/schemas';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  Heart, 
  FileText,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import Modal from '../ui/Modal';
import type { Database } from '../../lib/database.types';

type Patient = Database['public']['Tables']['patients']['Row'];

interface ComprehensivePatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient;
  mode: 'create' | 'edit';
}

interface FormData {
  // Personal Information
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  date_of_birth?: Date;
  gender?: string;
  
  // Contact Information
  address?: string;
  city?: string;
  postal_code?: string;
  
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  // Insurance Information
  insurance_provider?: string;
  insurance_number?: string;
  insurance_group?: string;
  insurance_expiry?: Date;
  
  // Medical History
  allergies: Array<{ name: string; severity: string; notes?: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string; prescriber?: string }>;
  conditions: Array<{ name: string; diagnosed_date?: Date; status: string; notes?: string }>;
  surgeries: Array<{ procedure: string; date: Date; surgeon?: string; notes?: string }>;
  family_history: Array<{ condition: string; relationship: string; notes?: string }>;
  
  // Social History
  smoking: string;
  alcohol: string;
  exercise: string;
  diet: string;
  social_notes?: string;
  
  // Dental History
  last_cleaning?: Date;
  last_xray?: Date;
  orthodontics: boolean;
  oral_surgery: boolean;
  periodontal_treatment: boolean;
  dental_concerns: string;
  dental_notes: string;
  
  // General
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
  risk_level: 'low' | 'medium' | 'high';
}

export const ComprehensivePatientForm: React.FC<ComprehensivePatientFormProps> = ({
  isOpen,
  onClose,
  patient,
  mode,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { id: 'personal', label: t('patients.personalInfo', 'Personal Information'), icon: User },
    { id: 'contact', label: t('patients.contactInfo', 'Contact Information'), icon: MapPin },
    { id: 'insurance', label: t('patients.insuranceInfo', 'Insurance'), icon: Shield },
    { id: 'medical', label: t('patients.medicalHistory', 'Medical History'), icon: Heart },
    { id: 'dental', label: t('patients.dentalHistory', 'Dental History'), icon: FileText },
  ];

  const defaultValues: FormData = {
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    date_of_birth: patient?.date_of_birth ? new Date(patient.date_of_birth) : undefined,
    gender: patient?.gender || '',
    address: patient?.address || '',
    city: patient?.city || '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    insurance_provider: patient?.insurance_provider || '',
    insurance_number: patient?.insurance_number || '',
    insurance_group: '',
    insurance_expiry: undefined,
    allergies: [],
    medications: [],
    conditions: [],
    surgeries: [],
    family_history: [],
    smoking: 'never',
    alcohol: 'never',
    exercise: 'regular',
    diet: 'balanced',
    social_notes: '',
    last_cleaning: undefined,
    last_xray: undefined,
    orthodontics: false,
    oral_surgery: false,
    periodontal_treatment: false,
    dental_concerns: '',
    dental_notes: '',
    notes: patient?.notes || '',
    status: (patient?.status as any) || 'active',
    risk_level: (patient?.risk_level as any) || 'low',
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
    resolver: zodResolver(patientSchema),
  });

  const {
    fields: allergyFields,
    append: appendAllergy,
    remove: removeAllergy,
  } = useFieldArray({
    control,
    name: 'allergies',
  });

  const {
    fields: medicationFields,
    append: appendMedication,
    remove: removeMedication,
  } = useFieldArray({
    control,
    name: 'medications',
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control,
    name: 'conditions',
  });

  const {
    fields: surgeryFields,
    append: appendSurgery,
    remove: removeSurgery,
  } = useFieldArray({
    control,
    name: 'surgeries',
  });

  const {
    fields: familyHistoryFields,
    append: appendFamilyHistory,
    remove: removeFamilyHistory,
  } = useFieldArray({
    control,
    name: 'family_history',
  });

  const onSubmit = async (data: FormData) => {
    try {
      const patientData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone,
        date_of_birth: data.date_of_birth?.toISOString().split('T')[0] || null,
        gender: data.gender || null,
        address: data.address || null,
        city: data.city || null,
        insurance_provider: data.insurance_provider || null,
        insurance_number: data.insurance_number || null,
        medical_history: {
          allergies: data.allergies,
          medications: data.medications,
          conditions: data.conditions,
          surgeries: data.surgeries,
          family_history: data.family_history,
          social_history: {
            smoking: data.smoking,
            alcohol: data.alcohol,
            exercise: data.exercise,
            diet: data.diet,
            notes: data.social_notes,
          },
          dental_history: {
            last_cleaning: data.last_cleaning?.toISOString().split('T')[0],
            last_xray: data.last_xray?.toISOString().split('T')[0],
            orthodontics: data.orthodontics,
            oral_surgery: data.oral_surgery,
            periodontal_treatment: data.periodontal_treatment,
            concerns: data.dental_concerns,
            notes: data.dental_notes,
          },
        },
        notes: data.notes || null,
        status: data.status,
        risk_level: data.risk_level,
      };

      if (mode === 'create') {
        await createPatient.mutateAsync(patientData);
        addToast({
          type: 'success',
          title: t('patients.created', 'Patient Created'),
          message: t('patients.createdMessage', 'Patient has been created successfully.'),
        });
      } else if (patient) {
        await updatePatient.mutateAsync({
          id: patient.id,
          data: patientData,
        });
        addToast({
          type: 'success',
          title: t('patients.updated', 'Patient Updated'),
          message: t('patients.updatedMessage', 'Patient has been updated successfully.'),
        });
      }

      onClose();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.message || t('patients.saveError', 'Failed to save patient.'),
      });
    }
  };

  const nextTab = () => {
    if (currentTab < tabs.length - 1) {
      setCurrentTab(currentTab + 1);
    }
  };

  const prevTab = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.firstName', 'First Name')} *
          </label>
          <input
            {...register('first_name')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.lastName', 'Last Name')} *
          </label>
          <input
            {...register('last_name')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.email', 'Email')}
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.phone', 'Phone')} *
          </label>
          <input
            {...register('phone')}
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+212 6 12 34 56 78"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.dateOfBirth', 'Date of Birth')}
          </label>
          <DatePicker
            value={watch('date_of_birth')}
            onChange={(date) => setValue('date_of_birth', date)}
            placeholder={t('patients.selectDate', 'Select date')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.gender', 'Gender')}
          </label>
          <select
            {...register('gender')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('patients.selectGender', 'Select gender')}</option>
            <option value="male">{t('patients.male', 'Male')}</option>
            <option value="female">{t('patients.female', 'Female')}</option>
            <option value="other">{t('patients.other', 'Other')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.status', 'Status')}
          </label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="active">{t('patients.active', 'Active')}</option>
            <option value="inactive">{t('patients.inactive', 'Inactive')}</option>
            <option value="archived">{t('patients.archived', 'Archived')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.riskLevel', 'Risk Level')}
          </label>
          <select
            {...register('risk_level')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="low">{t('patients.lowRisk', 'Low Risk')}</option>
            <option value="medium">{t('patients.mediumRisk', 'Medium Risk')}</option>
            <option value="high">{t('patients.highRisk', 'High Risk')}</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.address', 'Address')}
          </label>
          <textarea
            {...register('address')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={t('patients.addressPlaceholder', 'Enter full address')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.city', 'City')}
          </label>
          <input
            {...register('city')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.postalCode', 'Postal Code')}
          </label>
          <input
            {...register('postal_code')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('patients.emergencyContact', 'Emergency Contact')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.emergencyContactName', 'Contact Name')}
            </label>
            <input
              {...register('emergency_contact_name')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.emergencyContactPhone', 'Contact Phone')}
            </label>
            <input
              {...register('emergency_contact_phone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.relationship', 'Relationship')}
            </label>
            <select
              {...register('emergency_contact_relationship')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('patients.selectRelationship', 'Select relationship')}</option>
              <option value="spouse">{t('patients.spouse', 'Spouse')}</option>
              <option value="parent">{t('patients.parent', 'Parent')}</option>
              <option value="child">{t('patients.child', 'Child')}</option>
              <option value="sibling">{t('patients.sibling', 'Sibling')}</option>
              <option value="friend">{t('patients.friend', 'Friend')}</option>
              <option value="other">{t('patients.other', 'Other')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsuranceInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.insuranceProvider', 'Insurance Provider')}
          </label>
          <input
            {...register('insurance_provider')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="CNSS, CNOPS, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.insuranceNumber', 'Insurance Number')}
          </label>
          <input
            {...register('insurance_number')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.insuranceGroup', 'Group Number')}
          </label>
          <input
            {...register('insurance_group')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.insuranceExpiry', 'Insurance Expiry')}
          </label>
          <DatePicker
            value={watch('insurance_expiry')}
            onChange={(date) => setValue('insurance_expiry', date)}
            placeholder={t('patients.selectDate', 'Select date')}
          />
        </div>
      </div>
    </div>
  );

  const renderMedicalHistory = () => (
    <div className="space-y-6">
      {/* Allergies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('patients.allergies', 'Allergies')}
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendAllergy({ name: '', severity: 'mild', notes: '' })}
          >
            <Plus size={16} className="mr-2" />
            Add Allergy
          </Button>
        </div>

        <div className="space-y-3">
          {allergyFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4">
                <input
                  {...register(`allergies.${index}.name`)}
                  placeholder="Allergy name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-3">
                <select
                  {...register(`allergies.${index}.severity`)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
              <div className="col-span-4">
                <input
                  {...register(`allergies.${index}.notes`)}
                  placeholder="Notes"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAllergy(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('patients.medications', 'Current Medications')}
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendMedication({ name: '', dosage: '', frequency: '', prescriber: '' })}
          >
            <Plus size={16} className="mr-2" />
            Add Medication
          </Button>
        </div>

        <div className="space-y-3">
          {medicationFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <input
                  {...register(`medications.${index}.name`)}
                  placeholder="Medication name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  {...register(`medications.${index}.dosage`)}
                  placeholder="Dosage"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <input
                  {...register(`medications.${index}.frequency`)}
                  placeholder="Frequency"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-3">
                <input
                  {...register(`medications.${index}.prescriber`)}
                  placeholder="Prescriber"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedication(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social History */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('patients.socialHistory', 'Social History')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.smoking', 'Smoking')}
            </label>
            <select
              {...register('smoking')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="never">Never</option>
              <option value="former">Former smoker</option>
              <option value="current">Current smoker</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.alcohol', 'Alcohol')}
            </label>
            <select
              {...register('alcohol')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="never">Never</option>
              <option value="occasional">Occasional</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.exercise', 'Exercise')}
            </label>
            <select
              {...register('exercise')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="regular">Regular</option>
              <option value="intense">Intense</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('patients.diet', 'Diet')}
            </label>
            <select
              {...register('diet')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="balanced">Balanced</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="low-carb">Low carb</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDentalHistory = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.lastCleaning', 'Last Cleaning')}
          </label>
          <DatePicker
            value={watch('last_cleaning')}
            onChange={(date) => setValue('last_cleaning', date)}
            placeholder={t('patients.selectDate', 'Select date')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('patients.lastXray', 'Last X-ray')}
          </label>
          <DatePicker
            value={watch('last_xray')}
            onChange={(date) => setValue('last_xray', date)}
            placeholder={t('patients.selectDate', 'Select date')}
          />
        </div>
      </div>

      <div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('patients.previousTreatments', 'Previous Treatments')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <input
              {...register('orthodontics')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('patients.orthodontics', 'Orthodontics')}
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('oral_surgery')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('patients.oralSurgery', 'Oral Surgery')}
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('periodontal_treatment')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('patients.periodontalTreatment', 'Periodontal Treatment')}
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('patients.dentalConcerns', 'Current Dental Concerns')}
        </label>
        <textarea
          {...register('dental_concerns')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('patients.dentalConcernsPlaceholder', 'Describe any current dental concerns or symptoms')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('patients.dentalNotes', 'Dental Notes')}
        </label>
        <textarea
          {...register('dental_notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('patients.dentalNotesPlaceholder', 'Additional dental history notes')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('patients.generalNotes', 'General Notes')}
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={t('patients.generalNotesPlaceholder', 'Any additional notes about the patient')}
        />
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('patients.addPatient', 'Add Patient') : t('patients.editPatient', 'Edit Patient')}
      size="4xl"
    >
      <div className="flex h-[700px]">
        {/* Tab Navigation */}
        <div className="w-1/4 bg-gray-50 dark:bg-gray-800 p-4 border-r border-gray-200 dark:border-gray-700">
          <nav className="space-y-2">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(index)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    currentTab === index
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col">
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto">
              {currentTab === 0 && renderPersonalInfo()}
              {currentTab === 1 && renderContactInfo()}
              {currentTab === 2 && renderInsuranceInfo()}
              {currentTab === 3 && renderMedicalHistory()}
              {currentTab === 4 && renderDentalHistory()}
            </div>

            {/* Navigation Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevTab}
                disabled={currentTab === 0}
              >
                Previous
              </Button>

              <div className="flex space-x-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>

                {currentTab === tabs.length - 1 ? (
                  <Button type="submit" loading={isSubmitting}>
                    <Save size={16} className="mr-2" />
                    {mode === 'create' ? 'Create Patient' : 'Update Patient'}
                  </Button>
                ) : (
                  <Button type="button" onClick={nextTab}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};
