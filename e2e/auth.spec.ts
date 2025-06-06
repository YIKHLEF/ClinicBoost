/**
 * Authentication E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/');

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Should be automatically logged in
    await expect(newPage).toHaveURL('/');
    await expect(newPage.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.click('[data-testid="forgot-password-link"]');
    
    await expect(page).toHaveURL(/.*reset-password/);
    
    await page.fill('[data-testid="reset-email-input"]', 'admin@clinicboost.com');
    await page.click('[data-testid="send-reset-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Reset link sent');
  });

  test('should validate form fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

    // Test invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email');
  });

  test('should handle loading states', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'admin@clinicboost.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Click login and immediately check for loading state
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    // Check for proper labels
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // Check for proper ARIA attributes
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-required', 'true');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-required', 'true');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });
});
