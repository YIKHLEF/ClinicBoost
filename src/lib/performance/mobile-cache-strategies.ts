/**
 * Advanced Mobile Caching Strategies
 * 
 * This module provides sophisticated caching strategies optimized for mobile devices:
 * - Network-aware caching
 * - Battery-conscious cache management
 * - Intelligent cache eviction
 * - Offline-first caching patterns
 * - Progressive cache warming
 */

import { logger } from '../logging-monitoring';
import { deviceDetection } from '../mobile/device-detection';

export interface MobileCacheConfig {
  enabled: boolean;
  strategies: {
    networkAware: boolean;
    batteryConscious: boolean;
    intelligentEviction: boolean;
    progressiveWarming: boolean;
    offlineFirst: boolean;
  };
  limits: {
    maxCacheSize: number; // MB
    maxEntries: number;
    maxAge: number; // milliseconds
  };
  priorities: {
    critical: number;
    important: number;
    normal: number;
    low: number;
  };
  networkThresholds: {
    slowConnection: number; // Mbps
    fastConnection: number; // Mbps
  };
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  priority: 'critical' | 'important' | 'normal' | 'low';
  networkType: string;
  expiresAt?: number;
  metadata: Record<string, any>;
}

export interface CacheStats {
  totalSize: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  networkSavings: number;
  batteryImpact: number;
}

class MobileCacheManager {
  private config: MobileCacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    totalSize: 0,
    totalEntries: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    networkSavings: 0,
    batteryImpact: 0
  };
  private accessLog: Map<string, number[]> = new Map();
  private networkObserver: any;

  constructor(config: MobileCacheConfig) {
    this.config = config;
    this.initializeCache();
    this.startPeriodicMaintenance();
    this.setupNetworkObserver();
  }

  /**
   * Initialize cache system
   */
  private initializeCache(): void {
    // Load existing cache from IndexedDB
    this.loadCacheFromStorage();
    
    // Setup cache warming if enabled
    if (this.config.strategies.progressiveWarming) {
      this.startProgressiveWarming();
    }
  }

  /**
   * Load cache from persistent storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      // Implementation would use IndexedDB for persistent storage
      const stored = localStorage.getItem('mobile-cache');
      if (stored) {
        const entries = JSON.parse(stored);
        entries.forEach((entry: CacheEntry) => {
          if (this.isEntryValid(entry)) {
            this.cache.set(entry.key, entry);
            this.stats.totalSize += entry.size;
            this.stats.totalEntries++;
          }
        });
        
        logger.info('Mobile cache loaded from storage', 'mobile-cache', {
          entries: this.cache.size,
          size: this.stats.totalSize
        });
      }
    } catch (error) {
      logger.error('Failed to load cache from storage', 'mobile-cache', { error });
    }
  }

  /**
   * Save cache to persistent storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      localStorage.setItem('mobile-cache', JSON.stringify(entries));
    } catch (error) {
      logger.error('Failed to save cache to storage', 'mobile-cache', { error });
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < now) {
      return false;
    }
    
    // Check max age
    if (now - entry.timestamp > this.config.limits.maxAge) {
      return false;
    }
    
    return true;
  }

  /**
   * Get item from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss(key);
      return null;
    }
    
    if (!this.isEntryValid(entry)) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      this.recordMiss(key);
      return null;
    }
    
    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.recordHit(key);
    this.recordAccess(key);
    
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set<T = any>(
    key: string,
    data: T,
    options: {
      priority?: CacheEntry['priority'];
      expiresIn?: number;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const deviceInfo = deviceDetection.getDeviceInfo();
    const size = this.estimateSize(data);
    
    // Check if we should cache based on network conditions
    if (!this.shouldCache(size, options.priority || 'normal')) {
      return;
    }
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      priority: options.priority || 'normal',
      networkType: deviceInfo.network.effectiveType,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: options.metadata || {}
    };

    // Remove existing entry if it exists
    const existing = this.cache.get(key);
    if (existing) {
      this.stats.totalSize -= existing.size;
    } else {
      this.stats.totalEntries++;
    }

    // Check cache limits and evict if necessary
    this.ensureCacheSpace(size);
    
    this.cache.set(key, entry);
    this.stats.totalSize += size;
    
    // Save to persistent storage periodically
    this.schedulePersistentSave();
  }

  /**
   * Determine if we should cache based on conditions
   */
  private shouldCache(size: number, priority: CacheEntry['priority']): boolean {
    const deviceInfo = deviceDetection.getDeviceInfo();
    
    // Battery-conscious caching
    if (this.config.strategies.batteryConscious) {
      const batteryLevel = deviceInfo.performance.batteryLevel;
      if (batteryLevel && batteryLevel < 0.2 && priority !== 'critical') {
        return false;
      }
    }
    
    // Network-aware caching
    if (this.config.strategies.networkAware) {
      const effectiveType = deviceInfo.network.effectiveType;
      if ((effectiveType === 'slow-2g' || effectiveType === '2g') && priority === 'low') {
        return false;
      }
    }
    
    // Size limits
    if (size > this.config.limits.maxCacheSize * 1024 * 1024 * 0.1) { // 10% of max cache size
      return priority === 'critical';
    }
    
    return true;
  }

  /**
   * Ensure cache has space for new entry
   */
  private ensureCacheSpace(requiredSize: number): void {
    const maxSize = this.config.limits.maxCacheSize * 1024 * 1024;
    const maxEntries = this.config.limits.maxEntries;
    
    // Check size limit
    while (this.stats.totalSize + requiredSize > maxSize && this.cache.size > 0) {
      this.evictLeastValuable();
    }
    
    // Check entry limit
    while (this.cache.size >= maxEntries) {
      this.evictLeastValuable();
    }
  }

  /**
   * Evict least valuable cache entry
   */
  private evictLeastValuable(): void {
    if (this.cache.size === 0) return;
    
    let leastValuable: CacheEntry | null = null;
    let lowestScore = Infinity;
    
    for (const entry of this.cache.values()) {
      const score = this.calculateValueScore(entry);
      if (score < lowestScore) {
        lowestScore = score;
        leastValuable = entry;
      }
    }
    
    if (leastValuable) {
      this.cache.delete(leastValuable.key);
      this.stats.totalSize -= leastValuable.size;
      this.stats.totalEntries--;
      this.stats.evictionCount++;
      
      logger.debug('Cache entry evicted', 'mobile-cache', {
        key: leastValuable.key,
        score: lowestScore,
        reason: 'space_required'
      });
    }
  }

  /**
   * Calculate value score for cache entry
   */
  private calculateValueScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    
    // Priority weights
    const priorityWeights = {
      critical: 1000,
      important: 100,
      normal: 10,
      low: 1
    };
    
    // Frequency score (access count / age in hours)
    const frequencyScore = entry.accessCount / (age / (1000 * 60 * 60));
    
    // Recency score (inverse of time since last access)
    const recencyScore = 1 / (timeSinceAccess / (1000 * 60 * 60) + 1);
    
    // Size penalty (larger items have lower scores)
    const sizePenalty = 1 / (entry.size / 1024 + 1);
    
    // Network type bonus (cache items from slow networks more aggressively)
    const networkBonus = entry.networkType === 'slow-2g' || entry.networkType === '2g' ? 2 : 1;
    
    return (
      priorityWeights[entry.priority] *
      frequencyScore *
      recencyScore *
      sizePenalty *
      networkBonus
    );
  }

  /**
   * Estimate size of data
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(key: string): void {
    this.updateHitRate(true);
  }

  /**
   * Record cache miss
   */
  private recordMiss(key: string): void {
    this.updateHitRate(false);
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(isHit: boolean): void {
    const totalRequests = this.stats.hitRate + this.stats.missRate + 1;
    
    if (isHit) {
      this.stats.hitRate = (this.stats.hitRate + 1) / totalRequests;
      this.stats.missRate = this.stats.missRate / totalRequests;
    } else {
      this.stats.hitRate = this.stats.hitRate / totalRequests;
      this.stats.missRate = (this.stats.missRate + 1) / totalRequests;
    }
  }

  /**
   * Record access for pattern analysis
   */
  private recordAccess(key: string): void {
    if (!this.accessLog.has(key)) {
      this.accessLog.set(key, []);
    }
    
    const accesses = this.accessLog.get(key)!;
    accesses.push(Date.now());
    
    // Keep only recent accesses (last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recentAccesses = accesses.filter(time => time > cutoff);
    this.accessLog.set(key, recentAccesses);
  }

  /**
   * Start progressive cache warming
   */
  private startProgressiveWarming(): void {
    // Warm cache with critical resources during idle time
    if ('requestIdleCallback' in window) {
      const warmCache = () => {
        requestIdleCallback(() => {
          this.warmCriticalResources();
          setTimeout(warmCache, 60000); // Every minute
        });
      };
      
      warmCache();
    }
  }

  /**
   * Warm cache with critical resources
   */
  private async warmCriticalResources(): Promise<void> {
    const criticalResources = [
      '/api/user/profile',
      '/api/clinics/current',
      '/api/appointments/today'
    ];
    
    for (const resource of criticalResources) {
      if (!this.cache.has(resource)) {
        try {
          const response = await fetch(resource);
          const data = await response.json();
          this.set(resource, data, { priority: 'critical' });
        } catch (error) {
          logger.debug('Failed to warm cache for resource', 'mobile-cache', {
            resource,
            error
          });
        }
      }
    }
  }

  /**
   * Setup network observer for adaptive caching
   */
  private setupNetworkObserver(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const handleNetworkChange = () => {
        this.adaptToNetworkChange(connection);
      };
      
      connection.addEventListener('change', handleNetworkChange);
      this.networkObserver = { connection, handler: handleNetworkChange };
    }
  }

  /**
   * Adapt caching strategy to network changes
   */
  private adaptToNetworkChange(connection: any): void {
    const effectiveType = connection.effectiveType;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      // Aggressive caching for slow networks
      this.enableAggressiveCaching();
    } else if (effectiveType === '4g' && connection.downlink > 10) {
      // Relaxed caching for fast networks
      this.enableRelaxedCaching();
    }
  }

  /**
   * Enable aggressive caching for slow networks
   */
  private enableAggressiveCaching(): void {
    // Increase cache limits
    this.config.limits.maxAge *= 2;
    
    // Cache more aggressively
    this.config.strategies.offlineFirst = true;
  }

  /**
   * Enable relaxed caching for fast networks
   */
  private enableRelaxedCaching(): void {
    // Reduce cache limits
    this.config.limits.maxAge /= 2;
    
    // Less aggressive caching
    this.config.strategies.offlineFirst = false;
  }

  /**
   * Start periodic maintenance
   */
  private startPeriodicMaintenance(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 5 * 60 * 1000);
    
    // Save to storage every 10 minutes
    setInterval(() => {
      this.saveCacheToStorage();
    }, 10 * 60 * 1000);
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.cache.delete(key);
        this.stats.totalSize -= entry.size;
        this.stats.totalEntries--;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug('Cleaned expired cache entries', 'mobile-cache', {
        count: cleanedCount
      });
    }
  }

  /**
   * Schedule persistent save
   */
  private schedulePersistentSave(): void {
    // Debounced save to avoid too frequent writes
    clearTimeout((this as any).saveTimeout);
    (this as any).saveTimeout = setTimeout(() => {
      this.saveCacheToStorage();
    }, 5000);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalSize: 0,
      totalEntries: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      networkSavings: 0,
      batteryImpact: 0
    };
    this.accessLog.clear();
  }

  /**
   * Remove specific entry
   */
  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      return true;
    }
    return false;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? this.isEntryValid(entry) : false;
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.networkObserver) {
      this.networkObserver.connection.removeEventListener('change', this.networkObserver.handler);
    }
    
    clearTimeout((this as any).saveTimeout);
    this.saveCacheToStorage();
  }
}

// Default configuration
const defaultMobileCacheConfig: MobileCacheConfig = {
  enabled: true,
  strategies: {
    networkAware: true,
    batteryConscious: true,
    intelligentEviction: true,
    progressiveWarming: true,
    offlineFirst: false
  },
  limits: {
    maxCacheSize: 50, // MB
    maxEntries: 1000,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  priorities: {
    critical: 1000,
    important: 100,
    normal: 10,
    low: 1
  },
  networkThresholds: {
    slowConnection: 1.5, // Mbps
    fastConnection: 10   // Mbps
  }
};

// Export singleton instance
export const mobileCacheManager = new MobileCacheManager(defaultMobileCacheConfig);

// Export utility functions
export const cacheGet = <T = any>(key: string): T | null => mobileCacheManager.get<T>(key);

export const cacheSet = <T = any>(key: string, data: T, options?: any) => 
  mobileCacheManager.set(key, data, options);

export const cacheHas = (key: string): boolean => mobileCacheManager.has(key);

export const cacheRemove = (key: string): boolean => mobileCacheManager.remove(key);

export const getCacheStats = (): CacheStats => mobileCacheManager.getStats();
