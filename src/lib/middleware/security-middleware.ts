/**
 * Security Middleware for ClinicBoost
 * Implements comprehensive security measures including rate limiting,
 * input validation, CSRF protection, and security headers
 */

import { z } from 'zod';
import { secureConfig } from '../config/secure-config';
import { logger } from '../logging-monitoring';
import { handleError } from '../error-handling';

// Rate limiting store
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any) => void;
}

export class SecurityMiddleware {
  private rateLimitStore = new RateLimitStore();
  private csrfTokens = new Set<string>();

  /**
   * Rate limiting middleware
   */
  createRateLimiter(config: RateLimitConfig) {
    return (req: any, res: any, next: any) => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : this.getClientKey(req);
        const now = Date.now();
        const windowStart = now - config.windowMs;

        let entry = this.rateLimitStore.get(key);
        
        if (!entry || entry.resetTime < now) {
          entry = {
            count: 1,
            resetTime: now + config.windowMs,
            blocked: false
          };
        } else {
          entry.count++;
        }

        // Check if limit exceeded
        if (entry.count > config.maxRequests) {
          entry.blocked = true;
          this.rateLimitStore.set(key, entry);

          if (config.onLimitReached) {
            config.onLimitReached(req);
          }

          logger.warn('Rate limit exceeded', 'security', {
            key,
            count: entry.count,
            limit: config.maxRequests,
            ip: this.getClientIP(req)
          });

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          });
        }

        this.rateLimitStore.set(key, entry);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

        next();
      } catch (error) {
        logger.error('Rate limiting error', 'security', { error });
        next(); // Continue on error to avoid blocking legitimate requests
      }
    };
  }

  /**
   * Input validation middleware
   */
  validateInput(schema: z.ZodSchema) {
    return (req: any, res: any, next: any) => {
      try {
        const result = schema.safeParse(req.body);
        
        if (!result.success) {
          logger.warn('Input validation failed', 'security', {
            errors: result.error.errors,
            path: req.path,
            ip: this.getClientIP(req)
          });

          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }

        req.validatedBody = result.data;
        next();
      } catch (error) {
        logger.error('Input validation error', 'security', { error });
        next(error);
      }
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return (req: any, res: any, next: any) => {
      try {
        // Skip CSRF for GET, HEAD, OPTIONS
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        const token = req.headers['x-csrf-token'] || req.body._csrf;
        
        if (!token) {
          logger.warn('CSRF token missing', 'security', {
            path: req.path,
            method: req.method,
            ip: this.getClientIP(req)
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'CSRF token required'
          });
        }

        if (!this.csrfTokens.has(token)) {
          logger.warn('Invalid CSRF token', 'security', {
            path: req.path,
            method: req.method,
            ip: this.getClientIP(req),
            token: token.substring(0, 8) + '...'
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid CSRF token'
          });
        }

        // Remove token after use (single-use tokens)
        this.csrfTokens.delete(token);
        next();
      } catch (error) {
        logger.error('CSRF protection error', 'security', { error });
        next(error);
      }
    };
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(): string {
    const token = this.generateSecureToken();
    this.csrfTokens.add(token);
    
    // Auto-expire tokens after 1 hour
    setTimeout(() => {
      this.csrfTokens.delete(token);
    }, 3600000);

    return token;
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return (req: any, res: any, next: any) => {
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co; " +
        "frame-src https://js.stripe.com;"
      );

      // Other security headers
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      next();
    };
  }

  /**
   * Request sanitization middleware
   */
  sanitizeRequest() {
    return (req: any, res: any, next: any) => {
      try {
        // Sanitize query parameters
        if (req.query) {
          req.query = this.sanitizeObject(req.query);
        }

        // Sanitize request body
        if (req.body) {
          req.body = this.sanitizeObject(req.body);
        }

        next();
      } catch (error) {
        logger.error('Request sanitization error', 'security', { error });
        next(error);
      }
    };
  }

  /**
   * Helper methods
   */
  private getClientKey(req: any): string {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    return `${ip}:${userAgent}`;
  }

  private getClientIP(req: any): string {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key);
      sanitized[sanitizedKey] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  private sanitizeString(str: any): any {
    if (typeof str !== 'string') {
      return str;
    }

    // Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.rateLimitStore.destroy();
    this.csrfTokens.clear();
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export rate limiting presets
export const RateLimitPresets = {
  strict: { windowMs: 15 * 60 * 1000, maxRequests: 50 }, // 50 requests per 15 minutes
  moderate: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  lenient: { windowMs: 15 * 60 * 1000, maxRequests: 200 }, // 200 requests per 15 minutes
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 minutes
  api: { windowMs: 1 * 60 * 1000, maxRequests: 60 }, // 60 API calls per minute
};
