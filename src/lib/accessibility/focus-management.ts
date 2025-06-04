/**
 * Advanced Focus Management System
 * 
 * This module provides comprehensive focus management including:
 * - Focus trapping for modals and dialogs
 * - Focus restoration after interactions
 * - Skip links and focus shortcuts
 * - Focus indicators and visual feedback
 * - Programmatic focus management
 * - Focus history and navigation
 * - WCAG 2.1 AA focus compliance
 */

import { announce } from './aria-attributes';

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  originalTabIndex: number;
  rect: DOMRect;
  isVisible: boolean;
  isEnabled: boolean;
}

export interface FocusGroup {
  id: string;
  elements: HTMLElement[];
  currentIndex: number;
  orientation: 'horizontal' | 'vertical' | 'both';
  wrap: boolean;
  autoFocus: boolean;
}

export interface FocusTrap {
  id: string;
  container: HTMLElement;
  focusableElements: HTMLElement[];
  firstFocusable: HTMLElement;
  lastFocusable: HTMLElement;
  previousFocus: HTMLElement | null;
  restoreFocus: boolean;
  autoFocus: boolean;
  active: boolean;
}

export interface FocusHistory {
  element: HTMLElement;
  timestamp: number;
  reason: 'user' | 'programmatic' | 'restoration';
  context?: string;
}

class FocusManager {
  private focusTraps: Map<string, FocusTrap> = new Map();
  private focusGroups: Map<string, FocusGroup> = new Map();
  private focusHistory: FocusHistory[] = [];
  private currentFocus: HTMLElement | null = null;
  private focusIndicatorStyle: HTMLStyleElement | null = null;
  private skipLinks: HTMLElement[] = [];

  // Focusable element selectors
  private readonly focusableSelectors = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
    'audio[controls]:not([tabindex="-1"])',
    'video[controls]:not([tabindex="-1"])',
    'iframe:not([tabindex="-1"])',
    'object:not([tabindex="-1"])',
    'embed:not([tabindex="-1"])',
    'area[href]:not([tabindex="-1"])',
    'summary:not([tabindex="-1"])',
    '[role="button"]:not([tabindex="-1"])',
    '[role="link"]:not([tabindex="-1"])',
    '[role="menuitem"]:not([tabindex="-1"])',
    '[role="tab"]:not([tabindex="-1"])',
  ].join(', ');

  constructor() {
    this.setupEventListeners();
    this.createFocusIndicatorStyles();
    this.createSkipLinks();
    this.setupFocusObserver();
  }

  /**
   * Setup event listeners for focus management
   */
  private setupEventListeners(): void {
    // Track focus changes
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));

    // Handle keyboard navigation
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Handle mouse interactions
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));

    // Handle visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle focus in events
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target) return;

    this.currentFocus = target;
    
    // Add to focus history
    this.addToFocusHistory(target, 'user');

    // Update focus group if applicable
    this.updateFocusGroup(target);

    // Ensure element is visible
    this.ensureElementVisible(target);

    // Announce focus change for screen readers
    this.announceFocusChange(target);
  }

  /**
   * Handle focus out events
   */
  private handleFocusOut(event: FocusEvent): void {
    // Implementation for focus out handling
    const target = event.target as HTMLElement;
    
    // Remove temporary focus indicators
    target.classList.remove('focus-visible');
  }

  /**
   * Handle keydown events for focus management
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Add focus-visible class for keyboard navigation
    if (event.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
      
      // Handle focus trapping
      this.handleFocusTrapNavigation(event);
    }

    // Handle escape key
    if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }

    // Handle focus group navigation
    this.handleFocusGroupNavigation(event);
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(): void {
    document.body.classList.remove('keyboard-navigation');
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Store current focus when page becomes hidden
      if (this.currentFocus) {
        this.addToFocusHistory(this.currentFocus, 'programmatic', 'page-hidden');
      }
    } else {
      // Restore focus when page becomes visible
      this.restoreLastFocus();
    }
  }

  /**
   * Create focus indicator styles
   */
  private createFocusIndicatorStyles(): void {
    this.focusIndicatorStyle = document.createElement('style');
    this.focusIndicatorStyle.textContent = `
      /* Focus indicators */
      .keyboard-navigation *:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }

      .keyboard-navigation *:focus:not(:focus-visible) {
        outline: none;
      }

      .focus-visible {
        outline: 2px solid #0066cc !important;
        outline-offset: 2px !important;
      }

      /* High contrast focus indicators */
      .high-contrast *:focus,
      .high-contrast .focus-visible {
        outline: 3px solid #ffff00 !important;
        outline-offset: 2px !important;
        background-color: #000000 !important;
        color: #ffffff !important;
      }

      /* Skip links */
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 1000;
      }

      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        z-index: 1001;
      }

      .skip-link:focus {
        top: 6px;
      }

      /* Focus trap indicator */
      .focus-trap-active {
        position: relative;
      }

      .focus-trap-active::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px dashed #0066cc;
        pointer-events: none;
        z-index: 1000;
      }
    `;
    
    document.head.appendChild(this.focusIndicatorStyle);
  }

  /**
   * Create skip links for better navigation
   */
  private createSkipLinks(): void {
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('aria-label', 'Skip navigation links');

    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' },
      { href: '#footer', text: 'Skip to footer' },
    ];

    skipLinks.forEach(({ href, text }) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.className = 'skip-link';
      
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(href) as HTMLElement;
        if (target) {
          this.focusElement(target, 'programmatic', 'skip-link');
        }
      });
      
      skipLinksContainer.appendChild(link);
      this.skipLinks.push(link);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  /**
   * Setup focus observer for dynamic content
   */
  private setupFocusObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              this.updateFocusableElements(element);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Create focus trap
   */
  createFocusTrap(
    container: HTMLElement,
    id: string,
    options: {
      restoreFocus?: boolean;
      autoFocus?: boolean;
      initialFocus?: HTMLElement;
    } = {}
  ): void {
    const {
      restoreFocus = true,
      autoFocus = true,
      initialFocus,
    } = options;

    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      console.warn(`No focusable elements found in focus trap container: ${id}`);
      return;
    }

    const trap: FocusTrap = {
      id,
      container,
      focusableElements,
      firstFocusable: focusableElements[0],
      lastFocusable: focusableElements[focusableElements.length - 1],
      previousFocus: this.currentFocus,
      restoreFocus,
      autoFocus,
      active: false,
    };

    this.focusTraps.set(id, trap);

    // Set up container attributes
    container.setAttribute('data-focus-trap', id);
    container.setAttribute('tabindex', '-1');
  }

  /**
   * Activate focus trap
   */
  activateFocusTrap(id: string, initialFocus?: HTMLElement): void {
    const trap = this.focusTraps.get(id);
    if (!trap) {
      console.error(`Focus trap not found: ${id}`);
      return;
    }

    // Deactivate other traps
    this.focusTraps.forEach((otherTrap, otherId) => {
      if (otherId !== id && otherTrap.active) {
        this.deactivateFocusTrap(otherId);
      }
    });

    trap.active = true;
    trap.container.classList.add('focus-trap-active');

    // Focus initial element
    if (initialFocus && trap.focusableElements.includes(initialFocus)) {
      this.focusElement(initialFocus, 'programmatic', 'focus-trap-activation');
    } else if (trap.autoFocus) {
      this.focusElement(trap.firstFocusable, 'programmatic', 'focus-trap-activation');
    }

    announce(`Modal opened. Press Escape to close.`, 'assertive');
  }

  /**
   * Deactivate focus trap
   */
  deactivateFocusTrap(id: string): void {
    const trap = this.focusTraps.get(id);
    if (!trap) return;

    trap.active = false;
    trap.container.classList.remove('focus-trap-active');

    // Restore previous focus
    if (trap.restoreFocus && trap.previousFocus) {
      this.focusElement(trap.previousFocus, 'restoration', 'focus-trap-deactivation');
    }

    announce('Modal closed', 'polite');
  }

  /**
   * Handle focus trap navigation
   */
  private handleFocusTrapNavigation(event: KeyboardEvent): void {
    const activeTrap = Array.from(this.focusTraps.values()).find(trap => trap.active);
    if (!activeTrap) return;

    const { focusableElements } = activeTrap;
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (event.shiftKey) {
      // Shift+Tab - move backward
      if (currentIndex <= 0) {
        event.preventDefault();
        this.focusElement(focusableElements[focusableElements.length - 1], 'programmatic', 'focus-trap-wrap');
      }
    } else {
      // Tab - move forward
      if (currentIndex >= focusableElements.length - 1) {
        event.preventDefault();
        this.focusElement(focusableElements[0], 'programmatic', 'focus-trap-wrap');
      }
    }
  }

  /**
   * Handle escape key
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    const activeTrap = Array.from(this.focusTraps.values()).find(trap => trap.active);
    if (activeTrap) {
      event.preventDefault();
      this.deactivateFocusTrap(activeTrap.id);
    }
  }

  /**
   * Create focus group
   */
  createFocusGroup(
    id: string,
    elements: HTMLElement[],
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      autoFocus?: boolean;
    } = {}
  ): void {
    const {
      orientation = 'horizontal',
      wrap = true,
      autoFocus = false,
    } = options;

    const group: FocusGroup = {
      id,
      elements,
      currentIndex: 0,
      orientation,
      wrap,
      autoFocus,
    };

    // Setup roving tabindex
    elements.forEach((element, index) => {
      element.tabIndex = index === 0 ? 0 : -1;
      element.setAttribute('data-focus-group', id);
      element.setAttribute('data-focus-index', index.toString());
    });

    this.focusGroups.set(id, group);
  }

  /**
   * Handle focus group navigation
   */
  private handleFocusGroupNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const groupId = target.getAttribute('data-focus-group');
    
    if (!groupId) return;

    const group = this.focusGroups.get(groupId);
    if (!group) return;

    let newIndex = group.currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          event.preventDefault();
          newIndex = this.getNextIndex(group, 1);
        }
        break;

      case 'ArrowLeft':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          event.preventDefault();
          newIndex = this.getNextIndex(group, -1);
        }
        break;

      case 'ArrowDown':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          event.preventDefault();
          newIndex = this.getNextIndex(group, 1);
        }
        break;

      case 'ArrowUp':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          event.preventDefault();
          newIndex = this.getNextIndex(group, -1);
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = group.elements.length - 1;
        break;
    }

    if (newIndex !== group.currentIndex) {
      this.focusGroupElement(group, newIndex);
    }
  }

  /**
   * Get next index in focus group
   */
  private getNextIndex(group: FocusGroup, direction: number): number {
    let newIndex = group.currentIndex + direction;

    if (group.wrap) {
      if (newIndex < 0) {
        newIndex = group.elements.length - 1;
      } else if (newIndex >= group.elements.length) {
        newIndex = 0;
      }
    } else {
      newIndex = Math.max(0, Math.min(newIndex, group.elements.length - 1));
    }

    return newIndex;
  }

  /**
   * Focus element in group
   */
  private focusGroupElement(group: FocusGroup, index: number): void {
    if (index < 0 || index >= group.elements.length) return;

    // Update tabindex for roving tabindex
    group.elements.forEach((element, i) => {
      element.tabIndex = i === index ? 0 : -1;
    });

    // Focus the element
    this.focusElement(group.elements[index], 'programmatic', 'focus-group-navigation');
    group.currentIndex = index;
  }

  /**
   * Update focus group when element receives focus
   */
  private updateFocusGroup(element: HTMLElement): void {
    const groupId = element.getAttribute('data-focus-group');
    if (!groupId) return;

    const group = this.focusGroups.get(groupId);
    if (!group) return;

    const index = group.elements.indexOf(element);
    if (index !== -1) {
      group.currentIndex = index;
    }
  }

  /**
   * Focus element programmatically
   */
  focusElement(
    element: HTMLElement,
    reason: 'user' | 'programmatic' | 'restoration' = 'programmatic',
    context?: string
  ): void {
    if (!element || !this.isElementFocusable(element)) return;

    element.focus();
    element.classList.add('focus-visible');

    // Add to focus history
    this.addToFocusHistory(element, reason, context);

    // Ensure element is visible
    this.ensureElementVisible(element);
  }

  /**
   * Get focusable elements within container
   */
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const elements = container.querySelectorAll(this.focusableSelectors);
    
    return Array.from(elements).filter((element) => {
      const el = element as HTMLElement;
      return this.isElementFocusable(el);
    }) as HTMLElement[];
  }

  /**
   * Check if element is focusable
   */
  private isElementFocusable(element: HTMLElement): boolean {
    // Check if element is visible
    if (!this.isElementVisible(element)) return false;

    // Check if element is disabled
    if (element.hasAttribute('disabled')) return false;

    // Check if element has negative tabindex
    if (element.tabIndex < 0) return false;

    // Check if element is in a disabled fieldset
    const fieldset = element.closest('fieldset');
    if (fieldset && fieldset.hasAttribute('disabled')) return false;

    return true;
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0 &&
      element.offsetParent !== null
    );
  }

  /**
   * Ensure element is visible in viewport
   */
  private ensureElementVisible(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );

    if (!isVisible) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }

  /**
   * Add to focus history
   */
  private addToFocusHistory(
    element: HTMLElement,
    reason: 'user' | 'programmatic' | 'restoration',
    context?: string
  ): void {
    this.focusHistory.push({
      element,
      timestamp: Date.now(),
      reason,
      context,
    });

    // Keep only last 50 entries
    if (this.focusHistory.length > 50) {
      this.focusHistory.shift();
    }
  }

  /**
   * Restore last focus
   */
  private restoreLastFocus(): void {
    const lastEntry = this.focusHistory[this.focusHistory.length - 1];
    if (lastEntry && this.isElementFocusable(lastEntry.element)) {
      this.focusElement(lastEntry.element, 'restoration', 'page-restore');
    }
  }

  /**
   * Announce focus change
   */
  private announceFocusChange(element: HTMLElement): void {
    const label = this.getElementLabel(element);
    if (label) {
      announce(`Focused on ${label}`, 'polite');
    }
  }

  /**
   * Get element label for announcements
   */
  private getElementLabel(element: HTMLElement): string {
    return (
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('placeholder') ||
      element.getAttribute('title') ||
      element.tagName.toLowerCase()
    );
  }

  /**
   * Update focusable elements after DOM changes
   */
  private updateFocusableElements(container: HTMLElement): void {
    // Update focus traps
    this.focusTraps.forEach((trap) => {
      if (trap.container.contains(container) || container.contains(trap.container)) {
        trap.focusableElements = this.getFocusableElements(trap.container);
        trap.firstFocusable = trap.focusableElements[0];
        trap.lastFocusable = trap.focusableElements[trap.focusableElements.length - 1];
      }
    });

    // Update focus groups
    this.focusGroups.forEach((group) => {
      group.elements = group.elements.filter(el => document.contains(el));
    });
  }

  /**
   * Get focus history
   */
  getFocusHistory(): FocusHistory[] {
    return [...this.focusHistory];
  }

  /**
   * Clear focus history
   */
  clearFocusHistory(): void {
    this.focusHistory = [];
  }

  /**
   * Get current focus
   */
  getCurrentFocus(): HTMLElement | null {
    return this.currentFocus;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.focusTraps.clear();
    this.focusGroups.clear();
    this.focusHistory = [];
    
    if (this.focusIndicatorStyle && this.focusIndicatorStyle.parentNode) {
      this.focusIndicatorStyle.parentNode.removeChild(this.focusIndicatorStyle);
    }

    this.skipLinks.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  }
}

// Export singleton instance
export const focusManager = new FocusManager();

// Export utility functions
export const createFocusTrap = (container: HTMLElement, id: string, options?: any) =>
  focusManager.createFocusTrap(container, id, options);

export const activateFocusTrap = (id: string, initialFocus?: HTMLElement) =>
  focusManager.activateFocusTrap(id, initialFocus);

export const deactivateFocusTrap = (id: string) =>
  focusManager.deactivateFocusTrap(id);

export const createFocusGroup = (id: string, elements: HTMLElement[], options?: any) =>
  focusManager.createFocusGroup(id, elements, options);

export const focusElement = (element: HTMLElement, reason?: any, context?: string) =>
  focusManager.focusElement(element, reason, context);

export const getFocusableElements = (container?: HTMLElement) =>
  focusManager.getFocusableElements(container);
