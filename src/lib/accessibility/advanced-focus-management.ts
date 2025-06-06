/**
 * Advanced Focus Management for Modals and Dynamic Content
 * 
 * This module provides sophisticated focus management including:
 * - Modal focus restoration with context preservation
 * - Dynamic content focus handling
 * - Toast notification focus management
 * - Focus history and navigation
 * - Intelligent focus prediction
 */

import { focusManager } from './focus-management';
import { announce } from './aria-attributes';

export interface FocusContext {
  id: string;
  element: HTMLElement;
  timestamp: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface ModalFocusConfig {
  modalId: string;
  modal: HTMLElement;
  restoreFocus: boolean;
  autoFocus: boolean;
  initialFocus?: HTMLElement;
  finalFocus?: HTMLElement;
  containFocus: boolean;
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
}

export interface ToastFocusConfig {
  toastId: string;
  toast: HTMLElement;
  autoFocus: boolean;
  duration?: number;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface DynamicContentConfig {
  containerId: string;
  container: HTMLElement;
  focusOnUpdate: boolean;
  announceChanges: boolean;
  preserveScroll: boolean;
  focusTarget?: 'first' | 'last' | 'heading' | 'custom';
  customFocusSelector?: string;
}

class AdvancedFocusManagement {
  private focusHistory: FocusContext[] = [];
  private modalStack: ModalFocusConfig[] = [];
  private activeToasts = new Map<string, ToastFocusConfig>();
  private dynamicContainers = new Map<string, DynamicContentConfig>();
  private focusObserver?: MutationObserver;
  private maxHistorySize = 50;

  constructor() {
    this.setupEventListeners();
    this.setupFocusObserver();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Track focus changes
    document.addEventListener('focusin', (event) => {
      this.recordFocusChange(event.target as HTMLElement, 'user-interaction');
    });

    // Handle escape key for modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey(event);
      }
    });

    // Handle outside clicks for modals
    document.addEventListener('click', (event) => {
      this.handleOutsideClick(event);
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.restoreLastFocus();
      }
    });
  }

  /**
   * Setup focus observer for dynamic content
   */
  private setupFocusObserver(): void {
    this.focusObserver = new MutationObserver((mutations) => {
      this.handleDynamicContentChanges(mutations);
    });

    this.focusObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'hidden', 'disabled'],
    });
  }

  /**
   * Record focus change in history
   */
  private recordFocusChange(element: HTMLElement, reason: string, metadata?: Record<string, any>): void {
    const context: FocusContext = {
      id: this.generateContextId(),
      element,
      timestamp: Date.now(),
      reason,
      metadata,
    };

    this.focusHistory.push(context);

    // Limit history size
    if (this.focusHistory.length > this.maxHistorySize) {
      this.focusHistory.shift();
    }
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `focus-context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Open modal with advanced focus management
   */
  openModal(config: ModalFocusConfig): void {
    const { modalId, modal, restoreFocus, autoFocus, initialFocus, containFocus } = config;

    // Record current focus for restoration
    if (restoreFocus) {
      this.recordFocusChange(
        document.activeElement as HTMLElement,
        'modal-open-restore-point',
        { modalId }
      );
    }

    // Add to modal stack
    this.modalStack.push(config);

    // Setup modal attributes
    modal.setAttribute('role', modal.getAttribute('role') || 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('tabindex', '-1');

    // Create focus trap if needed
    if (containFocus) {
      focusManager.createFocusTrap(modal, `modal-${modalId}`, {
        restoreFocus: false, // We handle this ourselves
        autoFocus: false,   // We handle this ourselves
      });
    }

    // Show modal
    modal.style.display = 'block';
    modal.removeAttribute('aria-hidden');

    // Focus management
    if (autoFocus) {
      const focusTarget = initialFocus || this.findInitialFocusTarget(modal);
      if (focusTarget) {
        this.focusElementWithContext(focusTarget, 'modal-open', { modalId });
      } else {
        this.focusElementWithContext(modal, 'modal-open-fallback', { modalId });
      }
    }

    // Activate focus trap
    if (containFocus) {
      focusManager.activateFocusTrap(`modal-${modalId}`);
    }

    // Announce modal opening
    const title = modal.querySelector('h1, h2, h3, [role="heading"]')?.textContent || 'Dialog';
    announce(`${title} dialog opened`, 'assertive');
  }

  /**
   * Close modal with focus restoration
   */
  closeModal(modalId: string): void {
    const configIndex = this.modalStack.findIndex(config => config.modalId === modalId);
    if (configIndex === -1) return;

    const config = this.modalStack[configIndex];
    const { modal, restoreFocus, finalFocus, containFocus } = config;

    // Deactivate focus trap
    if (containFocus) {
      focusManager.deactivateFocusTrap(`modal-${modalId}`);
    }

    // Hide modal
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    // Remove from stack
    this.modalStack.splice(configIndex, 1);

    // Focus restoration
    if (restoreFocus) {
      const restoreTarget = finalFocus || this.findRestoreFocusTarget(modalId);
      if (restoreTarget) {
        this.focusElementWithContext(restoreTarget, 'modal-close-restore', { modalId });
      }
    }

    // Announce modal closing
    const title = modal.querySelector('h1, h2, h3, [role="heading"]')?.textContent || 'Dialog';
    announce(`${title} dialog closed`, 'polite');
  }

  /**
   * Find initial focus target in modal
   */
  private findInitialFocusTarget(modal: HTMLElement): HTMLElement | null {
    // Priority order for initial focus
    const selectors = [
      '[autofocus]',
      '[data-initial-focus]',
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    for (const selector of selectors) {
      const element = modal.querySelector(selector) as HTMLElement;
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Find focus restoration target
   */
  private findRestoreFocusTarget(modalId: string): HTMLElement | null {
    // Find the focus context from when modal was opened
    const restoreContext = this.focusHistory
      .reverse()
      .find(context => 
        context.reason === 'modal-open-restore-point' && 
        context.metadata?.modalId === modalId
      );

    if (restoreContext && this.isElementVisible(restoreContext.element)) {
      return restoreContext.element;
    }

    // Fallback to document body or main content
    const main = document.querySelector('main, [role="main"]') as HTMLElement;
    return main || document.body;
  }

  /**
   * Show toast with focus management
   */
  showToast(config: ToastFocusConfig): void {
    const { toastId, toast, autoFocus, duration, priority, actionable } = config;

    // Setup toast attributes
    toast.setAttribute('role', actionable ? 'alertdialog' : 'alert');
    toast.setAttribute('aria-live', priority === 'high' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    // Add to active toasts
    this.activeToasts.set(toastId, config);

    // Show toast
    toast.style.display = 'block';
    toast.removeAttribute('aria-hidden');

    // Focus management for actionable toasts
    if (autoFocus && actionable) {
      const focusTarget = this.findToastFocusTarget(toast);
      if (focusTarget) {
        this.recordFocusChange(
          document.activeElement as HTMLElement,
          'toast-show-restore-point',
          { toastId }
        );
        this.focusElementWithContext(focusTarget, 'toast-show', { toastId });
      }
    }

    // Auto-hide toast
    if (duration && duration > 0) {
      setTimeout(() => {
        this.hideToast(toastId);
      }, duration);
    }

    // Announce toast (handled by aria-live region)
  }

  /**
   * Hide toast with focus restoration
   */
  hideToast(toastId: string): void {
    const config = this.activeToasts.get(toastId);
    if (!config) return;

    const { toast, actionable } = config;

    // Hide toast
    toast.style.display = 'none';
    toast.setAttribute('aria-hidden', 'true');

    // Focus restoration for actionable toasts
    if (actionable) {
      const restoreTarget = this.findToastRestoreFocusTarget(toastId);
      if (restoreTarget) {
        this.focusElementWithContext(restoreTarget, 'toast-hide-restore', { toastId });
      }
    }

    // Remove from active toasts
    this.activeToasts.delete(toastId);
  }

  /**
   * Find toast focus target
   */
  private findToastFocusTarget(toast: HTMLElement): HTMLElement | null {
    const button = toast.querySelector('button:not([disabled])') as HTMLElement;
    if (button) return button;

    const link = toast.querySelector('a[href]') as HTMLElement;
    if (link) return link;

    return null;
  }

  /**
   * Find toast restore focus target
   */
  private findToastRestoreFocusTarget(toastId: string): HTMLElement | null {
    const restoreContext = this.focusHistory
      .reverse()
      .find(context => 
        context.reason === 'toast-show-restore-point' && 
        context.metadata?.toastId === toastId
      );

    if (restoreContext && this.isElementVisible(restoreContext.element)) {
      return restoreContext.element;
    }

    return document.activeElement as HTMLElement;
  }

  /**
   * Setup dynamic content focus management
   */
  setupDynamicContent(config: DynamicContentConfig): void {
    this.dynamicContainers.set(config.containerId, config);
  }

  /**
   * Handle dynamic content changes
   */
  private handleDynamicContentChanges(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        this.handleContentAddition(mutation);
      }
    });
  }

  /**
   * Handle content addition
   */
  private handleContentAddition(mutation: MutationRecord): void {
    const container = this.findDynamicContainer(mutation.target as HTMLElement);
    if (!container) return;

    const config = this.dynamicContainers.get(container.id);
    if (!config || !config.focusOnUpdate) return;

    // Find focus target in new content
    const focusTarget = this.findDynamicContentFocusTarget(container, config);
    if (focusTarget) {
      // Delay focus to allow content to settle
      setTimeout(() => {
        this.focusElementWithContext(focusTarget, 'dynamic-content-update', {
          containerId: container.id
        });
      }, 100);
    }

    // Announce changes if configured
    if (config.announceChanges) {
      announce('Content updated', 'polite');
    }
  }

  /**
   * Find dynamic container for element
   */
  private findDynamicContainer(element: HTMLElement): HTMLElement | null {
    for (const [id, config] of this.dynamicContainers) {
      if (config.container.contains(element)) {
        return config.container;
      }
    }
    return null;
  }

  /**
   * Find focus target in dynamic content
   */
  private findDynamicContentFocusTarget(container: HTMLElement, config: DynamicContentConfig): HTMLElement | null {
    switch (config.focusTarget) {
      case 'first':
        return this.findFirstFocusableElement(container);
      case 'last':
        return this.findLastFocusableElement(container);
      case 'heading':
        return container.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]') as HTMLElement;
      case 'custom':
        return config.customFocusSelector ? 
          container.querySelector(config.customFocusSelector) as HTMLElement : null;
      default:
        return this.findFirstFocusableElement(container);
    }
  }

  /**
   * Find first focusable element
   */
  private findFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    for (const selector of focusableSelectors) {
      const element = container.querySelector(selector) as HTMLElement;
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Find last focusable element
   */
  private findLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const allFocusable: HTMLElement[] = [];

    focusableSelectors.forEach(selector => {
      const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
      allFocusable.push(...elements.filter(el => this.isElementVisible(el)));
    });

    return allFocusable.length > 0 ? allFocusable[allFocusable.length - 1] : null;
  }

  /**
   * Focus element with context recording
   */
  private focusElementWithContext(element: HTMLElement, reason: string, metadata?: Record<string, any>): void {
    focusManager.focusElement(element, 'programmatic', reason);
    this.recordFocusChange(element, reason, metadata);
  }

  /**
   * Check if element is visible and focusable
   */
  private isElementVisible(element: HTMLElement): boolean {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           element.offsetParent !== null &&
           !element.hasAttribute('aria-hidden') &&
           !element.hasAttribute('disabled');
  }

  /**
   * Handle escape key
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // Close topmost modal that allows escape
    for (let i = this.modalStack.length - 1; i >= 0; i--) {
      const config = this.modalStack[i];
      if (config.closeOnEscape) {
        event.preventDefault();
        this.closeModal(config.modalId);
        break;
      }
    }

    // Close high-priority toasts
    this.activeToasts.forEach((config, toastId) => {
      if (config.priority === 'high' && config.actionable) {
        this.hideToast(toastId);
      }
    });
  }

  /**
   * Handle outside click
   */
  private handleOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Check if click is outside any modal that allows outside click closing
    for (let i = this.modalStack.length - 1; i >= 0; i--) {
      const config = this.modalStack[i];
      if (config.closeOnOutsideClick && !config.modal.contains(target)) {
        this.closeModal(config.modalId);
        break;
      }
    }
  }

  /**
   * Restore last focus when page becomes visible
   */
  private restoreLastFocus(): void {
    if (this.focusHistory.length === 0) return;

    const lastContext = this.focusHistory[this.focusHistory.length - 1];
    if (this.isElementVisible(lastContext.element)) {
      this.focusElementWithContext(lastContext.element, 'page-visibility-restore');
    }
  }

  /**
   * Navigate focus history
   */
  navigateFocusHistory(direction: 'back' | 'forward', steps = 1): void {
    if (this.focusHistory.length < 2) return;

    const currentIndex = this.focusHistory.length - 1;
    let targetIndex: number;

    if (direction === 'back') {
      targetIndex = Math.max(0, currentIndex - steps);
    } else {
      targetIndex = Math.min(this.focusHistory.length - 1, currentIndex + steps);
    }

    const targetContext = this.focusHistory[targetIndex];
    if (targetContext && this.isElementVisible(targetContext.element)) {
      this.focusElementWithContext(
        targetContext.element,
        `history-navigation-${direction}`,
        { steps, originalReason: targetContext.reason }
      );
    }
  }

  /**
   * Get focus history
   */
  getFocusHistory(): FocusContext[] {
    return [...this.focusHistory];
  }

  /**
   * Clear focus history
   */
  clearFocusHistory(): void {
    this.focusHistory = [];
  }

  /**
   * Get active modals
   */
  getActiveModals(): ModalFocusConfig[] {
    return [...this.modalStack];
  }

  /**
   * Get active toasts
   */
  getActiveToasts(): Map<string, ToastFocusConfig> {
    return new Map(this.activeToasts);
  }

  /**
   * Close all modals
   */
  closeAllModals(): void {
    // Close in reverse order (topmost first)
    for (let i = this.modalStack.length - 1; i >= 0; i--) {
      this.closeModal(this.modalStack[i].modalId);
    }
  }

  /**
   * Hide all toasts
   */
  hideAllToasts(): void {
    const toastIds = Array.from(this.activeToasts.keys());
    toastIds.forEach(toastId => this.hideToast(toastId));
  }

  /**
   * Focus prediction based on context
   */
  predictNextFocus(currentElement: HTMLElement, action: string): HTMLElement | null {
    // Simple prediction logic - can be enhanced with ML
    switch (action) {
      case 'form-submit':
        return this.findNextFormField(currentElement) ||
               document.querySelector('[data-next-focus]') as HTMLElement;

      case 'tab-change':
        return this.findTabContent(currentElement);

      case 'accordion-expand':
        return this.findAccordionContent(currentElement);

      default:
        return null;
    }
  }

  /**
   * Find next form field
   */
  private findNextFormField(currentElement: HTMLElement): HTMLElement | null {
    const form = currentElement.closest('form');
    if (!form) return null;

    const formElements = Array.from(form.querySelectorAll('input, select, textarea, button')) as HTMLElement[];
    const currentIndex = formElements.indexOf(currentElement);

    if (currentIndex >= 0 && currentIndex < formElements.length - 1) {
      return formElements[currentIndex + 1];
    }

    return null;
  }

  /**
   * Find tab content
   */
  private findTabContent(tabElement: HTMLElement): HTMLElement | null {
    const controls = tabElement.getAttribute('aria-controls');
    if (controls) {
      return document.getElementById(controls);
    }
    return null;
  }

  /**
   * Find accordion content
   */
  private findAccordionContent(accordionElement: HTMLElement): HTMLElement | null {
    const controls = accordionElement.getAttribute('aria-controls');
    if (controls) {
      const content = document.getElementById(controls);
      if (content) {
        return this.findFirstFocusableElement(content) || content;
      }
    }
    return null;
  }

  /**
   * Remove dynamic content container
   */
  removeDynamicContent(containerId: string): void {
    this.dynamicContainers.delete(containerId);
  }

  /**
   * Update modal configuration
   */
  updateModalConfig(modalId: string, updates: Partial<ModalFocusConfig>): void {
    const configIndex = this.modalStack.findIndex(config => config.modalId === modalId);
    if (configIndex >= 0) {
      this.modalStack[configIndex] = { ...this.modalStack[configIndex], ...updates };
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.closeAllModals();
    this.hideAllToasts();
    this.clearFocusHistory();
    this.dynamicContainers.clear();

    if (this.focusObserver) {
      this.focusObserver.disconnect();
    }
  }
}

// Export singleton instance
export const advancedFocusManagement = new AdvancedFocusManagement();

// Export utility functions
export const openModal = (config: ModalFocusConfig) =>
  advancedFocusManagement.openModal(config);

export const closeModal = (modalId: string) =>
  advancedFocusManagement.closeModal(modalId);

export const showToast = (config: ToastFocusConfig) =>
  advancedFocusManagement.showToast(config);

export const hideToast = (toastId: string) =>
  advancedFocusManagement.hideToast(toastId);

export const setupDynamicContent = (config: DynamicContentConfig) =>
  advancedFocusManagement.setupDynamicContent(config);

export const navigateFocusHistory = (direction: 'back' | 'forward', steps?: number) =>
  advancedFocusManagement.navigateFocusHistory(direction, steps);

export const predictNextFocus = (currentElement: HTMLElement, action: string) =>
  advancedFocusManagement.predictNextFocus(currentElement, action);
