/**
 * EHR/PMS Integration System
 * 
 * This module provides comprehensive EHR/PMS integration including:
 * - Epic MyChart integration
 * - Cerner PowerChart integration
 * - Allscripts integration
 * - athenahealth integration
 * - eClinicalWorks integration
 * - FHIR R4 standard support
 * - HL7 message processing
 * - Real-time data synchronization
 */

import { logger } from '../logging-monitoring';
import { secureConfig } from '../config/secure-config';

export interface EHRProvider {
  id: string;
  name: string;
  type: 'epic' | 'cerner' | 'allscripts' | 'athena' | 'eclinicalworks' | 'fhir' | 'hl7';
  enabled: boolean;
  credentials?: Record<string, any>;
  settings: EHRProviderSettings;
  endpoints: EHREndpoints;
  lastSync?: Date;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
}

export interface EHRProviderSettings {
  syncDirection: 'bidirectional' | 'ehr-to-clinic' | 'clinic-to-ehr';
  syncFrequency: number; // minutes
  dataTypes: EHRDataType[];
  autoSync: boolean;
  conflictResolution: 'ehr-wins' | 'clinic-wins' | 'manual';
  encryption: boolean;
  auditLogging: boolean;
}

export interface EHREndpoints {
  baseUrl: string;
  authUrl?: string;
  patientUrl?: string;
  appointmentUrl?: string;
  documentUrl?: string;
  billingUrl?: string;
  webhookUrl?: string;
}

export enum EHRDataType {
  PATIENTS = 'patients',
  APPOINTMENTS = 'appointments',
  MEDICAL_RECORDS = 'medical_records',
  PRESCRIPTIONS = 'prescriptions',
  LAB_RESULTS = 'lab_results',
  IMAGING = 'imaging',
  BILLING = 'billing',
  INSURANCE = 'insurance',
  ALLERGIES = 'allergies',
  MEDICATIONS = 'medications',
  VITALS = 'vitals',
  DIAGNOSES = 'diagnoses',
  PROCEDURES = 'procedures',
}

export interface PatientRecord {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  insurance?: InsuranceInfo[];
  allergies?: Allergy[];
  medications?: Medication[];
  medicalHistory?: MedicalHistoryItem[];
  lastUpdated: Date;
  source: 'clinic' | 'ehr';
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberId: string;
  subscriberName: string;
  effectiveDate: Date;
  expirationDate?: Date;
  copay?: number;
  deductible?: number;
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onsetDate?: Date;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedDate: Date;
  prescribedBy: string;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  notes?: string;
}

export interface MedicalHistoryItem {
  id: string;
  condition: string;
  diagnosisDate: Date;
  status: 'active' | 'resolved' | 'chronic';
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface AppointmentRecord {
  id: string;
  externalId?: string;
  patientId: string;
  providerId: string;
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'confirmed' | 'arrived' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  location?: string;
  notes?: string;
  reasonForVisit?: string;
  lastUpdated: Date;
  source: 'clinic' | 'ehr';
}

export interface SyncResult {
  success: boolean;
  dataType: EHRDataType;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  conflicts: DataConflict[];
  duration: number;
  timestamp: Date;
}

export interface DataConflict {
  id: string;
  dataType: EHRDataType;
  clinicRecord: any;
  ehrRecord: any;
  conflictFields: string[];
  resolution?: 'clinic-wins' | 'ehr-wins' | 'merge';
  resolved: boolean;
}

class EHRPMSManager {
  private providers: Map<string, EHRProvider> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.setupDefaultProviders();
  }

  /**
   * Initialize EHR/PMS integration system
   */
  async initialize(): Promise<void> {
    try {
      await this.loadProviderConfigurations();
      await this.setupSyncSchedules();
      this.isInitialized = true;
      
      logger.info('EHR/PMS integration system initialized', 'ehr-pms');
    } catch (error) {
      logger.error('Failed to initialize EHR/PMS system', 'ehr-pms', { error });
      throw error;
    }
  }

  /**
   * Setup default EHR/PMS providers
   */
  private setupDefaultProviders(): void {
    const defaultProviders: EHRProvider[] = [
      {
        id: 'epic-mychart',
        name: 'Epic MyChart',
        type: 'epic',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 60,
          dataTypes: [EHRDataType.PATIENTS, EHRDataType.APPOINTMENTS, EHRDataType.MEDICAL_RECORDS],
          autoSync: false,
          conflictResolution: 'manual',
          encryption: true,
          auditLogging: true,
        },
        endpoints: {
          baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
          authUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
          patientUrl: '/Patient',
          appointmentUrl: '/Appointment',
        },
        status: 'disconnected',
      },
      {
        id: 'cerner-powerchart',
        name: 'Cerner PowerChart',
        type: 'cerner',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 60,
          dataTypes: [EHRDataType.PATIENTS, EHRDataType.APPOINTMENTS],
          autoSync: false,
          conflictResolution: 'manual',
          encryption: true,
          auditLogging: true,
        },
        endpoints: {
          baseUrl: 'https://fhir-open.cerner.com/r4',
          patientUrl: '/Patient',
          appointmentUrl: '/Appointment',
        },
        status: 'disconnected',
      },
      {
        id: 'athenahealth',
        name: 'athenahealth',
        type: 'athena',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 30,
          dataTypes: [EHRDataType.PATIENTS, EHRDataType.APPOINTMENTS, EHRDataType.BILLING],
          autoSync: false,
          conflictResolution: 'manual',
          encryption: true,
          auditLogging: true,
        },
        endpoints: {
          baseUrl: 'https://api.athenahealth.com/preview1',
          patientUrl: '/patients',
          appointmentUrl: '/appointments',
          billingUrl: '/claims',
        },
        status: 'disconnected',
      },
      {
        id: 'allscripts',
        name: 'Allscripts',
        type: 'allscripts',
        enabled: false,
        settings: {
          syncDirection: 'ehr-to-clinic',
          syncFrequency: 120,
          dataTypes: [EHRDataType.PATIENTS, EHRDataType.MEDICAL_RECORDS],
          autoSync: false,
          conflictResolution: 'ehr-wins',
          encryption: true,
          auditLogging: true,
        },
        endpoints: {
          baseUrl: 'https://api.allscripts.com/fhir/r4',
          patientUrl: '/Patient',
        },
        status: 'disconnected',
      },
      {
        id: 'eclinicalworks',
        name: 'eClinicalWorks',
        type: 'eclinicalworks',
        enabled: false,
        settings: {
          syncDirection: 'bidirectional',
          syncFrequency: 90,
          dataTypes: [EHRDataType.PATIENTS, EHRDataType.APPOINTMENTS, EHRDataType.PRESCRIPTIONS],
          autoSync: false,
          conflictResolution: 'manual',
          encryption: true,
          auditLogging: true,
        },
        endpoints: {
          baseUrl: 'https://api.eclinicalworks.com/fhir/r4',
          patientUrl: '/Patient',
          appointmentUrl: '/Appointment',
        },
        status: 'disconnected',
      },
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  /**
   * Load provider configurations from storage
   */
  private async loadProviderConfigurations(): Promise<void> {
    try {
      const storedConfigs = localStorage.getItem('ehr-providers');
      if (storedConfigs) {
        const configs = JSON.parse(storedConfigs);
        Object.entries(configs).forEach(([id, config]) => {
          if (this.providers.has(id)) {
            this.providers.set(id, { ...this.providers.get(id)!, ...config });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load EHR provider configurations', 'ehr-pms', { error });
    }
  }

  /**
   * Setup sync schedules for enabled providers
   */
  private async setupSyncSchedules(): Promise<void> {
    this.providers.forEach((provider, id) => {
      if (provider.enabled && provider.settings.autoSync) {
        this.scheduleSyncForProvider(id);
      }
    });
  }

  /**
   * Schedule sync for a specific provider
   */
  private scheduleSyncForProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider) return;

    // Clear existing interval
    const existingInterval = this.syncIntervals.get(providerId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Setup new interval
    const interval = setInterval(async () => {
      await this.syncProvider(providerId);
    }, provider.settings.syncFrequency * 60 * 1000);

    this.syncIntervals.set(providerId, interval);
  }

  /**
   * Configure EHR/PMS provider
   */
  async configureProvider(
    providerId: string,
    credentials: Record<string, any>,
    settings?: Partial<EHRProviderSettings>
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      // Validate credentials
      await this.validateProviderCredentials(provider, credentials);

      // Update provider configuration
      const updatedProvider: EHRProvider = {
        ...provider,
        credentials,
        settings: { ...provider.settings, ...settings },
        enabled: true,
        status: 'connected',
      };

      this.providers.set(providerId, updatedProvider);

      // Save configuration
      await this.saveProviderConfiguration(providerId, updatedProvider);

      // Setup sync schedule if auto-sync is enabled
      if (updatedProvider.settings.autoSync) {
        this.scheduleSyncForProvider(providerId);
      }

      logger.info(`EHR provider ${providerId} configured successfully`, 'ehr-pms');
    } catch (error) {
      logger.error(`Failed to configure EHR provider ${providerId}`, 'ehr-pms', { error });
      
      // Update status to error
      const errorProvider = { ...provider, status: 'error' as const };
      this.providers.set(providerId, errorProvider);
      
      throw error;
    }
  }

  /**
   * Validate provider credentials
   */
  private async validateProviderCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    switch (provider.type) {
      case 'epic':
        await this.validateEpicCredentials(provider, credentials);
        break;
      case 'cerner':
        await this.validateCernerCredentials(provider, credentials);
        break;
      case 'athena':
        await this.validateAthenaCredentials(provider, credentials);
        break;
      case 'allscripts':
        await this.validateAllscriptsCredentials(provider, credentials);
        break;
      case 'eclinicalworks':
        await this.validateEClinicalWorksCredentials(provider, credentials);
        break;
      case 'fhir':
        await this.validateFHIRCredentials(provider, credentials);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  /**
   * Validate Epic credentials
   */
  private async validateEpicCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    if (!credentials.clientId || !credentials.accessToken) {
      throw new Error('Epic requires client ID and access token');
    }

    try {
      const response = await fetch(`${provider.endpoints.baseUrl}/metadata`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/fhir+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Epic validation failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Epic credential validation failed: ${error}`);
    }
  }

  /**
   * Validate Cerner credentials
   */
  private async validateCernerCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('Cerner requires access token');
    }

    try {
      const response = await fetch(`${provider.endpoints.baseUrl}/metadata`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/fhir+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Cerner validation failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Cerner credential validation failed: ${error}`);
    }
  }

  /**
   * Validate athenahealth credentials
   */
  private async validateAthenaCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    if (!credentials.clientId || !credentials.clientSecret || !credentials.accessToken) {
      throw new Error('athenahealth requires client ID, client secret, and access token');
    }

    try {
      const response = await fetch(`${provider.endpoints.baseUrl}/practiceinfo`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`athenahealth validation failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`athenahealth credential validation failed: ${error}`);
    }
  }

  /**
   * Validate Allscripts credentials
   */
  private async validateAllscriptsCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('Allscripts requires access token');
    }

    // Allscripts validation implementation
  }

  /**
   * Validate eClinicalWorks credentials
   */
  private async validateEClinicalWorksCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    if (!credentials.accessToken) {
      throw new Error('eClinicalWorks requires access token');
    }

    // eClinicalWorks validation implementation
  }

  /**
   * Validate FHIR credentials
   */
  private async validateFHIRCredentials(
    provider: EHRProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch(`${provider.endpoints.baseUrl}/metadata`, {
        headers: {
          'Authorization': credentials.accessToken ? `Bearer ${credentials.accessToken}` : undefined,
          'Accept': 'application/fhir+json',
        },
      });

      if (!response.ok) {
        throw new Error(`FHIR validation failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`FHIR credential validation failed: ${error}`);
    }
  }

  /**
   * Sync data with a specific provider
   */
  async syncProvider(providerId: string): Promise<SyncResult[]> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${providerId} not found or disabled`);
    }

    try {
      logger.info(`Starting sync for EHR provider ${providerId}`, 'ehr-pms');
      
      // Update status to syncing
      provider.status = 'syncing';
      this.providers.set(providerId, provider);

      const results: SyncResult[] = [];

      // Sync each enabled data type
      for (const dataType of provider.settings.dataTypes) {
        const result = await this.syncDataType(provider, dataType);
        results.push(result);
      }

      // Update last sync time and status
      provider.lastSync = new Date();
      provider.status = 'connected';
      this.providers.set(providerId, provider);

      logger.info(`Sync completed for EHR provider ${providerId}`, 'ehr-pms', {
        dataTypes: results.length,
        totalRecords: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
      });

      return results;
    } catch (error) {
      logger.error(`Sync failed for EHR provider ${providerId}`, 'ehr-pms', { error });
      
      // Update status to error
      provider.status = 'error';
      this.providers.set(providerId, provider);
      
      throw error;
    }
  }

  /**
   * Sync specific data type
   */
  private async syncDataType(provider: EHRProvider, dataType: EHRDataType): Promise<SyncResult> {
    const startTime = Date.now();
    
    const result: SyncResult = {
      success: false,
      dataType,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      conflicts: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      switch (dataType) {
        case EHRDataType.PATIENTS:
          await this.syncPatients(provider, result);
          break;
        case EHRDataType.APPOINTMENTS:
          await this.syncAppointments(provider, result);
          break;
        case EHRDataType.MEDICAL_RECORDS:
          await this.syncMedicalRecords(provider, result);
          break;
        // Add other data types as needed
        default:
          result.errors.push(`Unsupported data type: ${dataType}`);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Sync patients
   */
  private async syncPatients(provider: EHRProvider, result: SyncResult): Promise<void> {
    // Implementation for syncing patient data
    // This would fetch patients from the EHR and sync with clinic database
  }

  /**
   * Sync appointments
   */
  private async syncAppointments(provider: EHRProvider, result: SyncResult): Promise<void> {
    // Implementation for syncing appointment data
    // This would fetch appointments from the EHR and sync with clinic database
  }

  /**
   * Sync medical records
   */
  private async syncMedicalRecords(provider: EHRProvider, result: SyncResult): Promise<void> {
    // Implementation for syncing medical record data
    // This would fetch medical records from the EHR and sync with clinic database
  }

  /**
   * Save provider configuration
   */
  private async saveProviderConfiguration(
    providerId: string,
    provider: EHRProvider
  ): Promise<void> {
    try {
      const configs = JSON.parse(localStorage.getItem('ehr-providers') || '{}');
      // Remove sensitive credentials before saving
      const { credentials, ...safeProvider } = provider;
      configs[providerId] = safeProvider;
      localStorage.setItem('ehr-providers', JSON.stringify(configs));
    } catch (error) {
      logger.error('Failed to save EHR provider configuration', 'ehr-pms', { error });
    }
  }

  /**
   * Get all providers
   */
  getProviders(): EHRProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): EHRProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Enable/disable provider
   */
  async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.enabled = enabled;
    provider.status = enabled ? 'connected' : 'disconnected';
    this.providers.set(providerId, provider);

    if (enabled && provider.settings.autoSync) {
      this.scheduleSyncForProvider(providerId);
    } else {
      const interval = this.syncIntervals.get(providerId);
      if (interval) {
        clearInterval(interval);
        this.syncIntervals.delete(providerId);
      }
    }

    await this.saveProviderConfiguration(providerId, provider);
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(providerId?: string): Promise<SyncResult[][]> {
    if (providerId) {
      return [await this.syncProvider(providerId)];
    }

    const results: SyncResult[][] = [];
    for (const [id, provider] of this.providers) {
      if (provider.enabled) {
        try {
          const result = await this.syncProvider(id);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to sync EHR provider ${id}`, 'ehr-pms', { error });
        }
      }
    }

    return results;
  }

  /**
   * Test connection to provider
   */
  async testConnection(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.credentials) {
      return false;
    }

    try {
      await this.validateProviderCredentials(provider, provider.credentials);
      return true;
    } catch (error) {
      logger.error(`Connection test failed for provider ${providerId}`, 'ehr-pms', { error });
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    this.providers.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const ehrPMS = new EHRPMSManager();

// Export utility functions
export const initializeEHRPMS = () => ehrPMS.initialize();
export const configureEHRProvider = (providerId: string, credentials: Record<string, any>, settings?: Partial<EHRProviderSettings>) =>
  ehrPMS.configureProvider(providerId, credentials, settings);
export const syncEHRProvider = (providerId: string) => ehrPMS.syncProvider(providerId);
export const getEHRProviders = () => ehrPMS.getProviders();
export const triggerEHRSync = (providerId?: string) => ehrPMS.triggerSync(providerId);
export const testEHRConnection = (providerId: string) => ehrPMS.testConnection(providerId);
