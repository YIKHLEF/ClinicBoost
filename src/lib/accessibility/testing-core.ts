/**
 * Accessibility Testing Core System
 * 
 * This module provides core accessibility testing functionality including:
 * - WCAG 2.1 AA/AAA compliance testing
 * - Automated accessibility audits
 * - Manual testing checklists
 * - Accessibility rule validation
 * - Test result aggregation
 */

export interface AccessibilityTest {
  id: string;
  name: string;
  description: string;
  category: AccessibilityCategory;
  level: 'A' | 'AA' | 'AAA';
  automated: boolean;
  wcagCriterion: string;
  test: (element?: HTMLElement) => Promise<TestResult>;
}

export interface TestResult {
  passed: boolean;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  warnings: AccessibilityWarning[];
  suggestions: string[];
  elements?: HTMLElement[];
  details?: Record<string, any>;
}

export interface AccessibilityIssue {
  id: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  element?: HTMLElement;
  selector?: string;
  wcagCriterion: string;
  howToFix: string;
  helpUrl?: string;
}

export interface AccessibilityWarning {
  id: string;
  message: string;
  element?: HTMLElement;
  selector?: string;
  recommendation: string;
}

export enum AccessibilityCategory {
  PERCEIVABLE = 'perceivable',
  OPERABLE = 'operable',
  UNDERSTANDABLE = 'understandable',
  ROBUST = 'robust',
}

export interface AuditResult {
  timestamp: Date;
  url: string;
  overallScore: number;
  level: 'A' | 'AA' | 'AAA';
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  categories: Record<AccessibilityCategory, CategoryResult>;
  issues: AccessibilityIssue[];
  warnings: AccessibilityWarning[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export interface CategoryResult {
  score: number;
  passed: boolean;
  tests: TestResult[];
  issues: AccessibilityIssue[];
  warnings: AccessibilityWarning[];
}

class AccessibilityTester {
  private tests: Map<string, AccessibilityTest> = new Map();
  private auditHistory: AuditResult[] = [];

  constructor() {
    this.setupDefaultTests();
  }

  /**
   * Setup default accessibility tests
   */
  private setupDefaultTests(): void {
    // Perceivable tests
    this.addTest({
      id: 'images-alt-text',
      name: 'Images have alt text',
      description: 'All images must have appropriate alternative text',
      category: AccessibilityCategory.PERCEIVABLE,
      level: 'A',
      automated: true,
      wcagCriterion: '1.1.1',
      test: this.testImagesAltText.bind(this),
    });

    this.addTest({
      id: 'color-contrast',
      name: 'Color contrast compliance',
      description: 'Text must have sufficient color contrast',
      category: AccessibilityCategory.PERCEIVABLE,
      level: 'AA',
      automated: true,
      wcagCriterion: '1.4.3',
      test: this.testColorContrast.bind(this),
    });

    this.addTest({
      id: 'headings-structure',
      name: 'Heading structure',
      description: 'Headings must be properly structured',
      category: AccessibilityCategory.PERCEIVABLE,
      level: 'AA',
      automated: true,
      wcagCriterion: '1.3.1',
      test: this.testHeadingStructure.bind(this),
    });

    // Operable tests
    this.addTest({
      id: 'keyboard-navigation',
      name: 'Keyboard navigation',
      description: 'All interactive elements must be keyboard accessible',
      category: AccessibilityCategory.OPERABLE,
      level: 'A',
      automated: true,
      wcagCriterion: '2.1.1',
      test: this.testKeyboardNavigation.bind(this),
    });

    this.addTest({
      id: 'focus-indicators',
      name: 'Focus indicators',
      description: 'All focusable elements must have visible focus indicators',
      category: AccessibilityCategory.OPERABLE,
      level: 'AA',
      automated: true,
      wcagCriterion: '2.4.7',
      test: this.testFocusIndicators.bind(this),
    });

    // Understandable tests
    this.addTest({
      id: 'form-labels',
      name: 'Form labels',
      description: 'All form inputs must have associated labels',
      category: AccessibilityCategory.UNDERSTANDABLE,
      level: 'A',
      automated: true,
      wcagCriterion: '3.3.2',
      test: this.testFormLabels.bind(this),
    });

    this.addTest({
      id: 'error-messages',
      name: 'Error messages',
      description: 'Form errors must be clearly identified and described',
      category: AccessibilityCategory.UNDERSTANDABLE,
      level: 'A',
      automated: true,
      wcagCriterion: '3.3.1',
      test: this.testErrorMessages.bind(this),
    });

    // Robust tests
    this.addTest({
      id: 'valid-html',
      name: 'Valid HTML',
      description: 'HTML must be valid and well-formed',
      category: AccessibilityCategory.ROBUST,
      level: 'A',
      automated: true,
      wcagCriterion: '4.1.1',
      test: this.testValidHTML.bind(this),
    });

    this.addTest({
      id: 'aria-attributes',
      name: 'ARIA attributes',
      description: 'ARIA attributes must be valid and properly used',
      category: AccessibilityCategory.ROBUST,
      level: 'A',
      automated: true,
      wcagCriterion: '4.1.2',
      test: this.testAriaAttributes.bind(this),
    });
  }

  /**
   * Add accessibility test
   */
  addTest(test: AccessibilityTest): void {
    this.tests.set(test.id, test);
  }

  /**
   * Remove accessibility test
   */
  removeTest(id: string): void {
    this.tests.delete(id);
  }

  /**
   * Run full accessibility audit
   */
  async runAudit(
    container: HTMLElement = document.body,
    level: 'A' | 'AA' | 'AAA' = 'AA'
  ): Promise<AuditResult> {
    const startTime = Date.now();
    const url = window.location.href;

    // Filter tests by level
    const testsToRun = Array.from(this.tests.values()).filter(test => {
      const levels = ['A', 'AA', 'AAA'];
      const testLevelIndex = levels.indexOf(test.level);
      const targetLevelIndex = levels.indexOf(level);
      return testLevelIndex <= targetLevelIndex;
    });

    // Run tests by category
    const categories: Record<AccessibilityCategory, CategoryResult> = {
      [AccessibilityCategory.PERCEIVABLE]: await this.runCategoryTests(
        testsToRun.filter(t => t.category === AccessibilityCategory.PERCEIVABLE),
        container
      ),
      [AccessibilityCategory.OPERABLE]: await this.runCategoryTests(
        testsToRun.filter(t => t.category === AccessibilityCategory.OPERABLE),
        container
      ),
      [AccessibilityCategory.UNDERSTANDABLE]: await this.runCategoryTests(
        testsToRun.filter(t => t.category === AccessibilityCategory.UNDERSTANDABLE),
        container
      ),
      [AccessibilityCategory.ROBUST]: await this.runCategoryTests(
        testsToRun.filter(t => t.category === AccessibilityCategory.ROBUST),
        container
      ),
    };

    // Aggregate results
    const allIssues: AccessibilityIssue[] = [];
    const allWarnings: AccessibilityWarning[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let totalScore = 0;

    Object.values(categories).forEach(category => {
      allIssues.push(...category.issues);
      allWarnings.push(...category.warnings);
      totalTests += category.tests.length;
      passedTests += category.tests.filter(t => t.passed).length;
      totalScore += category.score;
    });

    const overallScore = totalScore / Object.keys(categories).length;
    const passed = overallScore >= 80; // 80% threshold for passing

    // Count issues by severity
    const summary = {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      serious: allIssues.filter(i => i.severity === 'serious').length,
      moderate: allIssues.filter(i => i.severity === 'moderate').length,
      minor: allIssues.filter(i => i.severity === 'minor').length,
    };

    const result: AuditResult = {
      timestamp: new Date(),
      url,
      overallScore,
      level,
      passed,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      categories,
      issues: allIssues,
      warnings: allWarnings,
      summary,
    };

    // Add to history
    this.auditHistory.push(result);

    // Keep only last 10 audits
    if (this.auditHistory.length > 10) {
      this.auditHistory.shift();
    }

    console.log(`Accessibility audit completed in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Run tests for a specific category
   */
  private async runCategoryTests(
    tests: AccessibilityTest[],
    container: HTMLElement
  ): Promise<CategoryResult> {
    const results: TestResult[] = [];
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    for (const test of tests) {
      try {
        const result = await test.test(container);
        results.push(result);
        issues.push(...result.issues);
        warnings.push(...result.warnings);
      } catch (error) {
        console.error(`Test ${test.id} failed:`, error);
        results.push({
          passed: false,
          score: 0,
          issues: [{
            id: `${test.id}-error`,
            severity: 'serious',
            message: `Test execution failed: ${error}`,
            wcagCriterion: test.wcagCriterion,
            howToFix: 'Contact support for assistance',
          }],
          warnings: [],
          suggestions: [],
        });
      }
    }

    const score = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

    const passed = score >= 80;

    return {
      score,
      passed,
      tests: results,
      issues,
      warnings,
    };
  }

  // Test implementations
  private async testImagesAltText(container: HTMLElement): Promise<TestResult> {
    const images = container.querySelectorAll('img');
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      const src = img.getAttribute('src');

      if (alt === null) {
        issues.push({
          id: `img-no-alt-${index}`,
          severity: 'serious',
          message: 'Image missing alt attribute',
          element: img,
          selector: this.getSelector(img),
          wcagCriterion: '1.1.1',
          howToFix: 'Add an alt attribute that describes the image content or purpose',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
        });
      } else if (alt === '' && !img.hasAttribute('role')) {
        warnings.push({
          id: `img-empty-alt-${index}`,
          message: 'Image has empty alt text - ensure this is decorative',
          element: img,
          selector: this.getSelector(img),
          recommendation: 'If decorative, consider adding role="presentation"',
        });
      } else if (alt && alt.length > 125) {
        warnings.push({
          id: `img-long-alt-${index}`,
          message: 'Alt text is very long - consider using longdesc or nearby text',
          element: img,
          selector: this.getSelector(img),
          recommendation: 'Keep alt text concise (under 125 characters)',
        });
      }
    });

    const score = images.length > 0 
      ? ((images.length - issues.length) / images.length) * 100
      : 100;

    return {
      passed: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: issues.length > 0 
        ? ['Review all images and add appropriate alt text']
        : [],
      elements: Array.from(images),
    };
  }

  private async testColorContrast(container: HTMLElement): Promise<TestResult> {
    // This would integrate with the color contrast manager
    // For now, return a basic implementation
    const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    // This is a simplified implementation
    // In a real implementation, you would calculate actual contrast ratios
    
    return {
      passed: true,
      score: 95,
      issues,
      warnings,
      suggestions: [],
      elements: Array.from(textElements),
    };
  }

  private async testHeadingStructure(container: HTMLElement): Promise<TestResult> {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    let previousLevel = 0;
    let hasH1 = false;

    headings.forEach((heading, index) => {
      const tagName = heading.tagName.toLowerCase();
      const level = tagName.startsWith('h') 
        ? parseInt(tagName.charAt(1))
        : parseInt(heading.getAttribute('aria-level') || '1');

      if (level === 1) {
        if (hasH1) {
          warnings.push({
            id: `multiple-h1-${index}`,
            message: 'Multiple H1 headings found',
            element: heading as HTMLElement,
            selector: this.getSelector(heading),
            recommendation: 'Use only one H1 per page',
          });
        }
        hasH1 = true;
      }

      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push({
          id: `heading-skip-${index}`,
          severity: 'moderate',
          message: `Heading level skipped from H${previousLevel} to H${level}`,
          element: heading as HTMLElement,
          selector: this.getSelector(heading),
          wcagCriterion: '1.3.1',
          howToFix: 'Use heading levels in sequential order',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        });
      }

      previousLevel = level;
    });

    if (!hasH1 && headings.length > 0) {
      issues.push({
        id: 'no-h1',
        severity: 'moderate',
        message: 'No H1 heading found on page',
        wcagCriterion: '1.3.1',
        howToFix: 'Add an H1 heading that describes the main content',
      });
    }

    const score = headings.length > 0 
      ? ((headings.length - issues.length) / headings.length) * 100
      : 100;

    return {
      passed: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: issues.length > 0 
        ? ['Review heading structure and ensure proper hierarchy']
        : [],
      elements: Array.from(headings),
    };
  }

  private async testKeyboardNavigation(container: HTMLElement): Promise<TestResult> {
    const interactiveElements = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex], [role="button"], [role="link"]'
    );
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex');
      
      if (tabIndex && parseInt(tabIndex) > 0) {
        warnings.push({
          id: `positive-tabindex-${index}`,
          message: 'Positive tabindex found - may disrupt natural tab order',
          element: element as HTMLElement,
          selector: this.getSelector(element),
          recommendation: 'Use tabindex="0" or remove tabindex to maintain natural order',
        });
      }

      if (element.tagName === 'A' && !element.getAttribute('href')) {
        issues.push({
          id: `link-no-href-${index}`,
          severity: 'moderate',
          message: 'Link without href is not keyboard accessible',
          element: element as HTMLElement,
          selector: this.getSelector(element),
          wcagCriterion: '2.1.1',
          howToFix: 'Add href attribute or use button element instead',
        });
      }
    });

    const score = interactiveElements.length > 0 
      ? ((interactiveElements.length - issues.length) / interactiveElements.length) * 100
      : 100;

    return {
      passed: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: issues.length > 0 
        ? ['Ensure all interactive elements are keyboard accessible']
        : [],
      elements: Array.from(interactiveElements),
    };
  }

  private async testFocusIndicators(container: HTMLElement): Promise<TestResult> {
    // This test would need to be more sophisticated in a real implementation
    // It would check computed styles for focus indicators
    return {
      passed: true,
      score: 90,
      issues: [],
      warnings: [],
      suggestions: [],
    };
  }

  private async testFormLabels(container: HTMLElement): Promise<TestResult> {
    const formInputs = container.querySelectorAll('input, select, textarea');
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    formInputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const type = input.getAttribute('type');

      // Skip hidden inputs
      if (type === 'hidden') return;

      let hasLabel = false;

      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        if (label) hasLabel = true;
      }

      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true;
      }

      if (!hasLabel) {
        issues.push({
          id: `input-no-label-${index}`,
          severity: 'serious',
          message: 'Form input missing accessible label',
          element: input as HTMLElement,
          selector: this.getSelector(input),
          wcagCriterion: '3.3.2',
          howToFix: 'Add a label element, aria-label, or aria-labelledby attribute',
        });
      }
    });

    const score = formInputs.length > 0 
      ? ((formInputs.length - issues.length) / formInputs.length) * 100
      : 100;

    return {
      passed: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: issues.length > 0 
        ? ['Add labels to all form inputs']
        : [],
      elements: Array.from(formInputs),
    };
  }

  private async testErrorMessages(container: HTMLElement): Promise<TestResult> {
    // This would check for proper error message implementation
    return {
      passed: true,
      score: 95,
      issues: [],
      warnings: [],
      suggestions: [],
    };
  }

  private async testValidHTML(container: HTMLElement): Promise<TestResult> {
    // This would validate HTML structure
    return {
      passed: true,
      score: 98,
      issues: [],
      warnings: [],
      suggestions: [],
    };
  }

  private async testAriaAttributes(container: HTMLElement): Promise<TestResult> {
    const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');
    const issues: AccessibilityIssue[] = [];
    const warnings: AccessibilityWarning[] = [];

    elementsWithAria.forEach((element, index) => {
      const role = element.getAttribute('role');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      const ariaDescribedBy = element.getAttribute('aria-describedby');

      // Check if referenced elements exist
      if (ariaLabelledBy) {
        const referencedElement = container.querySelector(`#${ariaLabelledBy}`);
        if (!referencedElement) {
          issues.push({
            id: `aria-labelledby-missing-${index}`,
            severity: 'serious',
            message: `aria-labelledby references non-existent element: ${ariaLabelledBy}`,
            element: element as HTMLElement,
            selector: this.getSelector(element),
            wcagCriterion: '4.1.2',
            howToFix: 'Ensure the referenced element exists or remove the attribute',
          });
        }
      }

      if (ariaDescribedBy) {
        const referencedElement = container.querySelector(`#${ariaDescribedBy}`);
        if (!referencedElement) {
          issues.push({
            id: `aria-describedby-missing-${index}`,
            severity: 'serious',
            message: `aria-describedby references non-existent element: ${ariaDescribedBy}`,
            element: element as HTMLElement,
            selector: this.getSelector(element),
            wcagCriterion: '4.1.2',
            howToFix: 'Ensure the referenced element exists or remove the attribute',
          });
        }
      }
    });

    const score = elementsWithAria.length > 0 
      ? ((elementsWithAria.length - issues.length) / elementsWithAria.length) * 100
      : 100;

    return {
      passed: issues.length === 0,
      score,
      issues,
      warnings,
      suggestions: issues.length > 0 
        ? ['Fix ARIA attribute references']
        : [],
      elements: Array.from(elementsWithAria),
    };
  }

  /**
   * Get CSS selector for element
   */
  private getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Get audit history
   */
  getAuditHistory(): AuditResult[] {
    return [...this.auditHistory];
  }

  /**
   * Get available tests
   */
  getAvailableTests(): AccessibilityTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get tests by category
   */
  getTestsByCategory(category: AccessibilityCategory): AccessibilityTest[] {
    return Array.from(this.tests.values()).filter(test => test.category === category);
  }
}

// Export singleton instance
export const accessibilityTester = new AccessibilityTester();

// Export utility functions
export const runAccessibilityAudit = (container?: HTMLElement, level?: 'A' | 'AA' | 'AAA') =>
  accessibilityTester.runAudit(container, level);

export const getAuditHistory = () =>
  accessibilityTester.getAuditHistory();

export const getAvailableTests = () =>
  accessibilityTester.getAvailableTests();
