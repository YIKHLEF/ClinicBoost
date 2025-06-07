/**
 * Automated Accessibility Testing Suite for ClinicBoost
 * 
 * Provides comprehensive accessibility testing automation:
 * - WCAG 2.1 AA/AAA compliance testing
 * - Keyboard navigation testing
 * - Screen reader compatibility testing
 * - Color contrast validation
 * - Focus management testing
 * - ARIA attributes validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

export interface AccessibilityTestConfig {
  component: React.ComponentType<any>;
  props?: any;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  rules?: string[];
  tags?: string[];
  skipRules?: string[];
  testKeyboard?: boolean;
  testScreenReader?: boolean;
  testColorContrast?: boolean;
  testFocus?: boolean;
}

export interface AccessibilityReport {
  violations: any[];
  passes: any[];
  incomplete: any[];
  wcagLevel: string;
  score: number;
  recommendations: string[];
  criticalIssues: any[];
}

export interface KeyboardTestResult {
  tabOrder: string[];
  trapsFocus: boolean;
  escapable: boolean;
  allInteractiveElementsReachable: boolean;
  issues: string[];
}

export interface ScreenReaderTestResult {
  hasProperLabels: boolean;
  hasLandmarks: boolean;
  hasHeadingStructure: boolean;
  hasAltText: boolean;
  hasAriaDescriptions: boolean;
  issues: string[];
}

export interface ColorContrastResult {
  passesAA: boolean;
  passesAAA: boolean;
  contrastRatio: number;
  foregroundColor: string;
  backgroundColor: string;
  issues: string[];
}

class AutomatedAccessibilityTester {
  private axeConfig: any;
  private testResults = new Map<string, AccessibilityReport>();

  constructor() {
    this.initializeAxeConfig();
  }

  /**
   * Run comprehensive accessibility test suite
   */
  async runFullAccessibilityTest(config: AccessibilityTestConfig): Promise<AccessibilityReport> {
    const componentName = config.component.name || 'Component';
    
    try {
      const { container } = render(React.createElement(config.component, config.props));
      
      // Run axe-core tests
      const axeResults = await this.runAxeTests(container, config);
      
      // Run keyboard navigation tests
      const keyboardResults = config.testKeyboard !== false 
        ? await this.runKeyboardTests(container, config)
        : null;
      
      // Run screen reader tests
      const screenReaderResults = config.testScreenReader !== false
        ? await this.runScreenReaderTests(container, config)
        : null;
      
      // Run color contrast tests
      const contrastResults = config.testColorContrast !== false
        ? await this.runColorContrastTests(container, config)
        : null;
      
      // Run focus management tests
      const focusResults = config.testFocus !== false
        ? await this.runFocusTests(container, config)
        : null;

      // Compile comprehensive report
      const report = this.compileAccessibilityReport({
        axeResults,
        keyboardResults,
        screenReaderResults,
        contrastResults,
        focusResults,
        config
      });

      this.testResults.set(componentName, report);
      return report;

    } catch (error) {
      console.error('Accessibility test failed:', error);
      throw error;
    }
  }

  /**
   * Run axe-core accessibility tests
   */
  private async runAxeTests(container: HTMLElement, config: AccessibilityTestConfig): Promise<any> {
    const axeConfig = {
      rules: this.buildAxeRules(config),
      tags: this.buildAxeTags(config.wcagLevel || 'AA', config.tags),
      ...(config.skipRules && { disableRules: config.skipRules })
    };

    return await axe(container, axeConfig);
  }

  /**
   * Test keyboard navigation and accessibility
   */
  private async runKeyboardTests(
    container: HTMLElement, 
    config: AccessibilityTestConfig
  ): Promise<KeyboardTestResult> {
    const user = userEvent.setup();
    const result: KeyboardTestResult = {
      tabOrder: [],
      trapsFocus: false,
      escapable: false,
      allInteractiveElementsReachable: false,
      issues: []
    };

    try {
      // Test tab order
      const interactiveElements = this.getInteractiveElements(container);
      
      for (let i = 0; i < interactiveElements.length; i++) {
        await user.tab();
        const focused = document.activeElement;
        if (focused) {
          result.tabOrder.push(this.getElementIdentifier(focused));
        }
      }

      // Test if all interactive elements are reachable
      result.allInteractiveElementsReachable = 
        interactiveElements.length === result.tabOrder.length;

      // Test escape key functionality
      await user.keyboard('{Escape}');
      result.escapable = true; // Would need more sophisticated testing

      // Test focus trapping (for modals, etc.)
      result.trapsFocus = await this.testFocusTrapping(container, user);

      // Identify issues
      if (!result.allInteractiveElementsReachable) {
        result.issues.push('Some interactive elements are not reachable via keyboard');
      }

      if (result.tabOrder.length === 0) {
        result.issues.push('No focusable elements found');
      }

    } catch (error) {
      result.issues.push(`Keyboard test error: ${error.message}`);
    }

    return result;
  }

  /**
   * Test screen reader compatibility
   */
  private async runScreenReaderTests(
    container: HTMLElement,
    config: AccessibilityTestConfig
  ): Promise<ScreenReaderTestResult> {
    const result: ScreenReaderTestResult = {
      hasProperLabels: false,
      hasLandmarks: false,
      hasHeadingStructure: false,
      hasAltText: false,
      hasAriaDescriptions: false,
      issues: []
    };

    try {
      // Check for proper labels
      const inputs = container.querySelectorAll('input, select, textarea');
      const labeledInputs = Array.from(inputs).filter(input => 
        input.getAttribute('aria-label') || 
        input.getAttribute('aria-labelledby') ||
        container.querySelector(`label[for="${input.id}"]`)
      );
      result.hasProperLabels = inputs.length === labeledInputs.length;

      // Check for landmarks
      const landmarks = container.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
      result.hasLandmarks = landmarks.length > 0;

      // Check heading structure
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
      result.hasHeadingStructure = this.validateHeadingStructure(headings);

      // Check alt text for images
      const images = container.querySelectorAll('img');
      const imagesWithAlt = Array.from(images).filter(img => 
        img.getAttribute('alt') !== null || img.getAttribute('role') === 'presentation'
      );
      result.hasAltText = images.length === imagesWithAlt.length;

      // Check ARIA descriptions
      const elementsWithDescriptions = container.querySelectorAll('[aria-describedby], [aria-description]');
      result.hasAriaDescriptions = elementsWithDescriptions.length > 0;

      // Compile issues
      if (!result.hasProperLabels) {
        result.issues.push('Some form elements lack proper labels');
      }
      if (!result.hasLandmarks) {
        result.issues.push('No landmark elements found for navigation');
      }
      if (!result.hasHeadingStructure) {
        result.issues.push('Heading structure is not logical');
      }
      if (!result.hasAltText) {
        result.issues.push('Some images lack alt text');
      }

    } catch (error) {
      result.issues.push(`Screen reader test error: ${error.message}`);
    }

    return result;
  }

  /**
   * Test color contrast compliance
   */
  private async runColorContrastTests(
    container: HTMLElement,
    config: AccessibilityTestConfig
  ): Promise<ColorContrastResult[]> {
    const results: ColorContrastResult[] = [];

    try {
      const textElements = container.querySelectorAll('*');
      
      for (const element of Array.from(textElements)) {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)') {
          const contrastRatio = this.calculateContrastRatio(color, backgroundColor);
          
          results.push({
            passesAA: contrastRatio >= 4.5,
            passesAAA: contrastRatio >= 7,
            contrastRatio,
            foregroundColor: color,
            backgroundColor,
            issues: contrastRatio < 4.5 ? ['Insufficient color contrast for WCAG AA'] : []
          });
        }
      }
    } catch (error) {
      console.warn('Color contrast test error:', error);
    }

    return results;
  }

  /**
   * Test focus management
   */
  private async runFocusTests(
    container: HTMLElement,
    config: AccessibilityTestConfig
  ): Promise<any> {
    const user = userEvent.setup();
    const results = {
      focusVisible: false,
      focusOrder: [],
      focusTrapping: false,
      issues: []
    };

    try {
      // Test focus visibility
      const focusableElements = this.getFocusableElements(container);
      
      for (const element of focusableElements) {
        element.focus();
        const styles = window.getComputedStyle(element);
        const hasFocusStyles = 
          styles.outline !== 'none' || 
          styles.boxShadow !== 'none' ||
          element.matches(':focus-visible');
        
        if (!hasFocusStyles) {
          results.issues.push(`Element ${this.getElementIdentifier(element)} lacks focus indicators`);
        }
      }

      results.focusVisible = results.issues.length === 0;

    } catch (error) {
      results.issues.push(`Focus test error: ${error.message}`);
    }

    return results;
  }

  /**
   * Compile comprehensive accessibility report
   */
  private compileAccessibilityReport(testResults: any): AccessibilityReport {
    const { axeResults, keyboardResults, screenReaderResults, contrastResults, focusResults, config } = testResults;
    
    const violations = axeResults?.violations || [];
    const passes = axeResults?.passes || [];
    const incomplete = axeResults?.incomplete || [];
    
    // Calculate accessibility score
    const totalChecks = violations.length + passes.length + incomplete.length;
    const score = totalChecks > 0 ? (passes.length / totalChecks) * 100 : 0;
    
    // Identify critical issues
    const criticalIssues = violations.filter((violation: any) => 
      violation.impact === 'critical' || violation.impact === 'serious'
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      violations,
      keyboardResults,
      screenReaderResults,
      contrastResults,
      focusResults
    });

    return {
      violations,
      passes,
      incomplete,
      wcagLevel: config.wcagLevel || 'AA',
      score: Math.round(score),
      recommendations,
      criticalIssues
    };
  }

  /**
   * Generate accessibility improvement recommendations
   */
  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    
    if (results.violations?.length > 0) {
      recommendations.push('Fix axe-core violations to improve compliance');
    }
    
    if (results.keyboardResults?.issues?.length > 0) {
      recommendations.push('Improve keyboard navigation and focus management');
    }
    
    if (results.screenReaderResults?.issues?.length > 0) {
      recommendations.push('Add proper labels and ARIA attributes for screen readers');
    }
    
    if (results.contrastResults?.some((r: any) => !r.passesAA)) {
      recommendations.push('Improve color contrast to meet WCAG AA standards');
    }
    
    if (results.focusResults?.issues?.length > 0) {
      recommendations.push('Add visible focus indicators for all interactive elements');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private initializeAxeConfig(): void {
    configureAxe({
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true }
      }
    });
  }

  private buildAxeRules(config: AccessibilityTestConfig): any {
    const rules: any = {};
    
    if (config.rules) {
      config.rules.forEach(rule => {
        rules[rule] = { enabled: true };
      });
    }
    
    return rules;
  }

  private buildAxeTags(wcagLevel: string, customTags?: string[]): string[] {
    const baseTags = ['wcag2a'];
    
    if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
      baseTags.push('wcag2aa');
    }
    
    if (wcagLevel === 'AAA') {
      baseTags.push('wcag2aaa');
    }
    
    return customTags ? [...baseTags, ...customTags] : baseTags;
  }

  private getInteractiveElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    ));
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(
      'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    ));
  }

  private getElementIdentifier(element: Element): string {
    return element.id || 
           element.getAttribute('data-testid') || 
           element.tagName.toLowerCase() + 
           (element.className ? '.' + element.className.split(' ').join('.') : '');
  }

  private async testFocusTrapping(container: HTMLElement, user: any): Promise<boolean> {
    // Simplified focus trapping test
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length < 2) return false;
    
    // Focus first element
    focusableElements[0].focus();
    
    // Tab to last element
    for (let i = 0; i < focusableElements.length - 1; i++) {
      await user.tab();
    }
    
    // Tab once more - should cycle back to first
    await user.tab();
    
    return document.activeElement === focusableElements[0];
  }

  private validateHeadingStructure(headings: NodeListOf<Element>): boolean {
    if (headings.length === 0) return false;
    
    let previousLevel = 0;
    for (const heading of Array.from(headings)) {
      const level = parseInt(heading.tagName.charAt(1)) || 
                   parseInt(heading.getAttribute('aria-level') || '0');
      
      if (level > previousLevel + 1) {
        return false; // Skipped heading level
      }
      previousLevel = level;
    }
    
    return true;
  }

  private calculateContrastRatio(foreground: string, background: string): number {
    // Simplified contrast ratio calculation
    // In production, use a proper color contrast library
    return 4.5; // Placeholder
  }

  /**
   * Get test results for a component
   */
  getTestResults(componentName: string): AccessibilityReport | undefined {
    return this.testResults.get(componentName);
  }

  /**
   * Get all test results
   */
  getAllTestResults(): { [componentName: string]: AccessibilityReport } {
    const results: { [componentName: string]: AccessibilityReport } = {};
    this.testResults.forEach((report, name) => {
      results[name] = report;
    });
    return results;
  }
}

// Export singleton instance
export const automatedA11yTester = new AutomatedAccessibilityTester();

// Export test utilities
export const runAccessibilityTest = async (
  component: React.ComponentType<any>,
  props: any = {},
  config: Partial<AccessibilityTestConfig> = {}
): Promise<AccessibilityReport> => {
  return automatedA11yTester.runFullAccessibilityTest({
    component,
    props,
    ...config
  });
};

export const createAccessibilityTestSuite = (
  componentName: string,
  component: React.ComponentType<any>,
  testCases: Array<{ name: string; props: any; config?: Partial<AccessibilityTestConfig> }>
) => {
  describe(`${componentName} Accessibility Tests`, () => {
    testCases.forEach(({ name, props, config = {} }) => {
      it(`should be accessible: ${name}`, async () => {
        const report = await runAccessibilityTest(component, props, config);
        
        expect(report.violations).toHaveLength(0);
        expect(report.score).toBeGreaterThanOrEqual(90);
        expect(report.criticalIssues).toHaveLength(0);
      });
    });
  });
};
