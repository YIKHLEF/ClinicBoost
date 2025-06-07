/**
 * Distributed Rate Limiter for ClinicBoost
 * Implements distributed rate limiting using Redis or in-memory fallback
 */

import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

// Rate limit configuration interface
export interface DistributedRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any) => void;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Rate limit result interface
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retryAfter?: number;
}

// Rate limit entry for storage
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Redis-like interface for storage backends
interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}

// In-memory storage implementation
class MemoryStorage implements StorageBackend {
  private store = new Map<string, { value: string; expiry?: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiry = ttlMs ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiry });
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current) + 1 : 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiry = Date.now() + ttlMs;
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Redis storage implementation (when Redis is available)
class RedisStorage implements StorageBackend {
  private redis: any; // Redis client

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      logger.error('Redis get error', 'distributed-rate-limiter', { error, key });
      throw error;
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    try {
      if (ttlMs) {
        await this.redis.setex(key, Math.ceil(ttlMs / 1000), value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set error', 'distributed-rate-limiter', { error, key });
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.error('Redis incr error', 'distributed-rate-limiter', { error, key });
      throw error;
    }
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    try {
      await this.redis.expire(key, Math.ceil(ttlMs / 1000));
    } catch (error) {
      logger.error('Redis expire error', 'distributed-rate-limiter', { error, key });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis del error', 'distributed-rate-limiter', { error, key });
      throw error;
    }
  }
}

export class DistributedRateLimiter {
  private storage: StorageBackend;
  private config: Required<DistributedRateLimitConfig>;
  private keyPrefix: string;

  constructor(
    config: DistributedRateLimitConfig,
    redisClient?: any,
    keyPrefix: string = 'rate_limit:'
  ) {
    this.config = {
      keyGenerator: (req) => this.getDefaultKey(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: () => {},
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      ...config,
    };

    this.keyPrefix = keyPrefix;
    
    // Use Redis if available, otherwise fallback to memory
    if (redisClient) {
      this.storage = new RedisStorage(redisClient);
      logger.info('Distributed rate limiter using Redis backend', 'distributed-rate-limiter');
    } else {
      this.storage = new MemoryStorage();
      logger.warn('Distributed rate limiter using memory backend (not suitable for production clusters)', 'distributed-rate-limiter');
    }
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(req: any): Promise<RateLimitResult> {
    try {
      const key = this.keyPrefix + this.config.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Get current count
      const currentData = await this.storage.get(key);
      let entry: RateLimitEntry;

      if (currentData) {
        entry = JSON.parse(currentData);
        
        // Check if window has expired
        if (entry.resetTime <= now) {
          entry = {
            count: 1,
            resetTime: now + this.config.windowMs,
            firstRequest: now,
          };
        } else {
          entry.count++;
        }
      } else {
        entry = {
          count: 1,
          resetTime: now + this.config.windowMs,
          firstRequest: now,
        };
      }

      // Store updated entry
      await this.storage.set(
        key,
        JSON.stringify(entry),
        this.config.windowMs
      );

      const remaining = Math.max(0, this.config.maxRequests - entry.count);
      const allowed = entry.count <= this.config.maxRequests;

      if (!allowed) {
        this.config.onLimitReached(req);
        
        logger.warn('Rate limit exceeded', 'distributed-rate-limiter', {
          key: key.replace(this.keyPrefix, ''),
          count: entry.count,
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs,
          ip: this.getClientIP(req),
        });
      }

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
        totalHits: entry.count,
        retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
      };
    } catch (error) {
      logger.error('Rate limit check failed', 'distributed-rate-limiter', { error });
      handleError(error as Error, 'distributed-rate-limiter');
      
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
        totalHits: 0,
      };
    }
  }

  /**
   * Create Express middleware
   */
  createMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const result = await this.checkLimit(req);

        // Set rate limit headers
        if (this.config.standardHeaders) {
          res.set({
            'RateLimit-Limit': this.config.maxRequests.toString(),
            'RateLimit-Remaining': result.remaining.toString(),
            'RateLimit-Reset': new Date(result.resetTime).toISOString(),
          });
        }

        if (this.config.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
          });
        }

        if (!result.allowed) {
          if (result.retryAfter) {
            res.set('Retry-After', result.retryAfter.toString());
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: this.config.message,
            retryAfter: result.retryAfter,
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiter middleware error', 'distributed-rate-limiter', { error });
        // Fail open - continue with request
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(req: any): Promise<void> {
    try {
      const key = this.keyPrefix + this.config.keyGenerator(req);
      await this.storage.del(key);
      
      logger.info('Rate limit reset', 'distributed-rate-limiter', {
        key: key.replace(this.keyPrefix, ''),
      });
    } catch (error) {
      logger.error('Rate limit reset failed', 'distributed-rate-limiter', { error });
      throw error;
    }
  }

  /**
   * Get rate limit status without incrementing
   */
  async getStatus(req: any): Promise<RateLimitResult | null> {
    try {
      const key = this.keyPrefix + this.config.keyGenerator(req);
      const currentData = await this.storage.get(key);

      if (!currentData) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: Date.now() + this.config.windowMs,
          totalHits: 0,
        };
      }

      const entry: RateLimitEntry = JSON.parse(currentData);
      const now = Date.now();

      if (entry.resetTime <= now) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: now + this.config.windowMs,
          totalHits: 0,
        };
      }

      const remaining = Math.max(0, this.config.maxRequests - entry.count);
      const allowed = entry.count < this.config.maxRequests;

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
        totalHits: entry.count,
        retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
      };
    } catch (error) {
      logger.error('Get rate limit status failed', 'distributed-rate-limiter', { error });
      return null;
    }
  }

  private getDefaultKey(req: any): string {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const userId = req.user?.id || '';
    
    // Create a composite key for better rate limiting
    return `${ip}:${userId}:${Buffer.from(userAgent).toString('base64').substring(0, 10)}`;
  }

  private getClientIP(req: any): string {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      'unknown'
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.storage instanceof MemoryStorage) {
      this.storage.destroy();
    }
  }
}

// Rate limit presets for different use cases
export const DistributedRateLimitPresets = {
  strict: { windowMs: 15 * 60 * 1000, maxRequests: 50 }, // 50 requests per 15 minutes
  moderate: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  lenient: { windowMs: 15 * 60 * 1000, maxRequests: 200 }, // 200 requests per 15 minutes
  api: { windowMs: 1 * 60 * 1000, maxRequests: 60 }, // 60 API calls per minute
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 minutes
  webhook: { windowMs: 1 * 60 * 1000, maxRequests: 1000 }, // 1000 webhook calls per minute
  upload: { windowMs: 1 * 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
};

// Factory function to create rate limiters
export function createDistributedRateLimiter(
  preset: keyof typeof DistributedRateLimitPresets,
  customConfig?: Partial<DistributedRateLimitConfig>,
  redisClient?: any
): DistributedRateLimiter {
  const config = {
    ...DistributedRateLimitPresets[preset],
    ...customConfig,
  };

  return new DistributedRateLimiter(config, redisClient);
}

// Export default instance for common use
export const defaultDistributedRateLimiter = createDistributedRateLimiter('moderate');
