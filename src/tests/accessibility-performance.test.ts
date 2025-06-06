/**
 * Comprehensive Accessibility & Performance Tests
 * 
 * This test suite validates all the advanced accessibility and performance
 * monitoring features implemented in the clinic management system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { advancedKeyboardNavigation } from '../lib/accessibility/advanced-keyboard-navigation';
import { screenReaderOptimization } from '../lib/accessibility/screen-reader-optimization';
import { enhancedHighContrast } from '../lib/accessibility/enhanced-high-contrast';
import { advancedFocusManagement } from '../lib/accessibility/advanced-focus-management';
import { advancedPerformanceMonitoring } from '../lib/performance/advanced-monitoring';

// Mock DOM environment
const mockElement = (tag: string, attributes: Record<string, string> = {}) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

describe('Advanced Keyboard Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should create data grid navigation', () => {
    const container = mockElement('div', { role: 'grid' });
    const row1 = mockElement('div', { role: 'row' });
    const row2 = mockElement('div', { role: 'row' });
    
    const cell1 = mockElement('div', { role: 'gridcell' });
    const cell2 = mockElement('div', { role: 'gridcell' });
    const cell3 = mockElement('div', { role: 'gridcell' });
    const cell4 = mockElement('div', { role: 'gridcell' });
    
    row1.appendChild(cell1);
    row1.appendChild(cell2);
    row2.appendChild(cell3);
    row2.appendChild(cell4);
    
    container.appendChild(row1);
    container.appendChild(row2);
    document.body.appendChild(container);

    advancedKeyboardNavigation.createDataGrid('test-grid', container);
    
    const dataGrids = advancedKeyboardNavigation.getDataGrids();
    expect(dataGrids.has('test-grid')).toBe(true);
    
    const grid = dataGrids.get('test-grid');
    expect(grid?.rows.length).toBe(2);
    expect(grid?.cells.length).toBe(2);
    expect(grid?.cells[0].length).toBe(2);
  });

  it('should create tree view navigation', () => {
    const container = mockElement('div', { role: 'tree' });
    const node1 = mockElement('div', { role: 'treeitem', id: 'node1', 'aria-level': '1' });
    const node2 = mockElement('div', { role: 'treeitem', id: 'node2', 'aria-level': '2' });
    
    container.appendChild(node1);
    container.appendChild(node2);
    document.body.appendChild(container);

    advancedKeyboardNavigation.createTreeView('test-tree', container);
    
    const treeViews = advancedKeyboardNavigation.getTreeViews();
    expect(treeViews.has('test-tree')).toBe(true);
    
    const tree = treeViews.get('test-tree');
    expect(tree?.nodes.size).toBe(2);
  });

  it('should create carousel navigation', () => {
    const container = mockElement('div');
    const slide1 = mockElement('div', { class: 'slide' });
    const slide2 = mockElement('div', { class: 'slide' });
    
    container.appendChild(slide1);
    container.appendChild(slide2);
    document.body.appendChild(container);

    advancedKeyboardNavigation.createCarousel('test-carousel', container);
    
    const carousels = advancedKeyboardNavigation.getCarousels();
    expect(carousels.has('test-carousel')).toBe(true);
    
    const carousel = carousels.get('test-carousel');
    expect(carousel?.slides.length).toBe(2);
  });

  it('should handle clinic-specific shortcuts', () => {
    const mockAction = vi.fn();
    advancedKeyboardNavigation.addClinicShortcut('ctrl+shift+t', mockAction);
    
    const shortcuts = advancedKeyboardNavigation.getClinicShortcuts();
    expect(shortcuts.has('ctrl+shift+t')).toBe(true);
  });
});

describe('Screen Reader Optimization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should create live regions', () => {
    const region = screenReaderOptimization.createLiveRegion('test-region', {
      politeness: 'polite',
      atomic: true,
    });

    expect(region).toBeDefined();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
  });

  it('should setup table navigation', () => {
    const table = mockElement('table');
    const thead = mockElement('thead');
    const tbody = mockElement('tbody');
    const headerRow = mockElement('tr');
    const dataRow = mockElement('tr');
    
    const th1 = mockElement('th');
    th1.textContent = 'Name';
    const th2 = mockElement('th');
    th2.textContent = 'Age';
    
    const td1 = mockElement('td');
    td1.textContent = 'John';
    const td2 = mockElement('td');
    td2.textContent = '30';
    
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    dataRow.appendChild(td1);
    dataRow.appendChild(td2);
    
    thead.appendChild(headerRow);
    tbody.appendChild(dataRow);
    table.appendChild(thead);
    table.appendChild(tbody);
    document.body.appendChild(table);

    expect(() => {
      screenReaderOptimization.setupTableNavigation('test-table', table);
    }).not.toThrow();
  });

  it('should setup form validation', () => {
    const form = mockElement('form');
    const input = mockElement('input', { type: 'email', required: 'true' });
    
    form.appendChild(input);
    document.body.appendChild(form);

    expect(() => {
      screenReaderOptimization.setupFormValidation('test-form', form);
    }).not.toThrow();
  });

  it('should queue announcements', () => {
    expect(() => {
      screenReaderOptimization.queueAnnouncement('Test announcement', 'medium');
    }).not.toThrow();
  });
});

describe('Enhanced High Contrast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('should enable high contrast mode', () => {
    enhancedHighContrast.enableHighContrast();
    
    const settings = enhancedHighContrast.getSettings();
    expect(settings.enabled).toBe(true);
    expect(document.body.classList.contains('high-contrast')).toBe(true);
  });

  it('should disable high contrast mode', () => {
    enhancedHighContrast.enableHighContrast();
    enhancedHighContrast.disableHighContrast();
    
    const settings = enhancedHighContrast.getSettings();
    expect(settings.enabled).toBe(false);
    expect(document.body.classList.contains('high-contrast')).toBe(false);
  });

  it('should toggle high contrast mode', () => {
    const initialSettings = enhancedHighContrast.getSettings();
    enhancedHighContrast.toggleHighContrast();
    
    const newSettings = enhancedHighContrast.getSettings();
    expect(newSettings.enabled).toBe(!initialSettings.enabled);
  });

  it('should create custom theme', () => {
    enhancedHighContrast.createCustomTheme('test-theme', 'Test Theme', {
      background: '#000000',
      foreground: '#ffffff',
    });
    
    const themes = enhancedHighContrast.getAvailableThemes();
    const customTheme = themes.find(theme => theme.id === 'test-theme');
    expect(customTheme).toBeDefined();
    expect(customTheme?.name).toBe('Test Theme');
  });

  it('should add image alternatives', () => {
    expect(() => {
      enhancedHighContrast.addImageAlternative(
        'test-image',
        '/images/test.png',
        '/images/test-high-contrast.png',
        'Test image in high contrast'
      );
    }).not.toThrow();
  });
});

describe('Advanced Focus Management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should open and close modals', () => {
    const modal = mockElement('div', { role: 'dialog' });
    const button = mockElement('button');
    button.textContent = 'Close';
    modal.appendChild(button);
    document.body.appendChild(modal);

    advancedFocusManagement.openModal({
      modalId: 'test-modal',
      modal,
      restoreFocus: true,
      autoFocus: true,
      containFocus: true,
      closeOnEscape: true,
      closeOnOutsideClick: false,
    });

    const activeModals = advancedFocusManagement.getActiveModals();
    expect(activeModals.length).toBe(1);
    expect(activeModals[0].modalId).toBe('test-modal');

    advancedFocusManagement.closeModal('test-modal');
    
    const activeModalsAfterClose = advancedFocusManagement.getActiveModals();
    expect(activeModalsAfterClose.length).toBe(0);
  });

  it('should show and hide toasts', () => {
    const toast = mockElement('div', { role: 'alert' });
    const button = mockElement('button');
    button.textContent = 'Action';
    toast.appendChild(button);
    document.body.appendChild(toast);

    advancedFocusManagement.showToast({
      toastId: 'test-toast',
      toast,
      autoFocus: true,
      priority: 'medium',
      actionable: true,
    });

    const activeToasts = advancedFocusManagement.getActiveToasts();
    expect(activeToasts.has('test-toast')).toBe(true);

    advancedFocusManagement.hideToast('test-toast');
    
    const activeToastsAfterHide = advancedFocusManagement.getActiveToasts();
    expect(activeToastsAfterHide.has('test-toast')).toBe(false);
  });

  it('should setup dynamic content', () => {
    const container = mockElement('div', { id: 'dynamic-container' });
    document.body.appendChild(container);

    expect(() => {
      advancedFocusManagement.setupDynamicContent({
        containerId: 'dynamic-container',
        container,
        focusOnUpdate: true,
        announceChanges: true,
        preserveScroll: false,
        focusTarget: 'first',
      });
    }).not.toThrow();
  });

  it('should navigate focus history', () => {
    const button1 = mockElement('button');
    const button2 = mockElement('button');
    document.body.appendChild(button1);
    document.body.appendChild(button2);

    // Simulate focus changes
    button1.focus();
    button2.focus();

    expect(() => {
      advancedFocusManagement.navigateFocusHistory('back', 1);
    }).not.toThrow();
  });
});

describe('Advanced Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track custom metrics', () => {
    expect(() => {
      advancedPerformanceMonitoring.trackCustomMetric('test-metric', 100, 'ms', { test: 'true' });
    }).not.toThrow();

    const metrics = advancedPerformanceMonitoring.getMetrics('test-metric');
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].name).toBe('test-metric');
    expect(metrics[0].value).toBe(100);
  });

  it('should track business events', () => {
    expect(() => {
      advancedPerformanceMonitoring.trackBusinessEvent('user-login', 'user-engagement');
    }).not.toThrow();

    const businessMetrics = advancedPerformanceMonitoring.getBusinessMetrics('user-login');
    expect(businessMetrics.length).toBeGreaterThan(0);
    expect(businessMetrics[0].category).toBe('user-engagement');
  });

  it('should add and remove performance budgets', () => {
    advancedPerformanceMonitoring.addBudget('test-budget', 1000, 'ms', 'warning');
    
    // Trigger a metric that violates the budget
    advancedPerformanceMonitoring.trackCustomMetric('test-budget', 1500, 'ms');
    
    const alerts = advancedPerformanceMonitoring.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    advancedPerformanceMonitoring.removeBudget('test-budget');
  });

  it('should export metrics', () => {
    advancedPerformanceMonitoring.trackCustomMetric('export-test', 50, 'ms');
    
    const exportedData = advancedPerformanceMonitoring.exportMetrics();
    expect(exportedData).toHaveProperty('performance');
    expect(exportedData).toHaveProperty('business');
    expect(exportedData).toHaveProperty('alerts');
    expect(exportedData).toHaveProperty('session');
    expect(exportedData).toHaveProperty('timestamp');
  });

  it('should get performance summary', () => {
    const summary = advancedPerformanceMonitoring.getPerformanceSummary();
    expect(summary).toHaveProperty('coreWebVitals');
    expect(summary).toHaveProperty('customMetrics');
    expect(summary).toHaveProperty('businessMetrics');
    expect(summary).toHaveProperty('alerts');
    expect(summary).toHaveProperty('budgetViolations');
  });

  it('should set user ID', () => {
    expect(() => {
      advancedPerformanceMonitoring.setUserId('test-user-123');
    }).not.toThrow();
  });

  it('should clear metrics', () => {
    advancedPerformanceMonitoring.trackCustomMetric('clear-test', 25, 'ms');
    advancedPerformanceMonitoring.clearMetrics();
    
    const metrics = advancedPerformanceMonitoring.getMetrics();
    expect(metrics.length).toBe(0);
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should integrate accessibility and performance monitoring', () => {
    // Setup a complex UI component
    const modal = mockElement('div', { role: 'dialog', id: 'integration-modal' });
    const form = mockElement('form');
    const input = mockElement('input', { type: 'text', required: 'true' });
    const button = mockElement('button');
    button.textContent = 'Submit';
    
    form.appendChild(input);
    form.appendChild(button);
    modal.appendChild(form);
    document.body.appendChild(modal);

    // Setup accessibility features
    advancedFocusManagement.openModal({
      modalId: 'integration-modal',
      modal,
      restoreFocus: true,
      autoFocus: true,
      containFocus: true,
      closeOnEscape: true,
      closeOnOutsideClick: false,
    });

    screenReaderOptimization.setupFormValidation('integration-form', form);
    
    // Track performance
    const startTime = performance.now();
    advancedPerformanceMonitoring.trackCustomMetric('modal-open-time', startTime, 'ms');
    
    // Verify integration
    const activeModals = advancedFocusManagement.getActiveModals();
    expect(activeModals.length).toBe(1);
    
    const metrics = advancedPerformanceMonitoring.getMetrics('modal-open-time');
    expect(metrics.length).toBeGreaterThan(0);
    
    // Cleanup
    advancedFocusManagement.closeModal('integration-modal');
  });
});
