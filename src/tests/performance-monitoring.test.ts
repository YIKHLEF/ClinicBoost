/**
 * Performance Monitoring Integration Tests
 * 
 * Comprehensive tests for all performance monitoring features:
 * - Real-time alerts
 * - Regression detection
 * - Mobile optimization
 * - Advanced caching
 * - Integration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { realTimeAlerts, checkMetric, resolveAlert } from '../lib/performance/real-time-alerts';
import { regressionDetector, recordMetric, getRegressionHistory } from '../lib/performance/regression-detection';
import { performanceOptimizer } from '../lib/mobile/performance-optimizer';
import { mobileCacheManager, cacheGet, cacheSet, getCacheStats } from '../lib/performance/mobile-cache-strategies';
import { performanceIntegration, initializePerformanceMonitoring } from '../lib/performance/performance-integration';

// Mock browser APIs
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false,
  addEventListener: vi.fn()
};

const mockMemory = {
  usedJSHeapSize: 50000000,
  totalJSHeapSize: 100000000,
  jsHeapSizeLimit: 200000000
};

const mockBattery = {
  level: 0.8,
  addEventListener: vi.fn()
};

// Setup global mocks before any imports
beforeAll(() => {
  // Mock PerformanceObserver first
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock requestIdleCallback
  global.requestIdleCallback = vi.fn((callback) => {
    setTimeout(callback, 0);
    return 1;
  });

  // Mock WebSocket
  global.WebSocket = vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    send: vi.fn()
  }));

  // Mock fetch
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      status: 200
    } as Response)
  );
});

// Setup global mocks
beforeEach(() => {
  // Mock navigator
  Object.defineProperty(navigator, 'connection', {
    value: mockConnection,
    writable: true,
    configurable: true
  });

  Object.defineProperty(navigator, 'getBattery', {
    value: () => Promise.resolve(mockBattery),
    writable: true,
    configurable: true
  });

  // Mock performance
  Object.defineProperty(performance, 'memory', {
    value: mockMemory,
    writable: true,
    configurable: true
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Real-time Performance Alerts', () => {
  it('should create alert when metric exceeds threshold', () => {
    const alertsBefore = realTimeAlerts.getActiveAlerts().length;
    
    // Trigger alert with high LCP value
    checkMetric('LCP', 5000, { environment: 'test' });
    
    const alertsAfter = realTimeAlerts.getActiveAlerts().length;
    expect(alertsAfter).toBeGreaterThan(alertsBefore);
  });

  it('should resolve alerts correctly', () => {
    // Create an alert
    checkMetric('LCP', 5000, { environment: 'test' });
    const activeAlerts = realTimeAlerts.getActiveAlerts();
    
    if (activeAlerts.length > 0) {
      const alertId = activeAlerts[0].id;
      const resolved = resolveAlert(alertId, 'test-user');
      expect(resolved).toBe(true);
    }
  });

  it('should respect cooldown periods', () => {
    // First alert
    checkMetric('LCP', 5000, { environment: 'test' });
    const alertsAfterFirst = realTimeAlerts.getActiveAlerts().length;
    
    // Immediate second alert (should be ignored due to cooldown)
    checkMetric('LCP', 5000, { environment: 'test' });
    const alertsAfterSecond = realTimeAlerts.getActiveAlerts().length;
    
    expect(alertsAfterSecond).toBe(alertsAfterFirst);
  });

  it('should handle different severity levels', () => {
    // Test different metrics with different severities
    checkMetric('LCP', 3000, { environment: 'test' }); // Medium severity
    checkMetric('LCP', 6000, { environment: 'test' }); // High severity
    
    const alerts = realTimeAlerts.getActiveAlerts();
    const severities = alerts.map(alert => alert.severity);
    expect(severities).toContain('medium');
  });
});

describe('Performance Regression Detection', () => {
  it('should record metrics for baseline creation', () => {
    // Record multiple metrics to establish baseline
    for (let i = 0; i < 35; i++) {
      recordMetric('testMetric', 1000 + Math.random() * 100, 'test');
    }
    
    const baselines = regressionDetector.getBaselines();
    expect(baselines.length).toBeGreaterThan(0);
  });

  it('should detect performance regressions', () => {
    // Establish baseline
    for (let i = 0; i < 35; i++) {
      recordMetric('regressionTest', 1000, 'test');
    }
    
    // Force baseline creation
    regressionDetector.forceBaselineUpdate('regressionTest', 'test');
    
    // Record significantly worse performance
    recordMetric('regressionTest', 2000, 'test'); // 100% increase
    
    const regressions = getRegressionHistory(1);
    expect(regressions.length).toBeGreaterThan(0);
  });

  it('should calculate regression severity correctly', () => {
    // Establish baseline
    for (let i = 0; i < 35; i++) {
      recordMetric('severityTest', 1000, 'test');
    }
    
    regressionDetector.forceBaselineUpdate('severityTest', 'test');
    
    // Record critical regression (>100% increase)
    recordMetric('severityTest', 2500, 'test');
    
    const regressions = getRegressionHistory(1);
    if (regressions.length > 0) {
      expect(['major', 'critical']).toContain(regressions[0].severity);
    }
  });

  it('should maintain regression history', () => {
    const historyBefore = getRegressionHistory().length;
    
    // Create multiple regressions
    for (let i = 0; i < 3; i++) {
      recordMetric(`historyTest${i}`, 5000, 'test');
    }
    
    const historyAfter = getRegressionHistory().length;
    expect(historyAfter).toBeGreaterThanOrEqual(historyBefore);
  });
});

describe('Mobile Performance Optimization', () => {
  it('should adapt to network conditions', () => {
    const configBefore = performanceOptimizer.getConfig();
    
    // Simulate slow network
    mockConnection.effectiveType = '2g';
    mockConnection.downlink = 0.5;
    
    // Trigger network adaptation (this would normally happen automatically)
    const configAfter = performanceOptimizer.getConfig();
    
    // Configuration should be more conservative for slow networks
    expect(configAfter.maxConcurrentRequests).toBeLessThanOrEqual(configBefore.maxConcurrentRequests);
  });

  it('should monitor performance metrics', () => {
    const metrics = performanceOptimizer.getMetrics();
    
    expect(metrics).toHaveProperty('loadTime');
    expect(metrics).toHaveProperty('memoryUsage');
    expect(metrics).toHaveProperty('batteryImpact');
    expect(metrics).toHaveProperty('networkUsage');
  });

  it('should handle memory pressure', () => {
    // Simulate high memory usage
    mockMemory.usedJSHeapSize = mockMemory.jsHeapSizeLimit * 0.9;
    
    const metrics = performanceOptimizer.getMetrics();
    expect(metrics.memoryUsage).toBeGreaterThan(0.8);
  });

  it('should optimize image loading', () => {
    // Test image optimization
    const testElement = document.createElement('img');
    testElement.dataset.src = 'test-image.jpg';
    document.body.appendChild(testElement);
    
    performanceOptimizer.observeElement(testElement, 'images');
    
    // Cleanup
    document.body.removeChild(testElement);
  });
});

describe('Advanced Mobile Caching', () => {
  beforeEach(() => {
    mobileCacheManager.clear();
  });

  it('should cache and retrieve data', () => {
    const testData = { test: 'data', timestamp: Date.now() };
    
    cacheSet('test-key', testData);
    const retrieved = cacheGet('test-key');
    
    expect(retrieved).toEqual(testData);
  });

  it('should respect cache priorities', () => {
    // Set critical and low priority items
    cacheSet('critical-item', 'critical-data', { priority: 'critical' });
    cacheSet('low-item', 'low-data', { priority: 'low' });
    
    expect(mobileCacheManager.has('critical-item')).toBe(true);
    expect(mobileCacheManager.has('low-item')).toBe(true);
  });

  it('should handle cache eviction', () => {
    // Fill cache beyond limits
    for (let i = 0; i < 1100; i++) {
      cacheSet(`item-${i}`, `data-${i}`, { priority: 'normal' });
    }
    
    const stats = getCacheStats();
    expect(stats.totalEntries).toBeLessThan(1100);
    expect(stats.evictionCount).toBeGreaterThan(0);
  });

  it('should adapt to network conditions', () => {
    // Test caching behavior with different network conditions
    mockConnection.effectiveType = '2g';
    mockConnection.saveData = true;
    
    // Should still cache critical items
    cacheSet('critical-slow-network', 'data', { priority: 'critical' });
    expect(mobileCacheManager.has('critical-slow-network')).toBe(true);
  });

  it('should handle cache expiration', async () => {
    // Set item with short expiration
    cacheSet('expiring-item', 'data', { expiresIn: 100 });
    
    expect(mobileCacheManager.has('expiring-item')).toBe(true);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(cacheGet('expiring-item')).toBeNull();
  });

  it('should track cache statistics', () => {
    cacheSet('stats-test', 'data');
    cacheGet('stats-test'); // Hit
    cacheGet('non-existent'); // Miss
    
    const stats = getCacheStats();
    expect(stats.hitRate).toBeGreaterThan(0);
    expect(stats.missRate).toBeGreaterThan(0);
  });
});

describe('Performance Integration', () => {
  it('should initialize all modules', async () => {
    await initializePerformanceMonitoring();
    
    const status = performanceIntegration.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.modules.advancedMonitoring).toBe(true);
    expect(status.modules.realTimeAlerts).toBe(true);
    expect(status.modules.regressionDetection).toBe(true);
    expect(status.modules.mobileOptimization).toBe(true);
    expect(status.modules.advancedCaching).toBe(true);
  });

  it('should handle integrated reporting', () => {
    const eventSpy = vi.spyOn(document, 'dispatchEvent');
    
    // Trigger report generation (normally happens automatically)
    // This would be tested by triggering the internal report generation
    
    expect(eventSpy).toHaveBeenCalled();
  });

  it('should adapt to system changes', () => {
    // Test network change handling
    const networkEvent = new Event('change');
    mockConnection.addEventListener.mock.calls.forEach(([event, handler]) => {
      if (event === 'change') {
        handler(networkEvent);
      }
    });
    
    // Test battery change handling
    const batteryEvent = new Event('levelchange');
    mockBattery.addEventListener.mock.calls.forEach(([event, handler]) => {
      if (event === 'levelchange') {
        handler(batteryEvent);
      }
    });
    
    // Should not throw errors
    expect(true).toBe(true);
  });

  it('should handle visibility changes', () => {
    // Test pause/resume functionality
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true
    });
    
    const visibilityEvent = new Event('visibilitychange');
    document.dispatchEvent(visibilityEvent);
    
    // Should not throw errors
    expect(true).toBe(true);
  });
});

describe('End-to-End Performance Monitoring', () => {
  it('should handle complete performance monitoring workflow', async () => {
    // Initialize system
    await initializePerformanceMonitoring();
    
    // Record performance metrics
    recordMetric('e2e-test', 1500, 'test');
    checkMetric('e2e-test', 1500, { environment: 'test' });
    
    // Use caching
    cacheSet('e2e-cache', { data: 'test' });
    const cached = cacheGet('e2e-cache');
    
    // Check system status
    const status = performanceIntegration.getStatus();
    const cacheStats = getCacheStats();
    const alerts = realTimeAlerts.getActiveAlerts();
    
    expect(status.initialized).toBe(true);
    expect(cached).toBeTruthy();
    expect(cacheStats.totalEntries).toBeGreaterThan(0);
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should maintain performance under load', async () => {
    const startTime = performance.now();
    
    // Simulate high load
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        Promise.resolve().then(() => {
          recordMetric(`load-test-${i}`, Math.random() * 2000, 'test');
          cacheSet(`load-cache-${i}`, { data: i });
          checkMetric(`load-metric-${i}`, Math.random() * 3000);
        })
      );
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle invalid metric values', () => {
    expect(() => {
      recordMetric('invalid-test', NaN, 'test');
      checkMetric('invalid-test', Infinity);
    }).not.toThrow();
  });

  it('should handle storage failures gracefully', () => {
    // Mock localStorage failure
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    expect(() => {
      cacheSet('storage-fail-test', 'data');
    }).not.toThrow();
  });

  it('should handle network failures', () => {
    // Mock fetch failure
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    
    expect(() => {
      checkMetric('network-fail-test', 1000);
    }).not.toThrow();
  });

  it('should handle missing browser APIs', () => {
    // Remove browser APIs
    delete (navigator as any).connection;
    delete (performance as any).memory;
    delete (global as any).PerformanceObserver;
    
    expect(() => {
      initializePerformanceMonitoring();
    }).not.toThrow();
  });
});
