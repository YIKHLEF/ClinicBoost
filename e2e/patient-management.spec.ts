/**
 * Patient Management E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to patients page
    await page.click('[data-testid="nav-patients"]');
    await expect(page).toHaveURL('/patients');
  });

  test('should display patients list', async ({ page }) => {
    await expect(page.locator('[data-testid="patients-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="patients-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-patient-button"]')).toBeVisible();
  });

  test('should create a new patient', async ({ page }) => {
    await page.click('[data-testid="add-patient-button"]');
    
    // Fill patient form
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.fill('[data-testid="email-input"]', 'john.doe@example.com');
    await page.fill('[data-testid="phone-input"]', '+212612345678');
    await page.fill('[data-testid="date-of-birth-input"]', '1990-01-01');
    await page.fill('[data-testid="address-input"]', '123 Main St');
    await page.fill('[data-testid="city-input"]', 'Casablanca');
    
    await page.click('[data-testid="save-patient-button"]');
    
    // Verify patient appears in list
    await expect(page.locator('[data-testid="patient-row"]').filter({ hasText: 'John Doe' })).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should edit existing patient', async ({ page }) => {
    // Assuming there's at least one patient
    await page.click('[data-testid="patient-row"]:first-child [data-testid="edit-button"]');
    
    // Update patient information
    await page.fill('[data-testid="first-name-input"]', 'Jane');
    await page.click('[data-testid="save-patient-button"]');
    
    // Verify update
    await expect(page.locator('[data-testid="patient-row"]').filter({ hasText: 'Jane' })).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should delete patient', async ({ page }) => {
    // Create a patient first
    await page.click('[data-testid="add-patient-button"]');
    await page.fill('[data-testid="first-name-input"]', 'ToDelete');
    await page.fill('[data-testid="last-name-input"]', 'Patient');
    await page.fill('[data-testid="email-input"]', 'delete@example.com');
    await page.fill('[data-testid="phone-input"]', '+212612345679');
    await page.click('[data-testid="save-patient-button"]');
    
    // Delete the patient
    await page.click('[data-testid="patient-row"]').filter({ hasText: 'ToDelete Patient' }).locator('[data-testid="delete-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify deletion
    await expect(page.locator('[data-testid="patient-row"]').filter({ hasText: 'ToDelete Patient' })).not.toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should search patients', async ({ page }) => {
    // Search for a patient
    await page.fill('[data-testid="search-input"]', 'John');
    
    // Verify search results
    await expect(page.locator('[data-testid="patient-row"]').filter({ hasText: 'John' })).toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await expect(page.locator('[data-testid="patient-row"]')).toHaveCount(2); // Assuming 2 patients total
  });

  test('should filter patients by city', async ({ page }) => {
    await page.selectOption('[data-testid="city-filter"]', 'Casablanca');
    
    // Verify filtered results
    const rows = page.locator('[data-testid="patient-row"]');
    await expect(rows).toHaveCount(1); // Assuming only one patient from Casablanca
  });

  test('should validate patient form', async ({ page }) => {
    await page.click('[data-testid="add-patient-button"]');
    
    // Try to save without required fields
    await page.click('[data-testid="save-patient-button"]');
    
    // Check for validation errors
    await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    
    // Test invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="save-patient-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');
    
    // Test invalid phone
    await page.fill('[data-testid="phone-input"]', '123');
    await page.click('[data-testid="save-patient-button"]');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Invalid phone');
  });

  test('should handle bulk operations', async ({ page }) => {
    // Select multiple patients
    await page.check('[data-testid="patient-checkbox"]:first-child');
    await page.check('[data-testid="patient-checkbox"]:nth-child(2)');
    
    // Verify bulk actions are available
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-delete-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-export-button"]')).toBeVisible();
  });

  test('should export patient data', async ({ page }) => {
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/patients.*\.csv/);
  });

  test('should navigate to patient details', async ({ page }) => {
    await page.click('[data-testid="patient-row"]:first-child [data-testid="view-button"]');
    
    // Verify navigation to patient details
    await expect(page).toHaveURL(/\/patients\/[^\/]+/);
    await expect(page.locator('[data-testid="patient-details"]')).toBeVisible();
  });

  test('should schedule appointment from patient page', async ({ page }) => {
    await page.click('[data-testid="patient-row"]:first-child [data-testid="schedule-button"]');
    
    // Verify appointment scheduler opens
    await expect(page.locator('[data-testid="appointment-scheduler"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-select"]')).toHaveValue(/./); // Should be pre-filled
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="patients-table"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check for proper headings
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for proper labels
    await page.click('[data-testid="add-patient-button"]');
    await expect(page.locator('label[for="first-name"]')).toBeVisible();
    await expect(page.locator('label[for="last-name"]')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="first-name-input"]')).toBeFocused();
    
    // Check ARIA attributes
    await expect(page.locator('[data-testid="patients-table"]')).toHaveAttribute('role', 'table');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/patients', route => route.abort());
    
    await page.reload();
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
