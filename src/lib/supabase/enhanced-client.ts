/**
 * Enhanced Supabase Client with Network Timeout Handling
 * 
 * Provides comprehensive error handling for Supabase operations including
 * network timeouts, connection issues, and offline scenarios.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { EnhancedNetworkHandler } from '../error-handling/enhanced-network-handling';

export interface SupabaseConfig {
  timeouts: {
    query: number;
    mutation: number;
    realtime: number;
    auth: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
}

const DEFAULT_CONFIG: SupabaseConfig = {
  timeouts: {
    query: 30000,      // 30 seconds for queries
    mutation: 45000,   // 45 seconds for mutations
    realtime: 60000,   // 60 seconds for realtime
    auth: 15000,       // 15 seconds for auth
  },
  retries: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 30000,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000,
  },
};

export class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  private networkHandler: EnhancedNetworkHandler;
  private config: SupabaseConfig;

  constructor(config: Partial<SupabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const appConfig = secureConfig.getConfig();
    this.client = createClient<Database>(
      appConfig.supabase.url,
      appConfig.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );

    this.networkHandler = new EnhancedNetworkHandler({
      timeouts: {
        default: this.config.timeouts.query,
        upload: 300000,
        download: 120000,
        api: this.config.timeouts.query,
      },
      retries: {
        maxAttempts: this.config.retries.maxAttempts,
        backoffMultiplier: this.config.retries.backoffMultiplier,
        maxBackoffTime: this.config.retries.maxBackoffTime,
        retryableStatusCodes: [500, 502, 503, 504, 408],
      },
      circuitBreaker: this.config.circuitBreaker,
      offline: {
        detectionInterval: 30000,
        syncRetryInterval: 60000,
        maxOfflineOperations: 100,
      },
    });
  }

  /**
   * Enhanced query with timeout and retry logic
   */
  async query<T = any>(
    table: string,
    operation: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>,
    options: {
      timeout?: number;
      retries?: number;
      circuitBreakerKey?: string;
    } = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      timeout = this.config.timeouts.query,
      retries = this.config.retries.maxAttempts,
      circuitBreakerKey = `supabase-${table}`,
    } = options;

    return this.executeWithTimeout(
      () => operation(this.client),
      timeout,
      retries,
      circuitBreakerKey,
      'query'
    );
  }

  /**
   * Enhanced mutation with timeout and retry logic
   */
  async mutate<T = any>(
    table: string,
    operation: (client: SupabaseClient<Database>) => Promise<{ data: T | null; error: any }>,
    options: {
      timeout?: number;
      retries?: number;
      circuitBreakerKey?: string;
    } = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      timeout = this.config.timeouts.mutation,
      retries = this.config.retries.maxAttempts,
      circuitBreakerKey = `supabase-${table}-mutation`,
    } = options;

    return this.executeWithTimeout(
      () => operation(this.client),
      timeout,
      retries,
      circuitBreakerKey,
      'mutation'
    );
  }

  /**
   * Enhanced auth operations with timeout
   */
  async auth<T = any>(
    operation: (client: SupabaseClient<Database>) => Promise<T>,
    options: {
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    const {
      timeout = this.config.timeouts.auth,
      retries = this.config.retries.maxAttempts,
    } = options;

    return this.executeWithTimeout(
      () => operation(this.client),
      timeout,
      retries,
      'supabase-auth',
      'auth'
    );
  }

  /**
   * Execute operation with timeout and retry logic
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    maxRetries: number,
    circuitBreakerKey: string,
    operationType: string
  ): Promise<T> {
    let lastError: any;
    let backoffTime = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Supabase ${operationType} timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        // Race between operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);

        logger.info(`Supabase ${operationType} successful`, 'enhanced-supabase', {
          attempt: attempt + 1,
          circuitBreakerKey
        });

        return result;

      } catch (error) {
        lastError = error;
        
        logger.warn(`Supabase ${operationType} failed`, 'enhanced-supabase', {
          attempt: attempt + 1,
          maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
          circuitBreakerKey
        });

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate backoff time with jitter
        const jitter = Math.random() * 0.1;
        const delay = Math.min(
          backoffTime * (1 + jitter),
          this.config.retries.maxBackoffTime
        );

        await this.delay(delay);
        backoffTime *= this.config.retries.backoffMultiplier;
      }
    }

    logger.error(`Supabase ${operationType} failed after all retries`, 'enhanced-supabase', {
      maxRetries,
      error: lastError,
      circuitBreakerKey
    });

    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Don't retry on authentication errors
      if (message.includes('unauthorized') || message.includes('forbidden')) {
        return true;
      }
      
      // Don't retry on validation errors
      if (message.includes('invalid') || message.includes('bad request')) {
        return true;
      }
      
      // Don't retry on not found errors
      if (message.includes('not found')) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics() {
    return this.networkHandler.getNetworkStatistics();
  }
}

// Create singleton instance
export const enhancedSupabase = new EnhancedSupabaseClient();

// Export convenience methods
export const supabaseQuery = enhancedSupabase.query.bind(enhancedSupabase);
export const supabaseMutate = enhancedSupabase.mutate.bind(enhancedSupabase);
export const supabaseAuth = enhancedSupabase.auth.bind(enhancedSupabase);
