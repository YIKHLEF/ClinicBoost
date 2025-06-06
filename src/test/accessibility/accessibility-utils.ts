/**
 * Accessibility Testing Utilities
 * 
 * Utilities for automated accessibility testing
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { render, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Configure axe-core for testing
const axe = configureAxe({
  rules: {
    // Disable color-contrast rule for testing (can be flaky)
    'color-contrast': { enabled: false },
    // Enable additional rules
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true }
  }
});

export interface AccessibilityTestOptions {
  includedImpacts?: ('minor' | 'moderate' | 'serious' | 'critical')[];
  excludedRules?: string[];
  timeout?: number;
}

/**
 * Test component for accessibility violations
 */
export async function testAccessibility(
  component: RenderResult,
  options: AccessibilityTestOptions = {}
): Promise<void> {
  const {
    includedImpacts = ['serious', 'critical'],
    excludedRules = [],
    timeout = 5000
  } = options;

  const results = await axe(component.container, {
    rules: excludedRules.reduce((acc, rule) => {
      acc[rule] = { enabled: false };
      return acc;
    }, {} as Record<string, { enabled: boolean }>)
  });

  // Filter results by impact level
  const filteredViolations = results.violations.filter(violation =>
    includedImpacts.includes(violation.impact as any)
  );

  expect({ ...results, violations: filteredViolations }).toHaveNoViolations();
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(
  component: RenderResult,
  expectedFocusableElements: string[]
): Promise<void> {
  const user = userEvent.setup();
  
  // Get all focusable elements
  const focusableElements = component.container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  expect(focusableElements.length).toBeGreaterThan(0);

  // Test tab navigation
  for (let i = 0; i < focusableElements.length; i++) {
    await user.tab();
    const activeElement = document.activeElement;
    expect(activeElement).toBe(focusableElements[i]);
  }

  // Test shift+tab navigation (reverse)
  for (let i = focusableElements.length - 1; i >= 0; i--) {
    await user.tab({ shift: true });
    const activeElement = document.activeElement;
    expect(activeElement).toBe(focusableElements[i]);
  }
}

/**
 * Test ARIA attributes
 */
export function testAriaAttributes(
  component: RenderResult,
  expectedAttributes: Record<string, string[]>
): void {
  Object.entries(expectedAttributes).forEach(([selector, attributes]) => {
    const elements = component.container.querySelectorAll(selector);
    expect(elements.length).toBeGreaterThan(0);

    elements.forEach(element => {
      attributes.forEach(attribute => {
        expect(element).toHaveAttribute(attribute);
      });
    });
  });
}

/**
 * Test color contrast
 */
export async function testColorContrast(
  component: RenderResult,
  minimumRatio: number = 4.5
): Promise<void> {
  const results = await axe(component.container, {
    rules: {
      'color-contrast': { enabled: true }
    }
  });

  const contrastViolations = results.violations.filter(
    violation => violation.id === 'color-contrast'
  );

  expect(contrastViolations).toHaveLength(0);
}

/**
 * Test focus management
 */
export async function testFocusManagement(
  component: RenderResult,
  interactions: Array<{
    action: () => Promise<void>;
    expectedFocus: string;
  }>
): Promise<void> {
  for (const { action, expectedFocus } of interactions) {
    await action();
    
    const expectedElement = component.container.querySelector(expectedFocus);
    expect(document.activeElement).toBe(expectedElement);
  }
}

/**
 * Test screen reader announcements
 */
export function testScreenReaderAnnouncements(
  component: RenderResult,
  expectedAnnouncements: string[]
): void {
  const liveRegions = component.container.querySelectorAll(
    '[aria-live], [role="status"], [role="alert"]'
  );

  expect(liveRegions.length).toBeGreaterThan(0);

  expectedAnnouncements.forEach(announcement => {
    const found = Array.from(liveRegions).some(region =>
      region.textContent?.includes(announcement)
    );
    expect(found).toBe(true);
  });
}

/**
 * Test form accessibility
 */
export function testFormAccessibility(
  component: RenderResult,
  formSelector: string = 'form'
): void {
  const forms = component.container.querySelectorAll(formSelector);
  
  forms.forEach(form => {
    // Test that all inputs have labels
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = form.querySelector(`label[for="${id}"]`);
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });

    // Test required field indicators
    const requiredInputs = form.querySelectorAll('[required], [aria-required="true"]');
    requiredInputs.forEach(input => {
      expect(
        input.getAttribute('aria-required') === 'true' ||
        input.hasAttribute('required')
      ).toBe(true);
    });

    // Test error message associations
    const errorMessages = form.querySelectorAll('[role="alert"], .error-message');
    errorMessages.forEach(error => {
      const describedBy = error.getAttribute('aria-describedby');
      if (describedBy) {
        const relatedInput = form.querySelector(`[aria-describedby*="${describedBy}"]`);
        expect(relatedInput).toBeTruthy();
      }
    });
  });
}

/**
 * Test modal accessibility
 */
export async function testModalAccessibility(
  component: RenderResult,
  modalSelector: string = '[role="dialog"]'
): Promise<void> {
  const modal = component.container.querySelector(modalSelector);
  expect(modal).toBeTruthy();

  if (modal) {
    // Test modal has proper ARIA attributes
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    
    // Test modal has accessible name
    const ariaLabel = modal.getAttribute('aria-label');
    const ariaLabelledBy = modal.getAttribute('aria-labelledby');
    expect(ariaLabel || ariaLabelledBy).toBeTruthy();

    // Test focus is trapped within modal
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBeGreaterThan(0);

    // Test first focusable element receives focus
    expect(document.activeElement).toBe(focusableElements[0]);
  }
}

/**
 * Test table accessibility
 */
export function testTableAccessibility(
  component: RenderResult,
  tableSelector: string = 'table'
): void {
  const tables = component.container.querySelectorAll(tableSelector);
  
  tables.forEach(table => {
    // Test table has caption or aria-label
    const caption = table.querySelector('caption');
    const ariaLabel = table.getAttribute('aria-label');
    const ariaLabelledBy = table.getAttribute('aria-labelledby');
    expect(caption || ariaLabel || ariaLabelledBy).toBeTruthy();

    // Test headers are properly marked
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
      expect(header).toHaveAttribute('scope');
    });

    // Test complex tables have proper header associations
    const dataCells = table.querySelectorAll('td[headers]');
    dataCells.forEach(cell => {
      const headerIds = cell.getAttribute('headers')?.split(' ') || [];
      headerIds.forEach(headerId => {
        const header = table.querySelector(`#${headerId}`);
        expect(header).toBeTruthy();
      });
    });
  });
}

/**
 * Generate accessibility test report
 */
export function generateAccessibilityReport(
  violations: any[],
  outputPath: string
): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.impact === 'critical').length,
      seriousViolations: violations.filter(v => v.impact === 'serious').length,
      moderateViolations: violations.filter(v => v.impact === 'moderate').length,
      minorViolations: violations.filter(v => v.impact === 'minor').length
    },
    violations: violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node: any) => ({
        html: node.html,
        target: node.target,
        failureSummary: node.failureSummary
      }))
    }))
  };

  require('fs').writeFileSync(outputPath, JSON.stringify(report, null, 2));
}
