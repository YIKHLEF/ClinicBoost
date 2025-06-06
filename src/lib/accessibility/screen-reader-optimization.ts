/**
 * Screen Reader Optimization for Complex Components
 * 
 * This module provides advanced screen reader optimizations for complex UI components
 * including live region management, dynamic content announcements, and context-aware descriptions.
 */

import { announce, ariaManager } from './aria-attributes';

export interface LiveRegionConfig {
  id: string;
  element: HTMLElement;
  politeness: 'polite' | 'assertive' | 'off';
  atomic: boolean;
  relevant: string[];
  busy: boolean;
}

export interface TableNavigationContext {
  table: HTMLElement;
  currentRow: number;
  currentCell: number;
  totalRows: number;
  totalCells: number;
  headers: string[];
  sortColumn?: number;
  sortDirection?: 'asc' | 'desc';
}

export interface FormValidationContext {
  form: HTMLElement;
  field: HTMLElement;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  isRequired: boolean;
  fieldType: string;
}

export interface ModalContext {
  modal: HTMLElement;
  title: string;
  description?: string;
  role: 'dialog' | 'alertdialog';
  modal: boolean;
  returnFocus?: HTMLElement;
}

class ScreenReaderOptimization {
  private liveRegions = new Map<string, LiveRegionConfig>();
  private tableContexts = new Map<string, TableNavigationContext>();
  private formContexts = new Map<string, FormValidationContext>();
  private modalContexts = new Map<string, ModalContext>();
  private announcementQueue: string[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.setupGlobalLiveRegions();
    this.setupEventListeners();
  }

  /**
   * Setup global live regions for common announcements
   */
  private setupGlobalLiveRegions(): void {
    // Status announcements (polite)
    this.createLiveRegion('global-status', {
      politeness: 'polite',
      atomic: true,
      relevant: ['additions', 'text'],
    });

    // Alert announcements (assertive)
    this.createLiveRegion('global-alerts', {
      politeness: 'assertive',
      atomic: true,
      relevant: ['additions', 'text'],
    });

    // Navigation announcements (polite)
    this.createLiveRegion('navigation-status', {
      politeness: 'polite',
      atomic: false,
      relevant: ['additions'],
    });
  }

  /**
   * Setup event listeners for dynamic content changes
   */
  private setupEventListeners(): void {
    // Listen for DOM mutations to announce dynamic changes
    const observer = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded', 'aria-selected', 'aria-checked', 'aria-invalid'],
    });

    // Listen for focus changes to provide context
    document.addEventListener('focusin', (event) => {
      this.handleFocusChange(event.target as HTMLElement);
    });

    // Listen for form submissions and validations
    document.addEventListener('submit', (event) => {
      this.handleFormSubmission(event.target as HTMLFormElement);
    });

    // Listen for modal open/close events
    document.addEventListener('modal:open', (event: any) => {
      this.handleModalOpen(event.detail);
    });

    document.addEventListener('modal:close', (event: any) => {
      this.handleModalClose(event.detail);
    });
  }

  /**
   * Create live region
   */
  createLiveRegion(
    id: string,
    config: {
      politeness: 'polite' | 'assertive' | 'off';
      atomic?: boolean;
      relevant?: string[];
      container?: HTMLElement;
    }
  ): HTMLElement {
    const { politeness, atomic = true, relevant = ['additions', 'text'], container = document.body } = config;

    // Remove existing region if it exists
    this.removeLiveRegion(id);

    // Create new live region
    const region = document.createElement('div');
    region.id = `live-region-${id}`;
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', atomic.toString());
    region.setAttribute('aria-relevant', relevant.join(' '));
    region.className = 'sr-only';
    
    container.appendChild(region);

    const regionConfig: LiveRegionConfig = {
      id,
      element: region,
      politeness,
      atomic,
      relevant,
      busy: false,
    };

    this.liveRegions.set(id, regionConfig);
    return region;
  }

  /**
   * Remove live region
   */
  removeLiveRegion(id: string): void {
    const region = this.liveRegions.get(id);
    if (region && region.element.parentNode) {
      region.element.parentNode.removeChild(region.element);
      this.liveRegions.delete(id);
    }
  }

  /**
   * Announce to specific live region
   */
  announceToRegion(regionId: string, message: string, delay = 100): void {
    const region = this.liveRegions.get(regionId);
    if (!region) {
      console.warn(`Live region ${regionId} not found`);
      return;
    }

    // Clear previous content and set busy state
    region.element.textContent = '';
    region.busy = true;
    region.element.setAttribute('aria-busy', 'true');

    // Announce after delay to ensure screen readers pick it up
    setTimeout(() => {
      region.element.textContent = message;
      region.busy = false;
      region.element.setAttribute('aria-busy', 'false');
    }, delay);
  }

  /**
   * Enhanced table navigation announcements
   */
  setupTableNavigation(tableId: string, table: HTMLElement): void {
    const rows = Array.from(table.querySelectorAll('tr'));
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent || '');
    
    const context: TableNavigationContext = {
      table,
      currentRow: 0,
      currentCell: 0,
      totalRows: rows.length,
      totalCells: rows[0]?.children.length || 0,
      headers,
    };

    this.tableContexts.set(tableId, context);

    // Setup table-specific announcements
    table.addEventListener('focusin', (event) => {
      this.announceTablePosition(tableId, event.target as HTMLElement);
    });

    // Setup sorting announcements
    const sortableHeaders = table.querySelectorAll('th[aria-sort]');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        this.announceSortChange(tableId, header as HTMLElement);
      });
    });
  }

  /**
   * Announce table position and context
   */
  private announceTablePosition(tableId: string, cell: HTMLElement): void {
    const context = this.tableContexts.get(tableId);
    if (!context) return;

    const row = cell.closest('tr');
    const cellIndex = Array.from(row?.children || []).indexOf(cell);
    const rowIndex = Array.from(context.table.querySelectorAll('tr')).indexOf(row!);

    if (rowIndex >= 0 && cellIndex >= 0) {
      context.currentRow = rowIndex;
      context.currentCell = cellIndex;

      const header = context.headers[cellIndex] || `Column ${cellIndex + 1}`;
      const cellContent = cell.textContent?.trim() || 'Empty cell';
      const position = `Row ${rowIndex + 1} of ${context.totalRows}, ${header}`;
      
      this.announceToRegion('navigation-status', `${position}: ${cellContent}`);
    }
  }

  /**
   * Announce sort changes
   */
  private announceSortChange(tableId: string, header: HTMLElement): void {
    const context = this.tableContexts.get(tableId);
    if (!context) return;

    const sortDirection = header.getAttribute('aria-sort');
    const columnName = header.textContent?.trim() || 'Column';
    
    let announcement = '';
    switch (sortDirection) {
      case 'ascending':
        announcement = `Table sorted by ${columnName}, ascending order`;
        break;
      case 'descending':
        announcement = `Table sorted by ${columnName}, descending order`;
        break;
      default:
        announcement = `Table sort removed from ${columnName}`;
    }

    this.announceToRegion('global-status', announcement);
  }

  /**
   * Enhanced form validation announcements
   */
  setupFormValidation(formId: string, form: HTMLElement): void {
    const context: FormValidationContext = {
      form,
      field: form,
      errors: [],
      warnings: [],
      suggestions: [],
      isRequired: false,
      fieldType: 'form',
    };

    this.formContexts.set(formId, context);

    // Listen for field changes
    form.addEventListener('focusin', (event) => {
      this.announceFieldContext(formId, event.target as HTMLElement);
    });

    form.addEventListener('invalid', (event) => {
      this.announceValidationError(formId, event.target as HTMLElement);
    });

    form.addEventListener('input', (event) => {
      this.announceFieldChanges(formId, event.target as HTMLElement);
    });
  }

  /**
   * Announce field context and requirements
   */
  private announceFieldContext(formId: string, field: HTMLElement): void {
    const context = this.formContexts.get(formId);
    if (!context) return;

    context.field = field;
    context.isRequired = field.hasAttribute('required') || field.getAttribute('aria-required') === 'true';
    context.fieldType = field.tagName.toLowerCase();

    const label = this.getFieldLabel(field);
    const description = this.getFieldDescription(field);
    const requirements = this.getFieldRequirements(field);

    let announcement = label;
    if (context.isRequired) {
      announcement += ', required';
    }
    if (description) {
      announcement += `, ${description}`;
    }
    if (requirements) {
      announcement += `, ${requirements}`;
    }

    this.announceToRegion('navigation-status', announcement);
  }

  /**
   * Get field label
   */
  private getFieldLabel(field: HTMLElement): string {
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    const label = field.closest('label') || document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent || '';

    return field.getAttribute('placeholder') || field.tagName.toLowerCase();
  }

  /**
   * Get field description
   */
  private getFieldDescription(field: HTMLElement): string {
    const describedBy = field.getAttribute('aria-describedby');
    if (describedBy) {
      const descElement = document.getElementById(describedBy);
      if (descElement) return descElement.textContent || '';
    }
    return '';
  }

  /**
   * Get field requirements
   */
  private getFieldRequirements(field: HTMLElement): string {
    const requirements: string[] = [];
    
    if (field.getAttribute('type') === 'email') {
      requirements.push('email format required');
    }
    
    const minLength = field.getAttribute('minlength');
    if (minLength) {
      requirements.push(`minimum ${minLength} characters`);
    }
    
    const maxLength = field.getAttribute('maxlength');
    if (maxLength) {
      requirements.push(`maximum ${maxLength} characters`);
    }
    
    const pattern = field.getAttribute('pattern');
    if (pattern) {
      requirements.push('specific format required');
    }

    return requirements.join(', ');
  }

  /**
   * Announce validation errors
   */
  private announceValidationError(formId: string, field: HTMLElement): void {
    const context = this.formContexts.get(formId);
    if (!context) return;

    const validationMessage = (field as any).validationMessage || '';
    const customError = field.getAttribute('data-error-message') || '';
    const errorMessage = customError || validationMessage;

    if (errorMessage) {
      context.errors = [errorMessage];
      this.announceToRegion('global-alerts', `Error: ${errorMessage}`);
    }
  }

  /**
   * Announce field changes and live validation
   */
  private announceFieldChanges(formId: string, field: HTMLElement): void {
    const context = this.formContexts.get(formId);
    if (!context) return;

    // Debounce announcements for input fields
    clearTimeout((field as any)._validationTimeout);
    (field as any)._validationTimeout = setTimeout(() => {
      this.performLiveValidation(formId, field);
    }, 1000);
  }

  /**
   * Perform live validation and announce results
   */
  private performLiveValidation(formId: string, field: HTMLElement): void {
    const context = this.formContexts.get(formId);
    if (!context) return;

    const isValid = (field as any).checkValidity?.() !== false;
    const value = (field as any).value || '';

    if (isValid && value) {
      // Announce successful validation for complex fields
      if (field.getAttribute('type') === 'email' || field.hasAttribute('pattern')) {
        this.announceToRegion('global-status', 'Valid input');
      }
    }
  }

  /**
   * Handle form submission
   */
  private handleFormSubmission(form: HTMLFormElement): void {
    const isValid = form.checkValidity();

    if (!isValid) {
      const invalidFields = Array.from(form.querySelectorAll(':invalid'));
      const errorCount = invalidFields.length;

      this.announceToRegion('global-alerts',
        `Form submission failed. ${errorCount} field${errorCount > 1 ? 's' : ''} ${errorCount > 1 ? 'have' : 'has'} errors. Please review and correct.`
      );

      // Focus first invalid field
      if (invalidFields.length > 0) {
        (invalidFields[0] as HTMLElement).focus();
      }
    } else {
      this.announceToRegion('global-status', 'Form submitted successfully');
    }
  }

  /**
   * Enhanced modal announcements
   */
  setupModalAnnouncements(modalId: string, modal: HTMLElement): void {
    const title = modal.querySelector('h1, h2, h3, [role="heading"]')?.textContent || 'Dialog';
    const description = modal.querySelector('.modal-description, [data-modal-description]')?.textContent;
    const role = modal.getAttribute('role') as 'dialog' | 'alertdialog' || 'dialog';

    const context: ModalContext = {
      modal,
      title,
      description,
      role,
      modal: true,
      returnFocus: document.activeElement as HTMLElement,
    };

    this.modalContexts.set(modalId, context);
  }

  /**
   * Handle modal open
   */
  private handleModalOpen(modalId: string): void {
    const context = this.modalContexts.get(modalId);
    if (!context) return;

    let announcement = `${context.role === 'alertdialog' ? 'Alert dialog' : 'Dialog'} opened: ${context.title}`;

    if (context.description) {
      announcement += `. ${context.description}`;
    }

    announcement += '. Press Escape to close.';

    this.announceToRegion('global-alerts', announcement);
  }

  /**
   * Handle modal close
   */
  private handleModalClose(modalId: string): void {
    const context = this.modalContexts.get(modalId);
    if (!context) return;

    this.announceToRegion('global-status', `${context.title} dialog closed`);

    // Restore focus
    if (context.returnFocus) {
      context.returnFocus.focus();
    }
  }

  /**
   * Handle DOM changes for dynamic content
   */
  private handleDOMChanges(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        this.handleContentChanges(mutation);
      } else if (mutation.type === 'attributes') {
        this.handleAttributeChanges(mutation);
      }
    });
  }

  /**
   * Handle content changes
   */
  private handleContentChanges(mutation: MutationRecord): void {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        // Announce new alerts or important content
        if (element.matches('[role="alert"], .alert, .notification')) {
          const message = element.textContent?.trim();
          if (message) {
            this.announceToRegion('global-alerts', message);
          }
        }

        // Announce new status messages
        if (element.matches('[role="status"], .status-message')) {
          const message = element.textContent?.trim();
          if (message) {
            this.announceToRegion('global-status', message);
          }
        }
      }
    });
  }

  /**
   * Handle attribute changes
   */
  private handleAttributeChanges(mutation: MutationRecord): void {
    const element = mutation.target as HTMLElement;
    const attributeName = mutation.attributeName;

    switch (attributeName) {
      case 'aria-expanded':
        this.announceExpansionChange(element);
        break;
      case 'aria-selected':
        this.announceSelectionChange(element);
        break;
      case 'aria-checked':
        this.announceCheckChange(element);
        break;
      case 'aria-invalid':
        this.announceValidityChange(element);
        break;
    }
  }

  /**
   * Announce expansion state changes
   */
  private announceExpansionChange(element: HTMLElement): void {
    const expanded = element.getAttribute('aria-expanded') === 'true';
    const label = this.getElementLabel(element);

    this.announceToRegion('global-status',
      `${label} ${expanded ? 'expanded' : 'collapsed'}`
    );
  }

  /**
   * Announce selection changes
   */
  private announceSelectionChange(element: HTMLElement): void {
    const selected = element.getAttribute('aria-selected') === 'true';
    const label = this.getElementLabel(element);

    this.announceToRegion('global-status',
      `${label} ${selected ? 'selected' : 'deselected'}`
    );
  }

  /**
   * Announce check state changes
   */
  private announceCheckChange(element: HTMLElement): void {
    const checked = element.getAttribute('aria-checked');
    const label = this.getElementLabel(element);

    let state = '';
    switch (checked) {
      case 'true':
        state = 'checked';
        break;
      case 'false':
        state = 'unchecked';
        break;
      case 'mixed':
        state = 'partially checked';
        break;
    }

    this.announceToRegion('global-status', `${label} ${state}`);
  }

  /**
   * Announce validity changes
   */
  private announceValidityChange(element: HTMLElement): void {
    const invalid = element.getAttribute('aria-invalid') === 'true';
    const label = this.getElementLabel(element);

    if (invalid) {
      const errorMessage = element.getAttribute('data-error-message') || 'Invalid input';
      this.announceToRegion('global-alerts', `${label}: ${errorMessage}`);
    } else {
      this.announceToRegion('global-status', `${label} is now valid`);
    }
  }

  /**
   * Get element label for announcements
   */
  private getElementLabel(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.textContent?.trim() ||
           element.tagName.toLowerCase();
  }

  /**
   * Queue announcement to prevent overwhelming screen readers
   */
  queueAnnouncement(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    this.announcementQueue.push(message);

    if (!this.isProcessingQueue) {
      this.processAnnouncementQueue();
    }
  }

  /**
   * Process announcement queue
   */
  private async processAnnouncementQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const message = this.announcementQueue.shift();
      if (message) {
        this.announceToRegion('global-status', message);
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay between announcements
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.liveRegions.forEach(region => {
      if (region.element.parentNode) {
        region.element.parentNode.removeChild(region.element);
      }
    });

    this.liveRegions.clear();
    this.tableContexts.clear();
    this.formContexts.clear();
    this.modalContexts.clear();
    this.announcementQueue = [];
  }
}

// Export singleton instance
export const screenReaderOptimization = new ScreenReaderOptimization();

// Export utility functions
export const createLiveRegion = (id: string, config: any) =>
  screenReaderOptimization.createLiveRegion(id, config);

export const announceToRegion = (regionId: string, message: string, delay?: number) =>
  screenReaderOptimization.announceToRegion(regionId, message, delay);

export const setupTableNavigation = (tableId: string, table: HTMLElement) =>
  screenReaderOptimization.setupTableNavigation(tableId, table);

export const setupFormValidation = (formId: string, form: HTMLElement) =>
  screenReaderOptimization.setupFormValidation(formId, form);

export const setupModalAnnouncements = (modalId: string, modal: HTMLElement) =>
  screenReaderOptimization.setupModalAnnouncements(modalId, modal);

export const queueAnnouncement = (message: string, priority?: 'low' | 'medium' | 'high') =>
  screenReaderOptimization.queueAnnouncement(message, priority);
