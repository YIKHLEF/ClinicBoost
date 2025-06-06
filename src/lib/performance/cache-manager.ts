/**
 * Cache Manager for ClinicBoost
 * Implements multi-level caching strategies for optimal performance
 */

import { logger } from '../logging-monitoring';
import { secureConfig } from '../config/secure-config';

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags: string[];
}

// Cache configuration
interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableCompression: boolean;
  enableMetrics: boolean;
}

// Cache metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000,
      enableCompression: true,
      enableMetrics: true,
      ...config
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.updateMetrics('miss');
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.updateMetrics('miss');
      return null;
    }

    // Update hit count and metrics
    entry.hits++;
    this.updateMetrics('hit');
    
    logger.debug('Cache hit', 'cache', { key, hits: entry.hits });
    return entry.data;
  }

  /**
   * Set value in cache
   */
  set<T = any>(key: string, data: T, options?: {
    ttl?: number;
    tags?: string[];
    compress?: boolean;
  }): void {
    try {
      const ttl = options?.ttl || this.config.defaultTTL;
      const tags = options?.tags || [];

      // Check cache size limit
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }

      const entry: CacheEntry<T> = {
        data: this.config.enableCompression && options?.compress !== false 
          ? this.compress(data) 
          : data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
        tags
      };

      this.cache.set(key, entry);
      this.updateMetrics('set');
      
      logger.debug('Cache set', 'cache', { key, ttl, tags });
    } catch (error) {
      logger.error('Cache set error', 'cache', { key, error });
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMetrics('delete');
      logger.debug('Cache delete', 'cache', { key });
    }
    return deleted;
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }

    logger.info('Cache cleared by tags', 'cache', { tags, cleared });
    return cleared;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', 'cache', { entriesCleared: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheMetrics & {
    size: number;
    memoryUsage: number;
  } {
    return {
      ...this.metrics,
      size: this.cache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Memoization decorator for functions
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    options?: {
      keyGenerator?: (...args: Parameters<T>) => string;
      ttl?: number;
      tags?: string[];
    }
  ): T {
    const keyGenerator = options?.keyGenerator || ((...args) => 
      `memoized:${fn.name}:${JSON.stringify(args)}`
    );

    return ((...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      let result = this.get(key);
      
      if (result === null) {
        // Execute function and cache result
        result = fn(...args);
        this.set(key, result, {
          ttl: options?.ttl,
          tags: options?.tags
        });
      }
      
      return result;
    }) as T;
  }

  /**
   * Cache with automatic refresh
   */
  async getOrRefresh<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options?: {
      ttl?: number;
      refreshThreshold?: number; // Refresh when TTL is below this percentage
      tags?: string[];
    }
  ): Promise<T> {
    const entry = this.cache.get(key);
    const refreshThreshold = options?.refreshThreshold || 0.1; // 10%
    
    if (entry) {
      const timeLeft = (entry.timestamp + entry.ttl) - Date.now();
      const thresholdTime = entry.ttl * refreshThreshold;
      
      // If time left is below threshold, refresh in background
      if (timeLeft < thresholdTime) {
        this.refreshInBackground(key, refreshFn, options);
      }
      
      return entry.data;
    }

    // No cache entry, fetch and cache
    const data = await refreshFn();
    this.set(key, data, options);
    return data;
  }

  /**
   * Private methods
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', 'cache', { entriesRemoved: cleaned });
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const lastAccess = entry.timestamp + (entry.hits * 1000); // Factor in hit count
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.updateMetrics('eviction');
      logger.debug('Cache LRU eviction', 'cache', { key: oldestKey });
    }
  }

  private updateMetrics(operation: 'hit' | 'miss' | 'set' | 'delete' | 'eviction'): void {
    if (!this.config.enableMetrics) return;

    this.metrics[operation === 'eviction' ? 'evictions' : `${operation}s`]++;
    
    // Calculate hit rate
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private compress<T>(data: T): T {
    // Simple compression for demo - in production, use proper compression
    if (typeof data === 'string' && data.length > 1000) {
      try {
        return JSON.parse(JSON.stringify(data)) as T;
      } catch {
        return data;
      }
    }
    return data;
  }

  private async refreshInBackground<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    try {
      const data = await refreshFn();
      this.set(key, data, options);
      logger.debug('Background cache refresh', 'cache', { key });
    } catch (error) {
      logger.error('Background cache refresh failed', 'cache', { key, error });
    }
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }
}

// API Response Cache
export class APIResponseCache extends CacheManager {
  constructor() {
    super({
      defaultTTL: 300000, // 5 minutes for API responses
      maxSize: 500,
      enableCompression: true,
      enableMetrics: true
    });
  }

  /**
   * Cache API response with automatic key generation
   */
  cacheResponse(
    method: string,
    url: string,
    params: any,
    response: any,
    ttl?: number
  ): void {
    const key = this.generateAPIKey(method, url, params);
    this.set(key, response, {
      ttl,
      tags: ['api', method.toLowerCase(), this.extractEndpoint(url)]
    });
  }

  /**
   * Get cached API response
   */
  getCachedResponse(method: string, url: string, params: any): any {
    const key = this.generateAPIKey(method, url, params);
    return this.get(key);
  }

  /**
   * Invalidate API cache by endpoint
   */
  invalidateEndpoint(endpoint: string): number {
    return this.clearByTags([endpoint]);
  }

  private generateAPIKey(method: string, url: string, params: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `api:${method}:${url}:${paramString}`;
  }

  private extractEndpoint(url: string): string {
    return url.split('/').slice(-2).join('/'); // Last two path segments
  }
}

// Query Cache for database operations
export class QueryCache extends CacheManager {
  constructor() {
    super({
      defaultTTL: 600000, // 10 minutes for queries
      maxSize: 200,
      enableCompression: true,
      enableMetrics: true
    });
  }

  /**
   * Cache database query result
   */
  cacheQuery(
    table: string,
    query: string,
    params: any[],
    result: any,
    ttl?: number
  ): void {
    const key = this.generateQueryKey(table, query, params);
    this.set(key, result, {
      ttl,
      tags: ['query', table]
    });
  }

  /**
   * Get cached query result
   */
  getCachedQuery(table: string, query: string, params: any[]): any {
    const key = this.generateQueryKey(table, query, params);
    return this.get(key);
  }

  /**
   * Invalidate cache for specific table
   */
  invalidateTable(table: string): number {
    return this.clearByTags([table]);
  }

  private generateQueryKey(table: string, query: string, params: any[]): string {
    const paramString = JSON.stringify(params);
    return `query:${table}:${query}:${paramString}`;
  }
}

// Export singleton instances
export const apiCache = new APIResponseCache();
export const queryCache = new QueryCache();
export const generalCache = new CacheManager();

// Cache utilities
export const CacheUtils = {
  /**
   * Create cache key with namespace
   */
  createKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  },

  /**
   * Get cache TTL based on data type
   */
  getTTL(dataType: 'static' | 'dynamic' | 'user' | 'session'): number {
    const ttls = {
      static: 3600000,   // 1 hour
      dynamic: 300000,   // 5 minutes
      user: 900000,      // 15 minutes
      session: 1800000   // 30 minutes
    };
    return ttls[dataType];
  },

  /**
   * Generate cache tags for data
   */
  generateTags(entity: string, id?: string, userId?: string): string[] {
    const tags = [entity];
    if (id) tags.push(`${entity}:${id}`);
    if (userId) tags.push(`user:${userId}`);
    return tags;
  }
};
