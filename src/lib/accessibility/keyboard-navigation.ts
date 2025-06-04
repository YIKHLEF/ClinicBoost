/**
 * Comprehensive Keyboard Navigation System
 * 
 * This module provides comprehensive keyboard navigation including:
 * - Focus management and trapping
 * - Keyboard shortcuts and hotkeys
 * - Arrow key navigation for complex widgets
 * - Tab order management
 * - Skip links and landmarks
 * - Roving tabindex implementation
 * - WCAG 2.1 AA keyboard compliance
 */

import { ariaManager, announce } from './aria-attributes';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
  global?: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  originalTabIndex: number;
  group?: string;
}

export interface NavigationGroup {
  name: string;
  elements: HTMLElement[];
  orientation: 'horizontal' | 'vertical' | 'both';
  wrap: boolean;
  currentIndex: number;
}

export interface FocusTrap {
  container: HTMLElement;
  firstFocusable: HTMLElement;
  lastFocusable: HTMLElement;
  previousFocus: HTMLElement | null;
  active: boolean;
}

class KeyboardNavigationManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private navigationGroups: Map<string, NavigationGroup> = new Map();
  private focusTraps: Map<string, FocusTrap> = new Map();
  private focusableElements: FocusableElement[] = [];
  private skipLinks: HTMLElement[] = [];
  private isKeyboardUser = false;

  // Focusable element selectors
  private readonly focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'iframe',
    'object',
    'embed',
    'area[href]',
    'summary',
  ].join(', ');

  constructor() {
    this.setupEventListeners();
    this.setupDefaultShortcuts();
    this.createSkipLinks();
    this.detectKeyboardUsage();
  }

  /**
   * Setup event listeners for keyboard navigation
   */
  private setupEventListeners(): void {
    // Global keydown handler
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Focus management
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));

    // Mouse usage detection
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Mark as keyboard user
    this.isKeyboardUser = true;
    document.body.classList.add('keyboard-user');

    // Handle shortcuts
    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      announce(`Executed ${shortcut.description}`, 'polite');
      return;
    }

    // Handle navigation keys
    this.handleNavigationKeys(event);

    // Handle focus trap
    this.handleFocusTrap(event);
  }

  /**
   * Handle navigation keys (arrows, home, end, etc.)
   */
  private handleNavigationKeys(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const group = this.findNavigationGroup(target);

    if (!group) return;

    switch (event.key) {
      case 'ArrowUp':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          event.preventDefault();
          this.navigateInGroup(group, -1, 'vertical');
        }
        break;

      case 'ArrowDown':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          event.preventDefault();
          this.navigateInGroup(group, 1, 'vertical');
        }
        break;

      case 'ArrowLeft':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          event.preventDefault();
          this.navigateInGroup(group, -1, 'horizontal');
        }
        break;

      case 'ArrowRight':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          event.preventDefault();
          this.navigateInGroup(group, 1, 'horizontal');
        }
        break;

      case 'Home':
        event.preventDefault();
        this.focusGroupElement(group, 0);
        break;

      case 'End':
        event.preventDefault();
        this.focusGroupElement(group, group.elements.length - 1);
        break;

      case 'PageUp':
        event.preventDefault();
        this.navigateInGroup(group, -5);
        break;

      case 'PageDown':
        event.preventDefault();
        this.navigateInGroup(group, 5);
        break;
    }
  }

  /**
   * Handle focus trap navigation
   */
  private handleFocusTrap(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const activeTrap = Array.from(this.focusTraps.values()).find(trap => trap.active);
    if (!activeTrap) return;

    const focusableElements = this.getFocusableElements(activeTrap.container);
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (event.shiftKey) {
      // Shift+Tab - move backward
      if (currentIndex <= 0) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab - move forward
      if (currentIndex >= focusableElements.length - 1) {
        event.preventDefault();
        focusableElements[0].focus();
      }
    }
  }

  /**
   * Handle focus in events
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    // Announce focus change for screen readers
    if (this.isKeyboardUser) {
      const label = this.getElementLabel(target);
      if (label) {
        announce(`Focused on ${label}`, 'polite');
      }
    }

    // Update navigation group current index
    const group = this.findNavigationGroup(target);
    if (group) {
      group.currentIndex = group.elements.indexOf(target);
    }

    // Ensure element is visible
    this.ensureElementVisible(target);
  }

  /**
   * Handle focus out events
   */
  private handleFocusOut(event: FocusEvent): void {
    // Implementation for focus out handling
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(): void {
    this.isKeyboardUser = false;
    document.body.classList.remove('keyboard-user');
  }

  /**
   * Setup default keyboard shortcuts
   */
  private setupDefaultShortcuts(): void {
    // Navigation shortcuts
    this.addShortcut({
      key: 'h',
      altKey: true,
      action: () => this.focusMainHeading(),
      description: 'Go to main heading',
      category: 'Navigation',
      global: true,
    });

    this.addShortcut({
      key: 'm',
      altKey: true,
      action: () => this.focusMainContent(),
      description: 'Go to main content',
      category: 'Navigation',
      global: true,
    });

    this.addShortcut({
      key: 'n',
      altKey: true,
      action: () => this.focusNavigation(),
      description: 'Go to navigation',
      category: 'Navigation',
      global: true,
    });

    this.addShortcut({
      key: 's',
      altKey: true,
      action: () => this.focusSearch(),
      description: 'Go to search',
      category: 'Navigation',
      global: true,
    });

    // Application shortcuts
    this.addShortcut({
      key: '/',
      action: () => this.showShortcutHelp(),
      description: 'Show keyboard shortcuts',
      category: 'Help',
      global: true,
    });

    this.addShortcut({
      key: 'Escape',
      action: () => this.handleEscape(),
      description: 'Close modal or cancel action',
      category: 'General',
      global: true,
    });

    // Form shortcuts
    this.addShortcut({
      key: 'Enter',
      ctrlKey: true,
      action: () => this.submitForm(),
      description: 'Submit form',
      category: 'Forms',
    });

    this.addShortcut({
      key: 'r',
      ctrlKey: true,
      action: () => this.resetForm(),
      description: 'Reset form',
      category: 'Forms',
    });
  }

  /**
   * Create skip links for better navigation
   */
  private createSkipLinks(): void {
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.setAttribute('aria-label', 'Skip links');

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
        const target = document.querySelector(href);
        if (target) {
          (target as HTMLElement).focus();
          (target as HTMLElement).scrollIntoView({ behavior: 'smooth' });
        }
      });
      skipLinksContainer.appendChild(link);
      this.skipLinks.push(link);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  /**
   * Detect keyboard usage patterns
   */
  private detectKeyboardUsage(): void {
    let tabPressed = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        tabPressed = true;
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      if (tabPressed) {
        document.body.classList.remove('keyboard-navigation');
        tabPressed = false;
      }
    });
  }

  /**
   * Add keyboard shortcut
   */
  addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey({
      key: shortcut.key,
      ctrlKey: shortcut.ctrlKey || false,
      altKey: shortcut.altKey || false,
      shiftKey: shortcut.shiftKey || false,
      metaKey: shortcut.metaKey || false,
    } as KeyboardEvent);

    this.shortcuts.set(key, shortcut);
  }

  /**
   * Remove keyboard shortcut
   */
  removeShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  /**
   * Create navigation group
   */
  createNavigationGroup(
    name: string,
    elements: HTMLElement[],
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      rovingTabindex?: boolean;
    } = {}
  ): void {
    const {
      orientation = 'horizontal',
      wrap = true,
      rovingTabindex = true,
    } = options;

    const group: NavigationGroup = {
      name,
      elements,
      orientation,
      wrap,
      currentIndex: 0,
    };

    // Setup roving tabindex
    if (rovingTabindex) {
      this.setupRovingTabindex(group);
    }

    this.navigationGroups.set(name, group);
  }

  /**
   * Setup roving tabindex for navigation group
   */
  private setupRovingTabindex(group: NavigationGroup): void {
    group.elements.forEach((element, index) => {
      element.tabIndex = index === 0 ? 0 : -1;
      element.setAttribute('data-navigation-group', group.name);
    });
  }

  /**
   * Navigate within a group
   */
  private navigateInGroup(
    group: NavigationGroup,
    direction: number,
    axis?: 'horizontal' | 'vertical'
  ): void {
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

    this.focusGroupElement(group, newIndex);
  }

  /**
   * Focus element in navigation group
   */
  private focusGroupElement(group: NavigationGroup, index: number): void {
    if (index < 0 || index >= group.elements.length) return;

    // Update tabindex for roving tabindex
    group.elements.forEach((element, i) => {
      element.tabIndex = i === index ? 0 : -1;
    });

    // Focus the element
    group.elements[index].focus();
    group.currentIndex = index;
  }

  /**
   * Create focus trap
   */
  createFocusTrap(container: HTMLElement, id: string): void {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    const trap: FocusTrap = {
      container,
      firstFocusable: focusableElements[0],
      lastFocusable: focusableElements[focusableElements.length - 1],
      previousFocus: document.activeElement as HTMLElement,
      active: false,
    };

    this.focusTraps.set(id, trap);
  }

  /**
   * Activate focus trap
   */
  activateFocusTrap(id: string): void {
    const trap = this.focusTraps.get(id);
    if (!trap) return;

    trap.active = true;
    trap.firstFocusable.focus();
    
    announce('Modal opened. Press Escape to close.', 'assertive');
  }

  /**
   * Deactivate focus trap
   */
  deactivateFocusTrap(id: string): void {
    const trap = this.focusTraps.get(id);
    if (!trap) return;

    trap.active = false;
    
    if (trap.previousFocus) {
      trap.previousFocus.focus();
    }

    announce('Modal closed', 'polite');
  }

  /**
   * Get focusable elements within container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const elements = container.querySelectorAll(this.focusableSelectors);
    return Array.from(elements).filter((element) => {
      const el = element as HTMLElement;
      return this.isElementVisible(el) && !el.disabled;
    }) as HTMLElement[];
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  /**
   * Find navigation group for element
   */
  private findNavigationGroup(element: HTMLElement): NavigationGroup | null {
    const groupName = element.getAttribute('data-navigation-group');
    if (groupName) {
      return this.navigationGroups.get(groupName) || null;
    }

    // Check if element is in any group
    for (const group of this.navigationGroups.values()) {
      if (group.elements.includes(element)) {
        return group;
      }
    }

    return null;
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Get element label for announcements
   */
  private getElementLabel(element: HTMLElement): string {
    return (
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent ||
      element.getAttribute('placeholder') ||
      element.getAttribute('title') ||
      element.tagName.toLowerCase()
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

  // Navigation shortcut implementations
  private focusMainHeading(): void {
    const heading = document.querySelector('h1, [role="heading"][aria-level="1"]') as HTMLElement;
    if (heading) {
      heading.focus();
      heading.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private focusMainContent(): void {
    const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement;
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private focusNavigation(): void {
    const nav = document.querySelector('nav, [role="navigation"], #navigation') as HTMLElement;
    if (nav) {
      nav.focus();
      nav.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private focusSearch(): void {
    const search = document.querySelector('[type="search"], #search, [role="search"]') as HTMLElement;
    if (search) {
      search.focus();
      search.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private showShortcutHelp(): void {
    // Implementation would show keyboard shortcuts help modal
    announce('Keyboard shortcuts help opened', 'assertive');
  }

  private handleEscape(): void {
    // Close active modal or cancel current action
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement;
    if (activeModal) {
      const closeButton = activeModal.querySelector('[aria-label*="close"], [data-dismiss]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  }

  private submitForm(): void {
    const activeForm = document.activeElement?.closest('form');
    if (activeForm) {
      const submitButton = activeForm.querySelector('[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.click();
      }
    }
  }

  private resetForm(): void {
    const activeForm = document.activeElement?.closest('form') as HTMLFormElement;
    if (activeForm) {
      activeForm.reset();
      announce('Form reset', 'polite');
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.shortcuts.clear();
    this.navigationGroups.clear();
    this.focusTraps.clear();
    this.skipLinks.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  }
}

// Export singleton instance
export const keyboardNavigation = new KeyboardNavigationManager();

// Export utility functions
export const addShortcut = (shortcut: KeyboardShortcut) =>
  keyboardNavigation.addShortcut(shortcut);

export const createNavigationGroup = (name: string, elements: HTMLElement[], options?: any) =>
  keyboardNavigation.createNavigationGroup(name, elements, options);

export const createFocusTrap = (container: HTMLElement, id: string) =>
  keyboardNavigation.createFocusTrap(container, id);

export const activateFocusTrap = (id: string) =>
  keyboardNavigation.activateFocusTrap(id);

export const deactivateFocusTrap = (id: string) =>
  keyboardNavigation.deactivateFocusTrap(id);
