/**
 * Backup & Recovery Types
 * 
 * Comprehensive type definitions for backup and recovery system
 */

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  type: BackupType;
  status: BackupStatus;
  size: number; // in bytes
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  checksum: string;
  version: string;
  encryption: EncryptionInfo;
  location: BackupLocation;
  tags: string[];
}

export interface BackupLocation {
  type: 'local' | 'cloud' | 'remote';
  path: string;
  provider?: 'aws' | 'azure' | 'gcp' | 'supabase';
  region?: string;
  bucket?: string;
  credentials?: string; // encrypted credential reference
}

export interface EncryptionInfo {
  enabled: boolean;
  algorithm?: 'AES-256' | 'AES-128';
  keyId?: string;
  iv?: string;
}

export type BackupType = 
  | 'full'           // Complete database backup
  | 'incremental'    // Changes since last backup
  | 'differential'   // Changes since last full backup
  | 'schema'         // Database structure only
  | 'data'           // Data only (no structure)
  | 'files'          // File attachments and documents
  | 'configuration'; // System configuration

export type BackupStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'corrupted';

export interface BackupSchedule {
  id: string;
  name: string;
  enabled: boolean;
  type: BackupType;
  frequency: BackupFrequency;
  time: string; // HH:MM format
  timezone: string;
  retention: RetentionPolicy;
  location: BackupLocation;
  encryption: EncryptionInfo;
  notifications: NotificationSettings;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupFrequency {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number; // for custom frequency
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  customCron?: string; // cron expression for custom schedules
}

export interface RetentionPolicy {
  keepDaily: number;    // Number of daily backups to keep
  keepWeekly: number;   // Number of weekly backups to keep
  keepMonthly: number;  // Number of monthly backups to keep
  keepYearly: number;   // Number of yearly backups to keep
  maxAge: number;       // Maximum age in days
  maxSize: number;      // Maximum total size in bytes
}

export interface NotificationSettings {
  onSuccess: boolean;
  onFailure: boolean;
  onWarning: boolean;
  email: string[];
  webhook?: string;
  slack?: string;
}

export interface BackupJob {
  id: string;
  scheduleId?: string;
  type: BackupType;
  status: BackupStatus;
  progress: number; // 0-100
  startedAt: Date;
  estimatedCompletion?: Date;
  currentOperation: string;
  metadata?: Partial<BackupMetadata>;
  error?: BackupError;
  logs: BackupLog[];
}

export interface BackupError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryCount: number;
}

export interface BackupLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  operation?: string;
  details?: any;
}

export interface RestoreOptions {
  backupId: string;
  targetDatabase?: string;
  targetLocation?: string;
  restoreType: RestoreType;
  overwriteExisting: boolean;
  restoreData: boolean;
  restoreSchema: boolean;
  restoreFiles: boolean;
  restoreConfiguration: boolean;
  pointInTime?: Date;
  tableFilters?: string[]; // specific tables to restore
  excludeTables?: string[]; // tables to exclude
  verification: VerificationOptions;
}

export type RestoreType = 
  | 'complete'      // Full restore
  | 'partial'       // Selective restore
  | 'point-in-time' // Restore to specific timestamp
  | 'test'          // Test restore (validation only)
  | 'clone';        // Create copy in different location

export interface VerificationOptions {
  enabled: boolean;
  checkIntegrity: boolean;
  validateData: boolean;
  compareChecksum: boolean;
  testConnections: boolean;
}

export interface RestoreJob {
  id: string;
  backupId: string;
  options: RestoreOptions;
  status: BackupStatus;
  progress: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  currentOperation: string;
  error?: BackupError;
  logs: BackupLog[];
  verification?: VerificationResult;
}

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
}

export interface VerificationCheck {
  name: string;
  type: 'integrity' | 'data' | 'checksum' | 'connection';
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface BackupStatistics {
  totalBackups: number;
  totalSize: number;
  successRate: number;
  averageBackupTime: number;
  lastBackupTime: Date;
  nextScheduledBackup: Date;
  storageUsage: StorageUsage;
  recentActivity: BackupActivity[];
}

export interface StorageUsage {
  used: number;
  available: number;
  total: number;
  percentage: number;
  byType: Record<BackupType, number>;
  byLocation: Record<string, number>;
}

export interface BackupActivity {
  timestamp: Date;
  type: 'backup' | 'restore' | 'delete' | 'verify';
  status: BackupStatus;
  backupId?: string;
  size?: number;
  duration?: number;
  message: string;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  steps: RecoveryStep[];
  contacts: EmergencyContact[];
  resources: RecoveryResource[];
  testing: TestingSchedule;
  lastTested?: Date;
  lastUpdated: Date;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface RecoveryStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'verification';
  estimatedTime: number; // in minutes
  dependencies: string[]; // step IDs
  responsible: string; // role or person
  instructions: string;
  automation?: AutomationScript;
  verification?: VerificationCriteria;
}

export interface AutomationScript {
  type: 'shell' | 'sql' | 'api' | 'function';
  content: string;
  parameters?: Record<string, any>;
  timeout: number;
  retries: number;
}

export interface VerificationCriteria {
  type: 'manual' | 'automated';
  criteria: string;
  expectedResult: string;
  automation?: AutomationScript;
}

export interface EmergencyContact {
  name: string;
  role: string;
  email: string;
  phone: string;
  priority: number;
  availability: string;
}

export interface RecoveryResource {
  type: 'server' | 'database' | 'storage' | 'network' | 'application';
  name: string;
  description: string;
  location: string;
  credentials?: string;
  configuration?: any;
  dependencies: string[];
}

export interface TestingSchedule {
  frequency: 'monthly' | 'quarterly' | 'annually';
  lastTest?: Date;
  nextTest?: Date;
  testType: 'full' | 'partial' | 'tabletop';
  results?: TestResult[];
}

export interface TestResult {
  date: Date;
  type: 'full' | 'partial' | 'tabletop';
  success: boolean;
  duration: number;
  issues: TestIssue[];
  recommendations: string[];
  testedBy: string;
}

export interface TestIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  resolution?: string;
  status: 'open' | 'resolved' | 'deferred';
}

export interface BackupConfiguration {
  general: {
    defaultLocation: BackupLocation;
    defaultEncryption: EncryptionInfo;
    defaultRetention: RetentionPolicy;
    compressionLevel: number; // 0-9
    parallelJobs: number;
    timeoutMinutes: number;
  };
  notifications: NotificationSettings;
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      failureRate: number;
      storageUsage: number;
      backupAge: number;
    };
    healthChecks: boolean;
    performanceMetrics: boolean;
  };
  security: {
    encryptionRequired: boolean;
    keyRotationDays: number;
    accessLogging: boolean;
    auditTrail: boolean;
  };
  compliance: {
    dataRetentionDays: number;
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    auditRequirements: string[];
  };
}
