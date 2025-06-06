/**
 * Accessibility E2E Tests
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/');
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('Dashboard page is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Patients page is accessible', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Appointments page is accessible', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Patient form modal is accessible', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="add-patient-button"]');
    
    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    await checkA11y(page, '[role="dialog"]', {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Navigation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation through main navigation
    const navItems = [
      '[data-testid="nav-dashboard"]',
      '[data-testid="nav-patients"]',
      '[data-testid="nav-appointments"]',
      '[data-testid="nav-billing"]',
      '[data-testid="nav-reports"]'
    ];

    for (const navItem of navItems) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('Forms have proper labels and error handling', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="add-patient-button"]');
    
    // Wait for form to appear
    await expect(page.locator('form')).toBeVisible();
    
    // Check that all inputs have labels
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
    
    // Test form validation accessibility
    await page.click('[data-testid="submit-button"]');
    
    // Check for error messages with proper ARIA attributes
    const errorMessages = page.locator('[role="alert"], .error-message');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        await expect(error).toBeVisible();
        
        // Check if error is associated with an input
        const ariaDescribedBy = await error.getAttribute('aria-describedby');
        if (ariaDescribedBy) {
          const relatedInput = page.locator(`[aria-describedby*="${ariaDescribedBy}"]`);
          await expect(relatedInput).toBeVisible();
        }
      }
    }
  });

  test('Tables have proper headers and structure', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i);
      
      // Check for table caption or aria-label
      const caption = table.locator('caption');
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledBy = await table.getAttribute('aria-labelledby');
      
      const hasCaption = await caption.count() > 0;
      expect(hasCaption || ariaLabel || ariaLabelledBy).toBeTruthy();
      
      // Check that headers have scope attributes
      const headers = table.locator('th');
      const headerCount = await headers.count();
      
      for (let j = 0; j < headerCount; j++) {
        const header = headers.nth(j);
        const scope = await header.getAttribute('scope');
        expect(scope).toBeTruthy();
      }
    }
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check color contrast specifically
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      },
      detailedReport: true,
    });
  });

  test('Focus management in modals', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="add-patient-button"]');
    
    // Wait for modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Check that focus is moved to modal
    const focusedElement = page.locator(':focus');
    const isInModal = await modal.locator(':focus').count() > 0;
    expect(isInModal).toBe(true);
    
    // Test focus trap - tab through all focusable elements
    const focusableElements = modal.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const elementCount = await focusableElements.count();
    
    // Tab through all elements and ensure focus stays within modal
    for (let i = 0; i < elementCount + 2; i++) {
      await page.keyboard.press('Tab');
      const currentFocus = page.locator(':focus');
      const isStillInModal = await modal.locator(':focus').count() > 0;
      expect(isStillInModal).toBe(true);
    }
    
    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('Screen reader announcements work correctly', async ({ page }) => {
    await page.goto('/patients');
    
    // Check for live regions
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    const liveRegionCount = await liveRegions.count();
    expect(liveRegionCount).toBeGreaterThan(0);
    
    // Trigger an action that should create an announcement
    await page.click('[data-testid="add-patient-button"]');
    
    // Check that success/error messages have proper ARIA attributes
    const statusMessages = page.locator('[role="status"], [role="alert"]');
    const statusCount = await statusMessages.count();
    
    if (statusCount > 0) {
      for (let i = 0; i < statusCount; i++) {
        const status = statusMessages.nth(i);
        const ariaLive = await status.getAttribute('aria-live');
        const role = await status.getAttribute('role');
        expect(ariaLive || role).toBeTruthy();
      }
    }
  });

  test('Language switching maintains accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Switch to Arabic (RTL)
    await page.click('[data-testid="language-switcher"]');
    await page.click('[data-testid="language-ar"]');
    
    // Wait for language change
    await page.waitForTimeout(1000);
    
    // Check that RTL is properly applied
    const htmlDir = await page.getAttribute('html', 'dir');
    expect(htmlDir).toBe('rtl');
    
    // Run accessibility check on RTL layout
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    
    // Switch to French
    await page.click('[data-testid="language-switcher"]');
    await page.click('[data-testid="language-fr"]');
    
    await page.waitForTimeout(1000);
    
    // Run accessibility check on French layout
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Mobile accessibility', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check mobile-specific accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    
    // Test mobile navigation
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.count() > 0) {
      await mobileMenuButton.click();
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Check mobile menu accessibility
      await checkA11y(page, '[data-testid="mobile-menu"]', {
        detailedReport: true,
      });
    }
  });

  test('Error pages are accessible', async ({ page }) => {
    // Navigate to non-existent page to trigger 404
    await page.goto('/non-existent-page');
    
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    
    // Check that error page has proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for skip link or navigation back to main content
    const skipLink = page.locator('[href="#main"], [data-testid="back-to-home"]');
    const hasSkipLink = await skipLink.count() > 0;
    expect(hasSkipLink).toBe(true);
  });
});
