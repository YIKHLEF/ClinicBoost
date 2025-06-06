/**
 * API Middleware Integration for ClinicBoost
 * Integrates all security, performance, and monitoring middleware
 */

import { securityMiddleware, RateLimitPresets } from '../middleware/security-middleware';
import { apiCache, queryCache } from '../performance/cache-manager';
import { errorReporting, ErrorSeverity, ErrorCategory } from '../monitoring/error-reporting';
import { logger } from '../logging-monitoring';
import { secureConfig } from '../config/secure-config';
import { z } from 'zod';

// Request context interface
interface RequestContext {
  id: string;
  startTime: number;
  ip: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
}

// Middleware configuration
interface MiddlewareConfig {
  security: {
    rateLimiting: boolean;
    inputValidation: boolean;
    csrfProtection: boolean;
    securityHeaders: boolean;
    requestSanitization: boolean;
  };
  performance: {
    caching: boolean;
    compression: boolean;
    monitoring: boolean;
  };
  logging: {
    requests: boolean;
    errors: boolean;
    performance: boolean;
  };
}

export class APIMiddlewareManager {
  private config: MiddlewareConfig;
  private activeRequests = new Map<string, RequestContext>();

  constructor() {
    this.config = this.initializeConfig();
  }

  /**
   * Create comprehensive API middleware stack
   */
  createMiddlewareStack() {
    const middlewares: Array<(req: any, res: any, next: any) => void> = [];

    // Request context middleware (always first)
    middlewares.push(this.createRequestContext());

    // Security middlewares
    if (this.config.security.securityHeaders) {
      middlewares.push(securityMiddleware.securityHeaders());
    }

    if (this.config.security.requestSanitization) {
      middlewares.push(securityMiddleware.sanitizeRequest());
    }

    if (this.config.security.rateLimiting) {
      middlewares.push(this.createRateLimitingMiddleware());
    }

    if (this.config.security.csrfProtection) {
      middlewares.push(securityMiddleware.csrfProtection());
    }

    // Performance middlewares
    if (this.config.performance.caching) {
      middlewares.push(this.createCachingMiddleware());
    }

    if (this.config.performance.compression) {
      middlewares.push(this.createCompressionMiddleware());
    }

    // Logging middleware
    if (this.config.logging.requests) {
      middlewares.push(this.createRequestLoggingMiddleware());
    }

    // Error handling middleware (always last)
    middlewares.push(this.createErrorHandlingMiddleware());

    return middlewares;
  }

  /**
   * Create input validation middleware for specific schemas
   */
  createValidationMiddleware(schemas: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  }) {
    return (req: any, res: any, next: any) => {
      try {
        const errors: any[] = [];

        // Validate body
        if (schemas.body && req.body) {
          const result = schemas.body.safeParse(req.body);
          if (!result.success) {
            errors.push(...result.error.errors.map(err => ({
              field: `body.${err.path.join('.')}`,
              message: err.message
            })));
          } else {
            req.validatedBody = result.data;
          }
        }

        // Validate query
        if (schemas.query && req.query) {
          const result = schemas.query.safeParse(req.query);
          if (!result.success) {
            errors.push(...result.error.errors.map(err => ({
              field: `query.${err.path.join('.')}`,
              message: err.message
            })));
          } else {
            req.validatedQuery = result.data;
          }
        }

        // Validate params
        if (schemas.params && req.params) {
          const result = schemas.params.safeParse(req.params);
          if (!result.success) {
            errors.push(...result.error.errors.map(err => ({
              field: `params.${err.path.join('.')}`,
              message: err.message
            })));
          } else {
            req.validatedParams = result.data;
          }
        }

        if (errors.length > 0) {
          logger.warn('Input validation failed', 'api-middleware', {
            endpoint: req.path,
            errors,
            requestId: req.requestId
          });

          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: errors
          });
        }

        next();
      } catch (error) {
        logger.error('Validation middleware error', 'api-middleware', { error });
        next(error);
      }
    };
  }

  /**
   * Create authentication middleware
   */
  createAuthenticationMiddleware(options?: {
    required?: boolean;
    roles?: string[];
  }) {
    return async (req: any, res: any, next: any) => {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          if (options?.required !== false) {
            return res.status(401).json({
              error: 'Unauthorized',
              message: 'Authentication token required'
            });
          }
          return next();
        }

        // Verify token (implementation depends on auth system)
        const user = await this.verifyAuthToken(token);
        
        if (!user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid authentication token'
          });
        }

        // Check roles if specified
        if (options?.roles && !options.roles.includes(user.role)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions'
          });
        }

        req.user = user;
        req.userId = user.id;
        next();
      } catch (error) {
        logger.error('Authentication middleware error', 'api-middleware', { error });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication failed'
        });
      }
    };
  }

  /**
   * Create database query optimization middleware
   */
  createQueryOptimizationMiddleware() {
    return (req: any, res: any, next: any) => {
      // Add query optimization helpers to request
      req.queryCache = {
        get: (key: string) => queryCache.get(key),
        set: (key: string, data: any, ttl?: number) => queryCache.set(key, data, { ttl }),
        invalidate: (table: string) => queryCache.invalidateTable(table)
      };

      // Override res.json to cache responses
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache successful responses
        if (res.statusCode === 200 && req.method === 'GET') {
          const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
          apiCache.set(cacheKey, data, { ttl: 300000 }); // 5 minutes
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Get middleware statistics
   */
  getMiddlewareStats() {
    return {
      activeRequests: this.activeRequests.size,
      cacheStats: apiCache.getStats(),
      queryCacheStats: queryCache.getStats(),
      errorStats: errorReporting.getErrorStats(),
      config: this.config
    };
  }

  /**
   * Private methods
   */
  private initializeConfig(): MiddlewareConfig {
    const isProduction = secureConfig.isProduction();
    
    return {
      security: {
        rateLimiting: import.meta.env.VITE_ENABLE_RATE_LIMITING === 'true',
        inputValidation: import.meta.env.VITE_ENABLE_INPUT_VALIDATION === 'true',
        csrfProtection: import.meta.env.VITE_ENABLE_CSRF_PROTECTION === 'true',
        securityHeaders: import.meta.env.VITE_ENABLE_SECURITY_HEADERS === 'true',
        requestSanitization: true
      },
      performance: {
        caching: import.meta.env.VITE_ENABLE_API_CACHING === 'true',
        compression: import.meta.env.VITE_ENABLE_COMPRESSION === 'true',
        monitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true'
      },
      logging: {
        requests: true,
        errors: true,
        performance: isProduction
      }
    };
  }

  private createRequestContext() {
    return (req: any, res: any, next: any) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const context: RequestContext = {
        id: requestId,
        startTime: Date.now(),
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || '',
        endpoint: req.path,
        method: req.method
      };

      req.requestId = requestId;
      req.context = context;
      this.activeRequests.set(requestId, context);

      // Clean up on response finish
      res.on('finish', () => {
        this.activeRequests.delete(requestId);
      });

      next();
    };
  }

  private createRateLimitingMiddleware() {
    // Different rate limits for different endpoints
    const apiLimiter = securityMiddleware.createRateLimiter({
      ...RateLimitPresets.api,
      keyGenerator: (req) => `api:${req.context.ip}:${req.context.userAgent}`,
      onLimitReached: (req) => {
        logger.warn('API rate limit exceeded', 'api-middleware', {
          ip: req.context.ip,
          endpoint: req.path,
          requestId: req.requestId
        });
      }
    });

    const loginLimiter = securityMiddleware.createRateLimiter({
      ...RateLimitPresets.login,
      keyGenerator: (req) => `login:${req.context.ip}`,
      onLimitReached: (req) => {
        errorReporting.reportError(
          'Excessive login attempts detected',
          ErrorSeverity.HIGH,
          ErrorCategory.SECURITY,
          {
            ip: req.context.ip,
            userAgent: req.context.userAgent,
            requestId: req.requestId
          }
        );
      }
    });

    return (req: any, res: any, next: any) => {
      if (req.path.includes('/auth/login')) {
        return loginLimiter(req, res, next);
      } else if (req.path.startsWith('/api/')) {
        return apiLimiter(req, res, next);
      }
      next();
    };
  }

  private createCachingMiddleware() {
    return (req: any, res: any, next: any) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      const cached = apiCache.get(cacheKey);

      if (cached) {
        logger.debug('Cache hit', 'api-middleware', { 
          cacheKey, 
          requestId: req.requestId 
        });
        
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }

      res.setHeader('X-Cache', 'MISS');
      next();
    };
  }

  private createCompressionMiddleware() {
    return (req: any, res: any, next: any) => {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      if (acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
      }
      
      next();
    };
  }

  private createRequestLoggingMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.context.ip,
          userAgent: req.context.userAgent,
          userId: req.userId
        };

        if (res.statusCode >= 400) {
          logger.warn('Request completed with error', 'api-middleware', logData);
        } else {
          logger.info('Request completed', 'api-middleware', logData);
        }

        // Report slow requests
        if (duration > 2000) {
          errorReporting.reportPerformanceIssue(
            'slow_request',
            duration,
            2000,
            logData
          );
        }
      });

      next();
    };
  }

  private createErrorHandlingMiddleware() {
    return (error: any, req: any, res: any, next: any) => {
      const errorId = errorReporting.reportError(
        error,
        ErrorSeverity.HIGH,
        ErrorCategory.SYSTEM,
        {
          requestId: req.requestId,
          userId: req.userId,
          ip: req.context?.ip,
          userAgent: req.context?.userAgent,
          url: req.path,
          method: req.method
        }
      );

      logger.error('Unhandled error in API', 'api-middleware', {
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
        errorId
      });

      // Don't expose internal errors in production
      const isProduction = secureConfig.isProduction();
      const errorResponse = {
        error: 'Internal Server Error',
        message: isProduction ? 'An unexpected error occurred' : error.message,
        requestId: req.requestId,
        ...(isProduction ? {} : { stack: error.stack })
      };

      res.status(500).json(errorResponse);
    };
  }

  private async verifyAuthToken(token: string): Promise<any> {
    // Mock implementation - replace with actual auth verification
    try {
      // In production, verify JWT token here
      return {
        id: 'user_123',
        email: 'user@example.com',
        role: 'admin'
      };
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const apiMiddleware = new APIMiddlewareManager();

// Common validation schemas
export const CommonValidationSchemas = {
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),

  id: z.object({
    id: z.string().uuid('Invalid ID format')
  }),

  search: z.object({
    q: z.string().min(1).max(100),
    filters: z.record(z.string()).optional()
  })
};

// Middleware presets
export const MiddlewarePresets = {
  public: () => [
    apiMiddleware.createMiddlewareStack()
  ],

  authenticated: (roles?: string[]) => [
    ...apiMiddleware.createMiddlewareStack(),
    apiMiddleware.createAuthenticationMiddleware({ required: true, roles })
  ],

  admin: () => [
    ...apiMiddleware.createMiddlewareStack(),
    apiMiddleware.createAuthenticationMiddleware({ required: true, roles: ['admin'] })
  ]
};
