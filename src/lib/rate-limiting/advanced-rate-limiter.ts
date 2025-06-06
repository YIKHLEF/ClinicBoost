/**
 * Advanced Rate Limiting System
 * 
 * This module provides comprehensive rate limiting for all third-party
 * integrations with configurable limits, burst handling, and monitoring.
 */

import { logger } from '../logging-monitoring';

// Rate limit configuration for different services
export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
  burstWindow?: number; // in milliseconds
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  requests: number[];
}

export class AdvancedRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private configs = new Map<string, RateLimitConfig>();
  private defaultConfig: RateLimitConfig = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 10,
    burstWindow: 1000,
  };

  /**
   * Configure rate limits for a specific service
   */
  configure(service: string, config: RateLimitConfig): void {
    this.configs.set(service, { ...this.defaultConfig, ...config });
    logger.info('Rate limit configured', service, { config });
  }

  /**
   * Check if request is allowed and update counters
   */
  checkLimit(service: string, identifier: string = 'default'): RateLimitStatus {
    const key = `${service}:${identifier}`;
    const config = this.configs.get(service) || this.defaultConfig;
    const bucket = this.getBucket(key, config);

    const now = Date.now();
    this.refillBucket(bucket, config, now);
    this.cleanupOldRequests(bucket, now);

    // Check burst limit first
    if (config.burstLimit && config.burstWindow) {
      const recentRequests = bucket.requests.filter(
        time => now - time < config.burstWindow!
      );
      
      if (recentRequests.length >= config.burstLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Math.min(...recentRequests) + config.burstWindow,
          retryAfter: config.burstWindow - (now - Math.max(...recentRequests)),
        };
      }
    }

    // Check token bucket (for sustained rate limiting)
    if (bucket.tokens < 1) {
      const resetTime = this.calculateResetTime(config, now);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: resetTime - now,
      };
    }

    // Allow request and consume token
    bucket.tokens -= 1;
    bucket.requests.push(now);

    const remaining = this.calculateRemaining(bucket, config, now);
    const resetTime = this.calculateResetTime(config, now);

    logger.debug('Rate limit check passed', service, {
      identifier,
      remaining,
      resetTime: new Date(resetTime).toISOString(),
    });

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  }

  /**
   * Get or create bucket for service/identifier combination
   */
  private getBucket(key: string, config: RateLimitConfig): RateLimitBucket {
    if (!this.buckets.has(key)) {
      const maxTokens = this.getMaxTokens(config);
      this.buckets.set(key, {
        tokens: maxTokens,
        lastRefill: Date.now(),
        requests: [],
      });
    }
    return this.buckets.get(key)!;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillBucket(bucket: RateLimitBucket, config: RateLimitConfig, now: number): void {
    const timeSinceRefill = now - bucket.lastRefill;
    const maxTokens = this.getMaxTokens(config);
    
    // Calculate refill rate (tokens per millisecond)
    let refillRate = 0;
    if (config.requestsPerSecond) {
      refillRate = config.requestsPerSecond / 1000;
    } else if (config.requestsPerMinute) {
      refillRate = config.requestsPerMinute / 60000;
    } else if (config.requestsPerHour) {
      refillRate = config.requestsPerHour / 3600000;
    }

    if (refillRate > 0) {
      const tokensToAdd = timeSinceRefill * refillRate;
      bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Get maximum tokens for bucket
   */
  private getMaxTokens(config: RateLimitConfig): number {
    if (config.requestsPerSecond) return config.requestsPerSecond;
    if (config.requestsPerMinute) return Math.ceil(config.requestsPerMinute / 60);
    if (config.requestsPerHour) return Math.ceil(config.requestsPerHour / 3600);
    return 10; // Default
  }

  /**
   * Calculate remaining requests
   */
  private calculateRemaining(bucket: RateLimitBucket, config: RateLimitConfig, now: number): number {
    const maxTokens = this.getMaxTokens(config);
    return Math.floor(bucket.tokens);
  }

  /**
   * Calculate when limits reset
   */
  private calculateResetTime(config: RateLimitConfig, now: number): number {
    if (config.requestsPerSecond) {
      return now + 1000;
    } else if (config.requestsPerMinute) {
      return now + (60000 - (now % 60000));
    } else if (config.requestsPerHour) {
      return now + (3600000 - (now % 3600000));
    } else if (config.requestsPerDay) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime();
    }
    return now + 60000; // Default to 1 minute
  }

  /**
   * Clean up old request timestamps
   */
  private cleanupOldRequests(bucket: RateLimitBucket, now: number): void {
    const cutoff = now - 3600000; // Keep last hour
    bucket.requests = bucket.requests.filter(time => time > cutoff);
  }

  /**
   * Get current status for a service
   */
  getStatus(service: string, identifier: string = 'default'): RateLimitStatus {
    const key = `${service}:${identifier}`;
    const config = this.configs.get(service) || this.defaultConfig;
    const bucket = this.buckets.get(key);

    if (!bucket) {
      const maxTokens = this.getMaxTokens(config);
      return {
        allowed: true,
        remaining: maxTokens,
        resetTime: this.calculateResetTime(config, Date.now()),
      };
    }

    const now = Date.now();
    this.refillBucket(bucket, config, now);

    return {
      allowed: bucket.tokens >= 1,
      remaining: Math.floor(bucket.tokens),
      resetTime: this.calculateResetTime(config, now),
    };
  }

  /**
   * Get statistics for all services
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [service, config] of this.configs.entries()) {
      const buckets = Array.from(this.buckets.entries())
        .filter(([key]) => key.startsWith(`${service}:`));
      
      stats[service] = {
        config,
        activeBuckets: buckets.length,
        totalRequests: buckets.reduce((sum, [_, bucket]) => sum + bucket.requests.length, 0),
      };
    }

    return stats;
  }

  /**
   * Reset limits for a service (useful for testing)
   */
  reset(service: string, identifier?: string): void {
    if (identifier) {
      const key = `${service}:${identifier}`;
      this.buckets.delete(key);
    } else {
      // Reset all buckets for service
      const keysToDelete = Array.from(this.buckets.keys())
        .filter(key => key.startsWith(`${service}:`));
      keysToDelete.forEach(key => this.buckets.delete(key));
    }
    
    logger.info('Rate limits reset', service, { identifier });
  }

  /**
   * Cleanup old buckets to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - 86400000; // 24 hours

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < cutoff && bucket.requests.length === 0) {
        this.buckets.delete(key);
      }
    }

    logger.debug('Rate limiter cleanup completed', 'rate-limiter', {
      activeBuckets: this.buckets.size,
    });
  }
}

// Service-specific rate limit configurations
export const SERVICE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'stripe': {
    requestsPerSecond: 25,
    requestsPerHour: 1000,
    burstLimit: 10,
    burstWindow: 1000,
  },
  'twilio-sms': {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    burstLimit: 3,
    burstWindow: 5000,
  },
  'twilio-whatsapp': {
    requestsPerMinute: 5,
    requestsPerHour: 50,
    burstLimit: 2,
    burstWindow: 10000,
  },
  'twilio-calls': {
    requestsPerMinute: 3,
    requestsPerHour: 20,
    burstLimit: 1,
    burstWindow: 30000,
  },
  'azure-ai': {
    requestsPerMinute: 20,
    requestsPerHour: 1000,
    requestsPerDay: 5000,
    burstLimit: 5,
    burstWindow: 1000,
  },
  'file-upload': {
    requestsPerMinute: 30,
    requestsPerHour: 200,
    burstLimit: 5,
    burstWindow: 2000,
  },
};

// Export singleton instance
export const rateLimiter = new AdvancedRateLimiter();

// Initialize with service configurations
Object.entries(SERVICE_RATE_LIMITS).forEach(([service, config]) => {
  rateLimiter.configure(service, config);
});

// Export convenience functions
export const checkRateLimit = (service: string, identifier?: string) =>
  rateLimiter.checkLimit(service, identifier);

export const getRateLimitStatus = (service: string, identifier?: string) =>
  rateLimiter.getStatus(service, identifier);

export const getRateLimitStats = () => rateLimiter.getStats();

export const resetRateLimit = (service: string, identifier?: string) =>
  rateLimiter.reset(service, identifier);

// Cleanup interval (run every hour)
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 3600000);
}
