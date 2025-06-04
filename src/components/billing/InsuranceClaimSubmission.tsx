import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Calendar
} from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import Modal from '../ui/Modal';

// Insurance claim schema
const claimSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  insurance_provider: z.string().min(1, 'Insurance provider is required'),
  policy_number: z.string().min(1, 'Policy number is required'),
  group_number: z.string().optional(),
  claim_type: z.enum(['primary', 'secondary']),
  service_date: z.date(),
  diagnosis_codes: z.array(z.object({
    code: z.string().min(1, 'Diagnosis code is required'),
    description: z.string().min(1, 'Description is required'),
  })).min(1, 'At least one diagnosis is required'),
  procedure_codes: z.array(z.object({
    code: z.string().min(1, 'Procedure code is required'),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Price must be positive'),
    total_price: z.number().min(0, 'Total must be positive'),
  })).min(1, 'At least one procedure is required'),
  provider_info: z.object({
    name: z.string().min(1, 'Provider name is required'),
    license_number: z.string().min(1, 'License number is required'),
    tax_id: z.string().min(1, 'Tax ID is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone is required'),
  }),
  attachments: z.array(z.object({
    file_name: z.string(),
    file_type: z.string(),
    file_size: z.number(),
    description: z.string(),
  })).optional(),
  notes: z.string().optional(),
});

type ClaimFormData = z.infer<typeof claimSchema>;

interface InsuranceClaimSubmissionProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  invoiceId?: string;
  initialData?: Partial<ClaimFormData>;
}

interface ClaimStatus {
  id: string;
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'denied' | 'paid';
  submission_date?: Date;
  response_date?: Date;
  amount_approved?: number;
  amount_paid?: number;
  denial_reason?: string;
  reference_number?: string;
}

export const InsuranceClaimSubmission: React.FC<InsuranceClaimSubmissionProps> = ({
  isOpen,
  onClose,
  patientId,
  invoiceId,
  initialData,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      patient_id: patientId || '',
      claim_type: 'primary',
      diagnosis_codes: [{ code: '', description: '' }],
      procedure_codes: [{ code: '', description: '', quantity: 1, unit_price: 0, total_price: 0 }],
      provider_info: {
        name: 'Dr. Clinic Name',
        license_number: '',
        tax_id: '',
        address: '',
        phone: '',
      },
      ...initialData,
    },
  });

  const {
    fields: diagnosisFields,
    append: appendDiagnosis,
    remove: removeDiagnosis,
  } = useFieldArray({
    control,
    name: 'diagnosis_codes',
  });

  const {
    fields: procedureFields,
    append: appendProcedure,
    remove: removeProcedure,
  } = useFieldArray({
    control,
    name: 'procedure_codes',
  });

  // Common diagnosis codes for dental procedures
  const commonDiagnosisCodes = [
    { code: 'K02.9', description: 'Dental caries, unspecified' },
    { code: 'K04.7', description: 'Periapical abscess without sinus' },
    { code: 'K05.10', description: 'Chronic gingivitis, plaque induced' },
    { code: 'K08.129', description: 'Complete loss of teeth due to periodontal diseases' },
    { code: 'K12.30', description: 'Oral mucositis, unspecified' },
  ];

  // Common procedure codes for dental procedures
  const commonProcedureCodes = [
    { code: 'D0150', description: 'Comprehensive oral evaluation', price: 150 },
    { code: 'D1110', description: 'Prophylaxis - adult', price: 200 },
    { code: 'D2140', description: 'Amalgam - one surface, primary or permanent', price: 300 },
    { code: 'D2750', description: 'Crown - porcelain fused to high noble metal', price: 1200 },
    { code: 'D7140', description: 'Extraction, erupted tooth or exposed root', price: 250 },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const calculateProcedureTotal = (index: number) => {
    const quantity = watch(`procedure_codes.${index}.quantity`);
    const unitPrice = watch(`procedure_codes.${index}.unit_price`);
    const total = quantity * unitPrice;
    setValue(`procedure_codes.${index}.total_price`, total);
    return total;
  };

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true);

    try {
      // Prepare claim data with attachments
      const claimData = {
        ...data,
        attachments: attachments.map(file => ({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          description: `Attachment for claim`,
        })),
      };

      // Submit to insurance API (mock implementation)
      const response = await submitInsuranceClaim(claimData, attachments);

      setClaimStatus({
        id: response.claim_id,
        status: 'submitted',
        submission_date: new Date(),
        reference_number: response.reference_number,
      });

      addToast({
        type: 'success',
        title: t('insurance.claimSubmitted', 'Claim Submitted'),
        message: t('insurance.claimSubmittedMessage', 'Insurance claim has been submitted successfully.'),
      });

      // Don't close immediately, show success state
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('insurance.submissionError', 'Submission Error'),
        message: error.message || t('insurance.submissionErrorMessage', 'Failed to submit insurance claim.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateClaimForm = async () => {
    try {
      // Generate standardized claim form (HCFA-1500 equivalent)
      const formData = watch();
      const pdfBlob = await generateClaimPDF(formData);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance-claim-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: t('insurance.formGenerated', 'Form Generated'),
        message: t('insurance.formGeneratedMessage', 'Claim form has been generated and downloaded.'),
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: t('insurance.generationError', 'Generation Error'),
        message: error.message || t('insurance.generationErrorMessage', 'Failed to generate claim form.'),
      });
    }
  };

  if (claimStatus?.status === 'submitted') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('insurance.claimSubmitted', 'Claim Submitted')} size="lg">
        <div className="text-center py-8">
          <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('insurance.submissionSuccessful', 'Submission Successful')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('insurance.submissionSuccessfulMessage', 'Your insurance claim has been submitted successfully.')}
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('insurance.claimId', 'Claim ID')}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">{claimStatus.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('insurance.referenceNumber', 'Reference Number')}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">{claimStatus.reference_number}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('insurance.submissionDate', 'Submission Date')}:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {claimStatus.submission_date?.toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('insurance.status', 'Status')}:
                </span>
                <span className="ml-2 text-blue-600 font-medium">
                  {t('insurance.processing', 'Processing')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={generateClaimForm}>
              <Download size={16} className="mr-2" />
              {t('insurance.downloadForm', 'Download Form')}
            </Button>
            <Button onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('insurance.submitClaim', 'Submit Insurance Claim')}
      size="4xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('insurance.basicInfo', 'Basic Information')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('insurance.insuranceProvider', 'Insurance Provider')} *
              </label>
              <input
                {...register('insurance_provider')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="CNSS, CNOPS, etc."
              />
              {errors.insurance_provider && (
                <p className="mt-1 text-sm text-red-600">{errors.insurance_provider.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('insurance.policyNumber', 'Policy Number')} *
              </label>
              <input
                {...register('policy_number')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.policy_number && (
                <p className="mt-1 text-sm text-red-600">{errors.policy_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('insurance.serviceDate', 'Service Date')} *
              </label>
              <DatePicker
                value={watch('service_date')}
                onChange={(date) => setValue('service_date', date)}
                placeholder={t('insurance.selectDate', 'Select service date')}
              />
              {errors.service_date && (
                <p className="mt-1 text-sm text-red-600">{errors.service_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('insurance.claimType', 'Claim Type')}
              </label>
              <select
                {...register('claim_type')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="primary">{t('insurance.primary', 'Primary')}</option>
                <option value="secondary">{t('insurance.secondary', 'Secondary')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Diagnosis Codes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('insurance.diagnosisCodes', 'Diagnosis Codes')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendDiagnosis({ code: '', description: '' })}
            >
              <Plus size={16} className="mr-2" />
              {t('insurance.addDiagnosis', 'Add Diagnosis')}
            </Button>
          </div>

          <div className="space-y-3">
            {diagnosisFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <input
                    {...register(`diagnosis_codes.${index}.code`)}
                    placeholder="ICD-10 Code"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-8">
                  <input
                    {...register(`diagnosis_codes.${index}.description`)}
                    placeholder="Description"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDiagnosis(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Common Diagnosis Codes */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('insurance.commonDiagnoses', 'Common Diagnoses')}:
            </p>
            <div className="flex flex-wrap gap-2">
              {commonDiagnosisCodes.map((diagnosis) => (
                <button
                  key={diagnosis.code}
                  type="button"
                  onClick={() => {
                    const lastIndex = diagnosisFields.length - 1;
                    setValue(`diagnosis_codes.${lastIndex}.code`, diagnosis.code);
                    setValue(`diagnosis_codes.${lastIndex}.description`, diagnosis.description);
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {diagnosis.code} - {diagnosis.description}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={generateClaimForm}>
              <FileText size={16} className="mr-2" />
              {t('insurance.generateForm', 'Generate Form')}
            </Button>
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              <Send size={16} className="mr-2" />
              {t('insurance.submitClaim', 'Submit Claim')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// Mock API functions (replace with real implementations)
const submitInsuranceClaim = async (claimData: ClaimFormData, attachments: File[]) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    claim_id: `CLM-${Date.now()}`,
    reference_number: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    status: 'submitted',
  };
};

const generateClaimPDF = async (claimData: ClaimFormData): Promise<Blob> => {
  // Mock PDF generation
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real implementation, this would generate a proper PDF
  const pdfContent = `Insurance Claim Form\n\nClaim Data: ${JSON.stringify(claimData, null, 2)}`;
  return new Blob([pdfContent], { type: 'application/pdf' });
};
