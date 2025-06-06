/**
 * Enhanced Network Error Handling
 * 
 * Provides comprehensive error handling for network timeouts,
 * connection issues, and offline scenarios with intelligent retry logic.
 */

import { logger } from '../logging-monitoring';

export interface NetworkConfig {
  timeouts: {
    default: number;
    upload: number;
    download: number;
    api: number;
  };
  retries: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffTime: number;
    retryableStatusCodes: number[];
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
    monitoringWindow: number;
  };
  offline: {
    detectionInterval: number;
    syncRetryInterval: number;
    maxOfflineOperations: number;
  };
}

export interface NetworkError {
  code: string;
  message: string;
  type: 'timeout' | 'connection' | 'server' | 'client' | 'offline';
  retryable: boolean;
  retryAfter?: number;
  details?: any;
  timestamp: Date;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: NetworkError;
  backoffTime: number;
  totalElapsed: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

export class EnhancedNetworkHandler {
  private config: NetworkConfig;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private offlineQueue: Array<{ operation: () => Promise<any>; resolve: Function; reject: Function }> = [];
  private isOnline = navigator.onLine;
  private onlineCheckInterval?: NodeJS.Timeout;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.setupOnlineDetection();
  }

  /**
   * Enhanced fetch with comprehensive error handling
   */
  async enhancedFetch(
    url: string,
    options: RequestInit & {
      timeout?: number;
      retries?: number;
      circuitBreakerKey?: string;
      offlineQueueable?: boolean;
    } = {}
  ): Promise<Response> {
    const {
      timeout = this.config.timeouts.default,
      retries = this.config.retries.maxAttempts,
      circuitBreakerKey = url,
      offlineQueueable = true,
      ...fetchOptions
    } = options;

    // Check circuit breaker
    if (this.config.circuitBreaker.enabled) {
      const breakerState = this.getCircuitBreakerState(circuitBreakerKey);
      if (breakerState.state === 'open') {
        throw this.createNetworkError('CIRCUIT_BREAKER_OPEN', 'Circuit breaker is open', 'server', false);
      }
    }

    // Check if offline and queueable
    if (!this.isOnline && offlineQueueable) {
      return this.queueOfflineOperation(() => this.enhancedFetch(url, options));
    }

    return this.executeWithRetry(
      () => this.fetchWithTimeout(url, fetchOptions, timeout),
      retries,
      circuitBreakerKey
    );
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    circuitBreakerKey?: string
  ): Promise<T> {
    let lastError: NetworkError;
    let backoffTime = 1000; // Start with 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        if (circuitBreakerKey && this.config.circuitBreaker.enabled) {
          this.resetCircuitBreaker(circuitBreakerKey);
        }
        
        return result;

      } catch (error) {
        lastError = this.parseNetworkError(error);
        
        // Update circuit breaker
        if (circuitBreakerKey && this.config.circuitBreaker.enabled) {
          this.updateCircuitBreaker(circuitBreakerKey, lastError);
        }

        // Don't retry if not retryable or last attempt
        if (!lastError.retryable || attempt === maxRetries) {
          break;
        }

        // Calculate backoff time
        const jitter = Math.random() * 0.1; // Add 10% jitter
        const delay = Math.min(
          backoffTime * (1 + jitter),
          this.config.retries.maxBackoffTime
        );

        logger.warn('Network operation failed, retrying', 'enhanced-network-handler', {
          attempt,
          maxRetries,
          error: lastError.message,
          retryAfter: delay,
        });

        await this.delay(delay);
        backoffTime *= this.config.retries.backoffMultiplier;
      }
    }

    throw lastError!;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        throw this.createHttpError(response);
      }

      return response;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createNetworkError('TIMEOUT', `Request timeout after ${timeoutMs}ms`, 'timeout', true);
      }

      throw error;
    }
  }

  /**
   * Parse network errors
   */
  private parseNetworkError(error: any): NetworkError {
    if (error instanceof NetworkError) {
      return error;
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return this.createNetworkError('TIMEOUT', error.message || 'Request timeout', 'timeout', true);
    }

    // Connection errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return this.createNetworkError('CONNECTION_ERROR', 'Network connection failed', 'connection', true);
    }

    // HTTP errors
    if (error.status) {
      const isRetryable = this.config.retries.retryableStatusCodes.includes(error.status);
      return this.createNetworkError(
        `HTTP_${error.status}`,
        error.message || `HTTP ${error.status}`,
        error.status >= 500 ? 'server' : 'client',
        isRetryable
      );
    }

    // Generic network error
    return this.createNetworkError(
      'NETWORK_ERROR',
      error.message || 'Unknown network error',
      'connection',
      true
    );
  }

  /**
   * Create network error
   */
  private createNetworkError(
    code: string,
    message: string,
    type: NetworkError['type'],
    retryable: boolean,
    retryAfter?: number
  ): NetworkError {
    return {
      code,
      message,
      type,
      retryable,
      retryAfter,
      timestamp: new Date(),
    };
  }

  /**
   * Create HTTP error from response
   */
  private createHttpError(response: Response): NetworkError {
    const isRetryable = this.config.retries.retryableStatusCodes.includes(response.status);
    const retryAfter = response.headers.get('Retry-After');
    
    return this.createNetworkError(
      `HTTP_${response.status}`,
      `HTTP ${response.status}: ${response.statusText}`,
      response.status >= 500 ? 'server' : 'client',
      isRetryable,
      retryAfter ? parseInt(retryAfter) * 1000 : undefined
    );
  }

  /**
   * Circuit breaker management
   */
  private getCircuitBreakerState(key: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        state: 'closed',
        failureCount: 0,
      });
    }
    return this.circuitBreakers.get(key)!;
  }

  private updateCircuitBreaker(key: string, error: NetworkError): void {
    const state = this.getCircuitBreakerState(key);
    
    if (error.type === 'server' || error.type === 'timeout') {
      state.failureCount++;
      state.lastFailureTime = new Date();

      if (state.failureCount >= this.config.circuitBreaker.failureThreshold) {
        state.state = 'open';
        state.nextAttemptTime = new Date(Date.now() + this.config.circuitBreaker.resetTimeout);
        
        logger.warn('Circuit breaker opened', 'enhanced-network-handler', {
          key,
          failureCount: state.failureCount,
          nextAttemptTime: state.nextAttemptTime,
        });
      }
    }
  }

  private resetCircuitBreaker(key: string): void {
    const state = this.getCircuitBreakerState(key);
    if (state.state !== 'closed') {
      state.state = 'closed';
      state.failureCount = 0;
      state.lastFailureTime = undefined;
      state.nextAttemptTime = undefined;
      
      logger.info('Circuit breaker reset', 'enhanced-network-handler', { key });
    }
  }

  /**
   * Offline operation queueing
   */
  private async queueOfflineOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.offlineQueue.length >= this.config.offline.maxOfflineOperations) {
        reject(this.createNetworkError(
          'OFFLINE_QUEUE_FULL',
          'Offline operation queue is full',
          'offline',
          false
        ));
        return;
      }

      this.offlineQueue.push({ operation, resolve, reject });
      
      logger.info('Operation queued for offline processing', 'enhanced-network-handler', {
        queueSize: this.offlineQueue.length,
      });
    });
  }

  /**
   * Process offline queue when back online
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    logger.info('Processing offline queue', 'enhanced-network-handler', {
      queueSize: this.offlineQueue.length,
    });

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const { operation, resolve, reject } of queue) {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  /**
   * Online/offline detection
   */
  private setupOnlineDetection(): void {
    // Listen to browser online/offline events
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });

    // Periodic connectivity check
    this.onlineCheckInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.config.offline.detectionInterval);
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      
      logger.info('Network status changed', 'enhanced-network-handler', { isOnline });

      if (isOnline) {
        // Process offline queue when back online
        this.processOfflineQueue();
      }
    }
  }

  private async checkConnectivity(): Promise<void> {
    try {
      // Simple connectivity check
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      this.handleOnlineStatusChange(response.ok);
    } catch {
      this.handleOnlineStatusChange(false);
    }
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(): {
    circuitBreakers: Array<{ key: string; state: CircuitBreakerState }>;
    offlineQueueSize: number;
    isOnline: boolean;
  } {
    return {
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([key, state]) => ({ key, state })),
      offlineQueueSize: this.offlineQueue.length,
      isOnline: this.isOnline,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.onlineCheckInterval) {
      clearInterval(this.onlineCheckInterval);
    }
  }
}
