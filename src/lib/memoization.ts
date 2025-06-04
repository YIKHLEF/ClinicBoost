/**
 * Advanced Memoization System
 * 
 * This module provides comprehensive memoization utilities including:
 * - Function memoization with TTL
 * - React component memoization
 * - Selector memoization
 * - Cache management and statistics
 * - Memory-efficient caching strategies
 */

export interface MemoizationConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enableStats: boolean;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

class AdvancedMemoizer<K = any, V = any> {
  private cache = new Map<string, CacheEntry<V>>();
  private config: MemoizationConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    memoryUsage: 0,
  };

  constructor(config: Partial<MemoizationConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
      enableStats: true,
      strategy: 'lru',
      ...config,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Memoize a function with advanced caching
   */
  memoize<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    keyGenerator?: (...args: Args) => string
  ): (...args: Args) => Return {
    const generateKey = keyGenerator || this.defaultKeyGenerator;

    return (...args: Args): Return => {
      const key = generateKey(...args);
      const cached = this.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = fn(...args);
      this.set(key, result);
      return result;
    };
  }

  /**
   * Memoize an async function
   */
  memoizeAsync<Args extends any[], Return>(
    fn: (...args: Args) => Promise<Return>,
    keyGenerator?: (...args: Args) => string
  ): (...args: Args) => Promise<Return> {
    const generateKey = keyGenerator || this.defaultKeyGenerator;
    const pendingPromises = new Map<string, Promise<Return>>();

    return async (...args: Args): Promise<Return> => {
      const key = generateKey(...args);
      const cached = this.get(key);

      if (cached !== undefined) {
        return cached;
      }

      // Check if there's already a pending promise for this key
      if (pendingPromises.has(key)) {
        return pendingPromises.get(key)!;
      }

      const promise = fn(...args);
      pendingPromises.set(key, promise);

      try {
        const result = await promise;
        this.set(key, result);
        pendingPromises.delete(key);
        return result;
      } catch (error) {
        pendingPromises.delete(key);
        throw error;
      }
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateStats('miss');
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.updateStats('miss');
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.updateStats('hit');
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: V): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.updateStats('set');
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Evict least frequently used entry
   */
  private evictLFU(): void {
    let leastUsedKey = '';
    let leastCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Evict first in, first out
   */
  private evictFIFO(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(...args: any[]): string {
    return JSON.stringify(args);
  }

  /**
   * Update statistics
   */
  private updateStats(type: 'hit' | 'miss' | 'set'): void {
    if (!this.config.enableStats) return;

    switch (type) {
      case 'hit':
        this.stats.hits++;
        break;
      case 'miss':
        this.stats.misses++;
        break;
      case 'set':
        this.stats.size = this.cache.size;
        break;
    }

    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += this.estimateObjectSize(entry.value);
      size += 64; // Overhead for entry metadata
    }
    return size;
  }

  /**
   * Estimate object size in bytes
   */
  private estimateObjectSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'string') return obj.length * 2;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    if (Array.isArray(obj)) {
      return obj.reduce((size, item) => size + this.estimateObjectSize(item), 0);
    }
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce(
        (size, [key, value]) => size + key.length * 2 + this.estimateObjectSize(value),
        0
      );
    }
    return 0;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, this.config.ttl / 2);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
    this.updateStats('set');
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Global memoizer instances
export const globalMemoizer = new AdvancedMemoizer();
export const selectorMemoizer = new AdvancedMemoizer({ maxSize: 500, ttl: 2 * 60 * 1000 });
export const apiMemoizer = new AdvancedMemoizer({ maxSize: 200, ttl: 10 * 60 * 1000 });

// Utility functions
export const memoize = <Args extends any[], Return>(
  fn: (...args: Args) => Return,
  options?: {
    keyGenerator?: (...args: Args) => string;
    memoizer?: AdvancedMemoizer;
  }
) => {
  const memoizer = options?.memoizer || globalMemoizer;
  return memoizer.memoize(fn, options?.keyGenerator);
};

export const memoizeAsync = <Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  options?: {
    keyGenerator?: (...args: Args) => string;
    memoizer?: AdvancedMemoizer;
  }
) => {
  const memoizer = options?.memoizer || globalMemoizer;
  return memoizer.memoizeAsync(fn, options?.keyGenerator);
};

// Selector memoization for complex computations
export const createSelector = <Args extends any[], Return>(
  dependencies: ((...args: Args) => any)[],
  resultFunc: (...results: any[]) => Return
): ((...args: Args) => Return) => {
  return memoize((...args: Args) => {
    const depResults = dependencies.map(dep => dep(...args));
    return resultFunc(...depResults);
  }, { memoizer: selectorMemoizer });
};

// Memoization decorator
export const memoized = (
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;
  descriptor.value = memoize(originalMethod);
  return descriptor;
};

// React-specific memoization utilities
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const memoizedCallback = React.useCallback(callback, deps);
  return memoize(memoizedCallback) as T;
};

export const useMemoizedValue = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const memoizedFactory = React.useCallback(factory, deps);
  return React.useMemo(() => memoize(memoizedFactory)(), [memoizedFactory]);
};

// Cache warming utilities
export const warmCache = async <T>(
  fn: (...args: any[]) => Promise<T>,
  argsList: any[][],
  options?: { memoizer?: AdvancedMemoizer }
): Promise<void> => {
  const memoizedFn = memoizeAsync(fn, options);
  await Promise.all(argsList.map(args => memoizedFn(...args)));
};

// Cache invalidation utilities
export const invalidateCache = (
  pattern: string | RegExp,
  memoizer: AdvancedMemoizer = globalMemoizer
): void => {
  const keys = memoizer.keys();
  const keysToDelete = keys.filter(key => {
    if (typeof pattern === 'string') {
      return key.includes(pattern);
    }
    return pattern.test(key);
  });

  keysToDelete.forEach(key => memoizer.delete(key));
};

// Performance monitoring
export const getMemoizationStats = () => ({
  global: globalMemoizer.getStats(),
  selector: selectorMemoizer.getStats(),
  api: apiMemoizer.getStats(),
});

export const clearAllCaches = () => {
  globalMemoizer.clear();
  selectorMemoizer.clear();
  apiMemoizer.clear();
};
