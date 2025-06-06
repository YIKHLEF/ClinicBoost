/**
 * Anonymization Demo and Testing Utility
 * 
 * This utility demonstrates the anonymization capabilities and provides
 * a way to test and validate the anonymization implementation.
 */

import { AnonymizationEngine } from './anonymization-utils';
import { ANONYMIZATION_CONFIG } from './anonymization-config';
import { gdprService } from './gdpr-service';
import { logger } from '../logging-monitoring';

// Sample data for testing
const SAMPLE_DATA = {
  user: {
    id: 'user-12345',
    first_name: 'Dr. Sarah',
    last_name: 'Johnson',
    phone: '+1-555-123-4567',
    avatar_url: 'https://example.com/avatars/sarah-johnson.jpg',
    role: 'dentist',
    default_clinic_id: 'clinic-67890',
    created_at: '2023-01-15T08:30:00Z',
    updated_at: '2023-06-20T14:45:00Z'
  },
  
  patient: {
    id: 'patient-98765',
    clinic_id: 'clinic-67890',
    first_name: 'Michael',
    last_name: 'Thompson',
    email: 'michael.thompson@email.com',
    phone: '+1-555-987-6543',
    date_of_birth: '1978-09-22',
    gender: 'male',
    address: '456 Oak Avenue, Suite 12B',
    city: 'San Francisco',
    insurance_provider: 'Aetna Health Insurance',
    insurance_number: 'AET987654321',
    medical_history: {
      allergies: ['penicillin', 'shellfish', 'latex'],
      medications: ['lisinopril 10mg daily', 'metformin 500mg twice daily'],
      conditions: ['type 2 diabetes', 'hypertension', 'mild anxiety'],
      notes: 'Patient has dental anxiety and prefers nitrous oxide for procedures. History of TMJ disorder.'
    },
    notes: 'Prefers early morning appointments. Requires pre-medication for anxiety. Emergency contact: spouse at 555-111-2222.',
    status: 'active',
    risk_level: 'medium',
    created_at: '2023-02-10T10:15:00Z',
    updated_at: '2023-06-18T16:20:00Z'
  },
  
  appointments: [
    {
      id: 'appointment-11111',
      clinic_id: 'clinic-67890',
      patient_id: 'patient-98765',
      dentist_id: 'user-12345',
      start_time: '2023-06-25T09:00:00Z',
      end_time: '2023-06-25T10:30:00Z',
      status: 'completed',
      treatment_id: 'treatment-22222',
      notes: 'Routine cleaning completed. Patient tolerated procedure well with nitrous oxide. Recommended fluoride treatment.',
      reminder_sent: true,
      created_at: '2023-06-01T12:00:00Z',
      updated_at: '2023-06-25T10:35:00Z'
    }
  ],
  
  treatments: [
    {
      id: 'treatment-22222',
      patient_id: 'patient-98765',
      name: 'Comprehensive Dental Cleaning',
      description: 'Deep cleaning with scaling and root planing, fluoride treatment',
      cost: 285.00,
      status: 'completed',
      start_date: '2023-06-25',
      completion_date: '2023-06-25',
      notes: 'Patient had moderate tartar buildup. Gums showed mild inflammation. Recommended improved flossing routine.',
      created_at: '2023-06-01T12:00:00Z',
      updated_at: '2023-06-25T10:35:00Z'
    }
  ],
  
  invoices: [
    {
      id: 'invoice-33333',
      patient_id: 'patient-98765',
      treatment_id: 'treatment-22222',
      amount: 285.00,
      status: 'completed',
      due_date: '2023-07-25',
      payment_method: 'credit_card',
      stripe_payment_intent_id: 'pi_1NXYZabcdef123456789',
      notes: 'Payment processed successfully. Insurance covered $200, patient paid $85 copay.',
      created_at: '2023-06-25T10:40:00Z',
      updated_at: '2023-06-25T11:15:00Z'
    }
  ],
  
  consents: [
    {
      id: 'consent-44444',
      user_id: null,
      patient_id: 'patient-98765',
      consent_type: 'data_processing',
      status: 'granted',
      granted_at: '2023-02-10T10:20:00Z',
      withdrawn_at: null,
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      consent_text: 'I consent to the processing of my personal health information for treatment, payment, and healthcare operations as described in the Notice of Privacy Practices.',
      version: '2.1',
      metadata: {
        source: 'patient_portal',
        session_id: 'sess_abc123def456',
        form_version: '2.1',
        ip_geolocation: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco'
        }
      },
      created_at: '2023-02-10T10:20:00Z',
      updated_at: '2023-02-10T10:20:00Z'
    }
  ]
};

/**
 * Demonstrate anonymization capabilities
 */
export async function demonstrateAnonymization(): Promise<void> {
  console.log('🔒 Data Anonymization Demonstration\n');
  console.log('=' .repeat(50));
  
  const anonymizer = new AnonymizationEngine();
  
  try {
    // 1. User Anonymization
    console.log('\n📋 1. USER DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original User Data:');
    console.log(JSON.stringify(SAMPLE_DATA.user, null, 2));
    
    const anonymizedUser = anonymizer.anonymizeUser(SAMPLE_DATA.user);
    console.log('\nAnonymized User Data:');
    console.log(JSON.stringify(anonymizedUser, null, 2));
    
    // 2. Patient Anonymization
    console.log('\n🏥 2. PATIENT DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original Patient Data:');
    console.log(JSON.stringify(SAMPLE_DATA.patient, null, 2));
    
    const anonymizedPatient = anonymizer.anonymizePatient(SAMPLE_DATA.patient);
    console.log('\nAnonymized Patient Data:');
    console.log(JSON.stringify(anonymizedPatient, null, 2));
    
    // 3. Appointment Anonymization
    console.log('\n📅 3. APPOINTMENT DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original Appointment Data:');
    console.log(JSON.stringify(SAMPLE_DATA.appointments[0], null, 2));
    
    const anonymizedAppointment = anonymizer.anonymizeAppointment(SAMPLE_DATA.appointments[0]);
    console.log('\nAnonymized Appointment Data:');
    console.log(JSON.stringify(anonymizedAppointment, null, 2));
    
    // 4. Treatment Anonymization
    console.log('\n🦷 4. TREATMENT DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original Treatment Data:');
    console.log(JSON.stringify(SAMPLE_DATA.treatments[0], null, 2));
    
    const anonymizedTreatment = anonymizer.anonymizeTreatment(SAMPLE_DATA.treatments[0]);
    console.log('\nAnonymized Treatment Data:');
    console.log(JSON.stringify(anonymizedTreatment, null, 2));
    
    // 5. Invoice Anonymization
    console.log('\n💰 5. INVOICE DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original Invoice Data:');
    console.log(JSON.stringify(SAMPLE_DATA.invoices[0], null, 2));
    
    const anonymizedInvoice = anonymizer.anonymizeInvoice(SAMPLE_DATA.invoices[0]);
    console.log('\nAnonymized Invoice Data:');
    console.log(JSON.stringify(anonymizedInvoice, null, 2));
    
    // 6. Consent Anonymization
    console.log('\n✅ 6. CONSENT DATA ANONYMIZATION');
    console.log('-'.repeat(30));
    console.log('Original Consent Data:');
    console.log(JSON.stringify(SAMPLE_DATA.consents[0], null, 2));
    
    const anonymizedConsent = anonymizer.anonymizeConsent(SAMPLE_DATA.consents[0]);
    console.log('\nAnonymized Consent Data:');
    console.log(JSON.stringify(anonymizedConsent, null, 2));
    
    // 7. Full Export Anonymization
    console.log('\n📦 7. FULL EXPORT ANONYMIZATION');
    console.log('-'.repeat(30));
    
    const fullAnonymizedData = {
      user: anonymizedUser,
      patient: anonymizedPatient,
      appointments: [anonymizedAppointment],
      treatments: [anonymizedTreatment],
      invoices: [anonymizedInvoice],
      consents: [anonymizedConsent]
    };
    
    // Add export metadata
    const exportData = {
      ...fullAnonymizedData,
      metadata: {
        exportDate: new Date().toISOString(),
        format: 'json',
        anonymized: true,
        dataSubject: 'patient',
        subjectId: 'patient-98765'
      }
    };
    
    console.log('Complete Anonymized Export:');
    console.log(JSON.stringify(exportData, null, 2));
    
    // 8. Validation
    console.log('\n🔍 8. ANONYMIZATION VALIDATION');
    console.log('-'.repeat(30));
    
    const validation = await gdprService.validateAnonymization(SAMPLE_DATA, exportData);
    console.log('Validation Results:');
    console.log(`✅ Valid: ${validation.isValid}`);
    console.log(`📊 Score: ${validation.score}/100`);
    console.log(`⚠️  Issues: ${validation.issues.length}`);
    
    if (validation.issues.length > 0) {
      console.log('Issues found:');
      validation.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    // 9. Anonymization Report
    console.log('\n📊 9. ANONYMIZATION REPORT');
    console.log('-'.repeat(30));
    
    const report = await gdprService.generateAnonymizationReport(exportData);
    console.log('Anonymization Report:');
    console.log(`📈 Total Fields: ${report.summary.totalFields}`);
    console.log(`🔒 Anonymized Fields: ${report.summary.anonymizedFields}`);
    console.log(`📊 Coverage: ${((report.summary.anonymizedFields / report.summary.totalFields) * 100).toFixed(1)}%`);
    console.log(`🛠️  Techniques Used: ${report.summary.techniques.join(', ')}`);
    console.log(`📋 Data Types: ${report.summary.dataTypes.join(', ')}`);
    console.log(`✅ GDPR Compliant: ${report.compliance.gdprCompliant}`);
    console.log(`🏥 HIPAA Compliant: ${report.compliance.hipaaCompliant}`);
    
    console.log('\n🎉 Anonymization demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during anonymization demonstration:', error);
    logger.error('Anonymization demonstration failed', 'anonymization-demo', { error });
  }
}

/**
 * Test anonymization with different levels
 */
export async function testAnonymizationLevels(): Promise<void> {
  console.log('\n🔒 Testing Different Anonymization Levels\n');
  console.log('=' .repeat(50));
  
  const anonymizer = new AnonymizationEngine();
  const testData = SAMPLE_DATA.patient;
  
  try {
    // Test with different anonymization levels
    const levels: Array<'minimal' | 'standard' | 'full'> = ['minimal', 'standard', 'full'];
    
    for (const level of levels) {
      console.log(`\n📊 ${level.toUpperCase()} ANONYMIZATION LEVEL`);
      console.log('-'.repeat(30));
      
      // For this demo, we'll use the same anonymization but with different metadata
      const anonymized = anonymizer.anonymizePatient(testData);
      anonymized._anonymization.anonymization_level = level;
      
      console.log(`Anonymization Level: ${level}`);
      console.log('Sample anonymized fields:');
      console.log(`  Name: ${anonymized.first_name} ${anonymized.last_name}`);
      console.log(`  Email: ${anonymized.email}`);
      console.log(`  Phone: ${anonymized.phone}`);
      console.log(`  Age Range: ${anonymized.age_range}`);
      console.log(`  Insurance: ${anonymized.insurance_number}`);
    }
    
    console.log('\n✅ Anonymization level testing completed!');
    
  } catch (error) {
    console.error('❌ Error during anonymization level testing:', error);
    logger.error('Anonymization level testing failed', 'anonymization-demo', { error });
  }
}

/**
 * Run the complete demonstration
 */
export async function runDemo(): Promise<void> {
  await demonstrateAnonymization();
  await testAnonymizationLevels();
}

// Export sample data for testing
export { SAMPLE_DATA };
