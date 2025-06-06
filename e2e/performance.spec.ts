/**
 * Performance E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/');
  });

  test('Dashboard loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check for Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    console.log('Performance metrics:', metrics);
  });

  test('Patient list renders large datasets efficiently', async ({ page }) => {
    await page.goto('/patients');
    
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Patient list should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Test scrolling performance with large lists
    const patientRows = page.locator('[data-testid="patient-row"]');
    const rowCount = await patientRows.count();
    
    if (rowCount > 10) {
      const scrollStartTime = Date.now();
      
      // Scroll to bottom
      await page.keyboard.press('End');
      await page.waitForTimeout(100);
      
      // Scroll to top
      await page.keyboard.press('Home');
      await page.waitForTimeout(100);
      
      const scrollTime = Date.now() - scrollStartTime;
      
      // Scrolling should be smooth (under 500ms for full scroll)
      expect(scrollTime).toBeLessThan(500);
    }
  });

  test('Form interactions are responsive', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="add-patient-button"]');
    
    // Measure form opening time
    const formStartTime = Date.now();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    const formOpenTime = Date.now() - formStartTime;
    
    // Form should open within 200ms
    expect(formOpenTime).toBeLessThan(200);
    
    // Test input responsiveness
    const firstNameInput = page.locator('[data-testid="first-name-input"]');
    
    const inputStartTime = Date.now();
    await firstNameInput.fill('John');
    await expect(firstNameInput).toHaveValue('John');
    const inputTime = Date.now() - inputStartTime;
    
    // Input should respond within 100ms
    expect(inputTime).toBeLessThan(100);
  });

  test('Search functionality performs well', async ({ page }) => {
    await page.goto('/patients');
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Test search response time
    const searchStartTime = Date.now();
    await searchInput.fill('John');
    
    // Wait for search results
    await page.waitForFunction(() => {
      const results = document.querySelectorAll('[data-testid="patient-row"]');
      return results.length > 0;
    }, { timeout: 2000 });
    
    const searchTime = Date.now() - searchStartTime;
    
    // Search should complete within 1 second
    expect(searchTime).toBeLessThan(1000);
    
    // Test search debouncing
    await searchInput.fill('');
    await searchInput.fill('J');
    await searchInput.fill('Jo');
    await searchInput.fill('Joh');
    await searchInput.fill('John');
    
    // Should not make excessive API calls
    // This would be verified through network monitoring
  });

  test('Navigation between pages is fast', async ({ page }) => {
    const pages = [
      { path: '/patients', testId: 'patients-title' },
      { path: '/appointments', testId: 'appointments-title' },
      { path: '/billing', testId: 'billing-title' },
      { path: '/reports', testId: 'reports-title' },
      { path: '/', testId: 'dashboard-title' }
    ];
    
    for (const pageInfo of pages) {
      const startTime = Date.now();
      
      await page.goto(pageInfo.path);
      await expect(page.locator(`[data-testid="${pageInfo.testId}"]`)).toBeVisible();
      
      const navigationTime = Date.now() - startTime;
      
      // Each page should load within 2 seconds
      expect(navigationTime).toBeLessThan(2000);
    }
  });

  test('Memory usage remains stable', async ({ page }) => {
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Navigate through multiple pages
    const routes = ['/', '/patients', '/appointments', '/billing', '/reports'];
    
    for (let i = 0; i < 3; i++) { // Repeat 3 times
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500); // Allow for cleanup
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory increase should be reasonable (less than 50MB)
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('API response times are acceptable', async ({ page }) => {
    // Monitor network requests
    const apiCalls: Array<{ url: string; duration: number }> = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/rest/v1/')) {
        const request = response.request();
        const timing = response.timing();
        
        apiCalls.push({
          url: response.url(),
          duration: timing.responseEnd - timing.requestStart
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that API calls complete within reasonable time
    apiCalls.forEach(call => {
      expect(call.duration).toBeLessThan(2000); // 2 seconds max
    });
    
    // Check average response time
    if (apiCalls.length > 0) {
      const averageTime = apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length;
      expect(averageTime).toBeLessThan(1000); // 1 second average
    }
  });

  test('Image loading is optimized', async ({ page }) => {
    await page.goto('/');
    
    // Check for lazy loading attributes
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      const src = await img.getAttribute('src');
      
      // Images should have loading="lazy" or be critical images
      if (src && !src.includes('logo') && !src.includes('hero')) {
        expect(loading).toBe('lazy');
      }
    }
  });

  test('Bundle size is within limits', async ({ page }) => {
    // Monitor resource loading
    const resources: Array<{ url: string; size: number; type: string }> = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      const contentLength = response.headers()['content-length'];
      
      if (url.includes('.js') || url.includes('.css')) {
        resources.push({
          url,
          size: contentLength ? parseInt(contentLength) : 0,
          type: url.includes('.js') ? 'js' : 'css'
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate total bundle sizes
    const jsSize = resources
      .filter(r => r.type === 'js')
      .reduce((sum, r) => sum + r.size, 0);
    
    const cssSize = resources
      .filter(r => r.type === 'css')
      .reduce((sum, r) => sum + r.size, 0);
    
    // JS bundle should be under 1MB
    expect(jsSize).toBeLessThan(1024 * 1024);
    
    // CSS bundle should be under 200KB
    expect(cssSize).toBeLessThan(200 * 1024);
  });

  test('Offline performance is acceptable', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Test offline functionality
    const startTime = Date.now();
    
    // Try to navigate (should work with cached resources)
    await page.click('[data-testid="nav-patients"]');
    
    // Should show offline indicator or cached content
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    const cachedContent = page.locator('[data-testid="patients-title"]');
    
    const hasOfflineSupport = await Promise.race([
      offlineIndicator.isVisible(),
      cachedContent.isVisible()
    ]);
    
    const offlineTime = Date.now() - startTime;
    
    // Offline response should be fast (under 500ms)
    expect(offlineTime).toBeLessThan(500);
    expect(hasOfflineSupport).toBe(true);
    
    // Go back online
    await context.setOffline(false);
  });

  test('Mobile performance is optimized', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      await page.emulateMedia({ media: 'screen' });
    }
    
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const mobileLoadTime = Date.now() - startTime;
    
    // Mobile should load within 4 seconds (slower network)
    expect(mobileLoadTime).toBeLessThan(4000);
    
    // Test touch interactions
    const touchStartTime = Date.now();
    await page.tap('[data-testid="nav-patients"]');
    await expect(page.locator('[data-testid="patients-title"]')).toBeVisible();
    const touchTime = Date.now() - touchStartTime;
    
    // Touch interactions should be responsive
    expect(touchTime).toBeLessThan(300);
  });
});
