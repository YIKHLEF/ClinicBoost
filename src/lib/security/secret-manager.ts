/**
 * Secret Management System for ClinicBoost
 * Handles secure storage, rotation, and access control for sensitive data
 */

import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { reportError, ErrorSeverity, ErrorCategory } from '../monitoring/error-reporting';

// Secret types
enum SecretType {
  API_KEY = 'api_key',
  DATABASE_PASSWORD = 'database_password',
  JWT_SECRET = 'jwt_secret',
  ENCRYPTION_KEY = 'encryption_key',
  WEBHOOK_SECRET = 'webhook_secret',
  OAUTH_SECRET = 'oauth_secret'
}

// Secret metadata
interface SecretMetadata {
  id: string;
  name: string;
  type: SecretType;
  environment: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  rotationInterval?: number; // in days
  lastRotated?: Date;
  accessCount: number;
  tags: string[];
}

// Secret entry
interface SecretEntry {
  metadata: SecretMetadata;
  value: string;
  previousValue?: string; // For rotation
  checksum: string;
}

// Access control
interface AccessPolicy {
  secretId: string;
  allowedEnvironments: string[];
  allowedServices: string[];
  maxAccessCount?: number;
  timeRestrictions?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export class SecretManager {
  private secrets = new Map<string, SecretEntry>();
  private accessPolicies = new Map<string, AccessPolicy>();
  private encryptionKey: string;
  private rotationSchedule = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.encryptionKey = this.deriveEncryptionKey();
    this.initializeDefaultSecrets();
    this.setupRotationSchedule();
  }

  /**
   * Store a secret securely
   */
  async storeSecret(
    name: string,
    value: string,
    type: SecretType,
    options?: {
      expiresAt?: Date;
      rotationInterval?: number;
      tags?: string[];
      accessPolicy?: Partial<AccessPolicy>;
    }
  ): Promise<string> {
    try {
      const secretId = this.generateSecretId();
      const encryptedValue = await this.encrypt(value);
      const checksum = await this.generateChecksum(value);

      const metadata: SecretMetadata = {
        id: secretId,
        name,
        type,
        environment: secureConfig.getEnvironmentType(),
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: options?.expiresAt,
        rotationInterval: options?.rotationInterval,
        accessCount: 0,
        tags: options?.tags || []
      };

      const secretEntry: SecretEntry = {
        metadata,
        value: encryptedValue,
        checksum
      };

      this.secrets.set(secretId, secretEntry);

      // Set up access policy
      if (options?.accessPolicy) {
        const policy: AccessPolicy = {
          secretId,
          allowedEnvironments: [secureConfig.getEnvironmentType()],
          allowedServices: ['clinicboost'],
          ...options.accessPolicy
        };
        this.accessPolicies.set(secretId, policy);
      }

      // Schedule rotation if specified
      if (options?.rotationInterval) {
        this.scheduleRotation(secretId, options.rotationInterval);
      }

      logger.info('Secret stored', 'secret-manager', {
        secretId,
        name,
        type,
        environment: metadata.environment
      });

      return secretId;
    } catch (error) {
      await reportError(
        `Failed to store secret: ${error}`,
        ErrorSeverity.HIGH,
        ErrorCategory.SECURITY,
        { secretName: name, secretType: type }
      );
      throw error;
    }
  }

  /**
   * Retrieve a secret
   */
  async getSecret(secretId: string, requestContext?: {
    service?: string;
    environment?: string;
    reason?: string;
  }): Promise<string | null> {
    try {
      const secretEntry = this.secrets.get(secretId);
      if (!secretEntry) {
        logger.warn('Secret not found', 'secret-manager', { secretId });
        return null;
      }

      // Check access policy
      if (!this.checkAccess(secretId, requestContext)) {
        await reportError(
          'Unauthorized secret access attempt',
          ErrorSeverity.HIGH,
          ErrorCategory.SECURITY,
          { secretId, requestContext }
        );
        return null;
      }

      // Check expiration
      if (secretEntry.metadata.expiresAt && new Date() > secretEntry.metadata.expiresAt) {
        logger.warn('Attempted access to expired secret', 'secret-manager', { secretId });
        return null;
      }

      // Decrypt and verify
      const decryptedValue = await this.decrypt(secretEntry.value);
      const isValid = await this.verifyChecksum(decryptedValue, secretEntry.checksum);
      
      if (!isValid) {
        await reportError(
          'Secret integrity check failed',
          ErrorSeverity.CRITICAL,
          ErrorCategory.SECURITY,
          { secretId }
        );
        return null;
      }

      // Update access count
      secretEntry.metadata.accessCount++;
      secretEntry.metadata.updatedAt = new Date();

      logger.debug('Secret accessed', 'secret-manager', {
        secretId,
        accessCount: secretEntry.metadata.accessCount,
        requestContext
      });

      return decryptedValue;
    } catch (error) {
      await reportError(
        `Failed to retrieve secret: ${error}`,
        ErrorSeverity.HIGH,
        ErrorCategory.SECURITY,
        { secretId, requestContext }
      );
      return null;
    }
  }

  /**
   * Rotate a secret
   */
  async rotateSecret(secretId: string, newValue: string): Promise<boolean> {
    try {
      const secretEntry = this.secrets.get(secretId);
      if (!secretEntry) {
        logger.error('Cannot rotate non-existent secret', 'secret-manager', { secretId });
        return false;
      }

      // Keep previous value for rollback
      secretEntry.previousValue = secretEntry.value;
      
      // Update with new value
      secretEntry.value = await this.encrypt(newValue);
      secretEntry.checksum = await this.generateChecksum(newValue);
      secretEntry.metadata.updatedAt = new Date();
      secretEntry.metadata.lastRotated = new Date();

      logger.info('Secret rotated', 'secret-manager', {
        secretId,
        name: secretEntry.metadata.name,
        type: secretEntry.metadata.type
      });

      return true;
    } catch (error) {
      await reportError(
        `Failed to rotate secret: ${error}`,
        ErrorSeverity.HIGH,
        ErrorCategory.SECURITY,
        { secretId }
      );
      return false;
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string): Promise<boolean> {
    try {
      const secretEntry = this.secrets.get(secretId);
      if (!secretEntry) {
        return false;
      }

      // Clear rotation schedule
      const timeout = this.rotationSchedule.get(secretId);
      if (timeout) {
        clearTimeout(timeout);
        this.rotationSchedule.delete(secretId);
      }

      // Remove secret and policy
      this.secrets.delete(secretId);
      this.accessPolicies.delete(secretId);

      logger.info('Secret deleted', 'secret-manager', {
        secretId,
        name: secretEntry.metadata.name
      });

      return true;
    } catch (error) {
      await reportError(
        `Failed to delete secret: ${error}`,
        ErrorSeverity.MEDIUM,
        ErrorCategory.SECURITY,
        { secretId }
      );
      return false;
    }
  }

  /**
   * List secrets (metadata only)
   */
  listSecrets(filters?: {
    type?: SecretType;
    environment?: string;
    tags?: string[];
  }): SecretMetadata[] {
    const secrets = Array.from(this.secrets.values());
    
    return secrets
      .filter(secret => {
        if (filters?.type && secret.metadata.type !== filters.type) return false;
        if (filters?.environment && secret.metadata.environment !== filters.environment) return false;
        if (filters?.tags && !filters.tags.some(tag => secret.metadata.tags.includes(tag))) return false;
        return true;
      })
      .map(secret => secret.metadata);
  }

  /**
   * Get secret by name
   */
  async getSecretByName(name: string, environment?: string): Promise<string | null> {
    const targetEnv = environment || secureConfig.getEnvironmentType();
    
    for (const [secretId, secret] of this.secrets.entries()) {
      if (secret.metadata.name === name && secret.metadata.environment === targetEnv) {
        return this.getSecret(secretId);
      }
    }
    
    return null;
  }

  /**
   * Health check for secret manager
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    secretCount: number;
    expiringSoon: number;
    rotationDue: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let expiringSoon = 0;
    let rotationDue = 0;
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const secret of this.secrets.values()) {
      // Check for expiring secrets
      if (secret.metadata.expiresAt && secret.metadata.expiresAt < oneWeekFromNow) {
        expiringSoon++;
      }

      // Check for rotation due
      if (secret.metadata.rotationInterval && secret.metadata.lastRotated) {
        const nextRotation = new Date(
          secret.metadata.lastRotated.getTime() + 
          secret.metadata.rotationInterval * 24 * 60 * 60 * 1000
        );
        if (nextRotation < now) {
          rotationDue++;
        }
      }

      // Verify secret integrity
      try {
        const decrypted = await this.decrypt(secret.value);
        const isValid = await this.verifyChecksum(decrypted, secret.checksum);
        if (!isValid) {
          issues.push(`Secret ${secret.metadata.id} failed integrity check`);
        }
      } catch (error) {
        issues.push(`Secret ${secret.metadata.id} decryption failed`);
      }
    }

    const status = issues.length > 0 ? 'unhealthy' : 
                  (expiringSoon > 0 || rotationDue > 0) ? 'degraded' : 'healthy';

    return {
      status,
      secretCount: this.secrets.size,
      expiringSoon,
      rotationDue,
      issues
    };
  }

  /**
   * Private methods
   */
  private generateSecretId(): string {
    return `secret_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private deriveEncryptionKey(): string {
    // In production, this should come from a secure key management service
    const baseKey = secureConfig.getSecurityConfig().encryptionKey;
    return baseKey || 'default-encryption-key-change-in-production';
  }

  private async encrypt(value: string): Promise<string> {
    // Simple encryption for demo - use proper encryption in production
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const key = encoder.encode(this.encryptionKey.padEnd(32, '0').substring(0, 32));
    
    // XOR encryption (for demo only)
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length];
    }
    
    return btoa(String.fromCharCode(...encrypted));
  }

  private async decrypt(encryptedValue: string): Promise<string> {
    const encrypted = new Uint8Array(
      atob(encryptedValue).split('').map(char => char.charCodeAt(0))
    );
    
    const encoder = new TextEncoder();
    const key = encoder.encode(this.encryptionKey.padEnd(32, '0').substring(0, 32));
    
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ key[i % key.length];
    }
    
    return new TextDecoder().decode(decrypted);
  }

  private async generateChecksum(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyChecksum(value: string, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.generateChecksum(value);
    return actualChecksum === expectedChecksum;
  }

  private checkAccess(secretId: string, context?: {
    service?: string;
    environment?: string;
  }): boolean {
    const policy = this.accessPolicies.get(secretId);
    if (!policy) return true; // No policy means open access

    const currentEnv = context?.environment || secureConfig.getEnvironmentType();
    const currentService = context?.service || 'clinicboost';

    // Check environment
    if (!policy.allowedEnvironments.includes(currentEnv)) {
      return false;
    }

    // Check service
    if (!policy.allowedServices.includes(currentService)) {
      return false;
    }

    // Check access count limit
    const secret = this.secrets.get(secretId);
    if (policy.maxAccessCount && secret && secret.metadata.accessCount >= policy.maxAccessCount) {
      return false;
    }

    return true;
  }

  private scheduleRotation(secretId: string, intervalDays: number): void {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    
    const timeout = setTimeout(async () => {
      logger.info('Automatic secret rotation triggered', 'secret-manager', { secretId });
      
      // In production, this would generate a new secret value
      // For now, we just log that rotation is due
      await reportError(
        'Secret rotation required',
        ErrorSeverity.MEDIUM,
        ErrorCategory.SECURITY,
        { secretId, intervalDays }
      );
    }, intervalMs);

    this.rotationSchedule.set(secretId, timeout);
  }

  private initializeDefaultSecrets(): void {
    // Initialize with environment variables as secrets
    const envSecrets = [
      { name: 'JWT_SECRET', type: SecretType.JWT_SECRET, value: import.meta.env.VITE_JWT_SECRET },
      { name: 'STRIPE_SECRET', type: SecretType.API_KEY, value: import.meta.env.VITE_STRIPE_SECRET_KEY },
      { name: 'TWILIO_AUTH_TOKEN', type: SecretType.API_KEY, value: import.meta.env.VITE_TWILIO_AUTH_TOKEN }
    ];

    envSecrets.forEach(async (secret) => {
      if (secret.value) {
        await this.storeSecret(secret.name, secret.value, secret.type, {
          tags: ['environment', 'auto-imported']
        });
      }
    });
  }

  private setupRotationSchedule(): void {
    // Check for secrets that need rotation every hour
    setInterval(() => {
      this.checkRotationSchedule();
    }, 3600000); // 1 hour
  }

  private async checkRotationSchedule(): Promise<void> {
    const now = new Date();
    
    for (const secret of this.secrets.values()) {
      if (secret.metadata.rotationInterval && secret.metadata.lastRotated) {
        const nextRotation = new Date(
          secret.metadata.lastRotated.getTime() + 
          secret.metadata.rotationInterval * 24 * 60 * 60 * 1000
        );
        
        if (nextRotation < now) {
          logger.warn('Secret rotation overdue', 'secret-manager', {
            secretId: secret.metadata.id,
            name: secret.metadata.name,
            daysPastDue: Math.floor((now.getTime() - nextRotation.getTime()) / (24 * 60 * 60 * 1000))
          });
        }
      }
    }
  }
}

// Export singleton instance
export const secretManager = new SecretManager();

// Convenience functions
export const getSecret = secretManager.getSecret.bind(secretManager);
export const getSecretByName = secretManager.getSecretByName.bind(secretManager);
