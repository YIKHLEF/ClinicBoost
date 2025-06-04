/**
 * Comprehensive ARIA Attributes System
 * 
 * This module provides comprehensive ARIA support including:
 * - Dynamic ARIA attribute management
 * - Screen reader announcements
 * - Live region management
 * - Role-based attribute sets
 * - Accessibility state tracking
 * - WCAG 2.1 AA compliance utilities
 */

export interface AriaAttributes {
  // Widget Attributes
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-label'?: string;
  'aria-level'?: number;
  'aria-multiline'?: boolean;
  'aria-multiselectable'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-placeholder'?: string;
  'aria-pressed'?: boolean | 'mixed';
  'aria-readonly'?: boolean;
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
  'aria-valuemax'?: number;
  'aria-valuemin'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;

  // Live Region Attributes
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';

  // Drag-and-Drop Attributes
  'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
  'aria-grabbed'?: boolean;

  // Relationship Attributes
  'aria-activedescendant'?: string;
  'aria-colcount'?: number;
  'aria-colindex'?: number;
  'aria-colspan'?: number;
  'aria-controls'?: string;
  'aria-describedby'?: string;
  'aria-details'?: string;
  'aria-errormessage'?: string;
  'aria-flowto'?: string;
  'aria-labelledby'?: string;
  'aria-owns'?: string;
  'aria-posinset'?: number;
  'aria-rowcount'?: number;
  'aria-rowindex'?: number;
  'aria-rowspan'?: number;
  'aria-setsize'?: number;
}

export interface AriaRole {
  role?: 
    // Document Structure Roles
    | 'application' | 'article' | 'banner' | 'complementary' | 'contentinfo'
    | 'definition' | 'directory' | 'document' | 'feed' | 'figure' | 'group'
    | 'heading' | 'img' | 'list' | 'listitem' | 'main' | 'math' | 'navigation'
    | 'none' | 'note' | 'presentation' | 'region' | 'separator' | 'toolbar'
    
    // Widget Roles
    | 'alert' | 'alertdialog' | 'button' | 'checkbox' | 'dialog' | 'gridcell'
    | 'link' | 'log' | 'marquee' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio'
    | 'option' | 'progressbar' | 'radio' | 'scrollbar' | 'searchbox' | 'slider'
    | 'spinbutton' | 'status' | 'switch' | 'tab' | 'tabpanel' | 'textbox'
    | 'timer' | 'tooltip' | 'treeitem'
    
    // Composite Roles
    | 'combobox' | 'grid' | 'listbox' | 'menu' | 'menubar' | 'radiogroup'
    | 'tablist' | 'tree' | 'treegrid'
    
    // Landmark Roles
    | 'banner' | 'complementary' | 'contentinfo' | 'form' | 'main'
    | 'navigation' | 'region' | 'search';
}

export interface AccessibilityState {
  announcements: string[];
  focusedElement: string | null;
  liveRegions: Map<string, HTMLElement>;
  screenReaderActive: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
}

class AriaManager {
  private state: AccessibilityState = {
    announcements: [],
    focusedElement: null,
    liveRegions: new Map(),
    screenReaderActive: false,
    highContrastMode: false,
    reducedMotion: false,
    keyboardNavigation: false,
  };

  private announcementQueue: string[] = [];
  private isProcessingAnnouncements = false;

  constructor() {
    this.detectAccessibilityFeatures();
    this.setupLiveRegions();
    this.setupEventListeners();
  }

  /**
   * Detect accessibility features and preferences
   */
  private detectAccessibilityFeatures(): void {
    // Detect screen reader
    this.state.screenReaderActive = this.detectScreenReader();

    // Detect high contrast mode
    this.state.highContrastMode = window.matchMedia('(prefers-contrast: high)').matches;

    // Detect reduced motion preference
    this.state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Detect keyboard navigation
    this.state.keyboardNavigation = this.detectKeyboardNavigation();
  }

  /**
   * Detect screen reader presence
   */
  private detectScreenReader(): boolean {
    // Check for common screen reader indicators
    const indicators = [
      'speechSynthesis' in window,
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      navigator.userAgent.includes('TalkBack'),
    ];

    return indicators.some(indicator => indicator);
  }

  /**
   * Detect keyboard navigation preference
   */
  private detectKeyboardNavigation(): boolean {
    let keyboardUsed = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        keyboardUsed = true;
        document.body.classList.add('keyboard-navigation');
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    const handleMouseDown = () => {
      if (keyboardUsed) {
        document.body.classList.remove('keyboard-navigation');
        keyboardUsed = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return keyboardUsed;
  }

  /**
   * Setup live regions for announcements
   */
  private setupLiveRegions(): void {
    // Create polite live region
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.setAttribute('class', 'sr-only');
    politeRegion.id = 'aria-live-polite';
    document.body.appendChild(politeRegion);
    this.state.liveRegions.set('polite', politeRegion);

    // Create assertive live region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.setAttribute('class', 'sr-only');
    assertiveRegion.id = 'aria-live-assertive';
    document.body.appendChild(assertiveRegion);
    this.state.liveRegions.set('assertive', assertiveRegion);

    // Create status region
    const statusRegion = document.createElement('div');
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('class', 'sr-only');
    statusRegion.id = 'aria-status';
    document.body.appendChild(statusRegion);
    this.state.liveRegions.set('status', statusRegion);
  }

  /**
   * Setup event listeners for accessibility
   */
  private setupEventListeners(): void {
    // Listen for focus changes
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      this.state.focusedElement = target.id || target.tagName;
      this.handleFocusChange(target);
    });

    // Listen for preference changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.state.highContrastMode = e.matches;
      this.handleContrastChange(e.matches);
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.state.reducedMotion = e.matches;
      this.handleMotionPreferenceChange(e.matches);
    });
  }

  /**
   * Handle focus changes
   */
  private handleFocusChange(element: HTMLElement): void {
    // Announce focus changes for screen readers
    const label = this.getElementLabel(element);
    if (label && this.state.screenReaderActive) {
      this.announce(`Focused on ${label}`, 'polite');
    }

    // Ensure focused element is visible
    this.ensureElementVisible(element);
  }

  /**
   * Handle contrast preference changes
   */
  private handleContrastChange(highContrast: boolean): void {
    document.body.classList.toggle('high-contrast', highContrast);
    this.announce(
      highContrast ? 'High contrast mode enabled' : 'High contrast mode disabled',
      'polite'
    );
  }

  /**
   * Handle motion preference changes
   */
  private handleMotionPreferenceChange(reducedMotion: boolean): void {
    document.body.classList.toggle('reduced-motion', reducedMotion);
    
    // Disable animations if reduced motion is preferred
    if (reducedMotion) {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Get accessible label for element
   */
  private getElementLabel(element: HTMLElement): string {
    // Check aria-label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label')!;
    }

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        return labelElement.textContent || '';
      }
    }

    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent || '';
      }
    }

    // Check placeholder
    if (element.getAttribute('placeholder')) {
      return element.getAttribute('placeholder')!;
    }

    // Check text content
    if (element.textContent) {
      return element.textContent.trim();
    }

    // Check alt text for images
    if (element.tagName === 'IMG') {
      return element.getAttribute('alt') || 'Image';
    }

    // Check title
    if (element.getAttribute('title')) {
      return element.getAttribute('title')!;
    }

    return element.tagName.toLowerCase();
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
        behavior: this.state.reducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!message.trim()) return;

    this.announcementQueue.push(message);
    this.state.announcements.push(message);

    // Process announcements
    this.processAnnouncements(priority);
  }

  /**
   * Process announcement queue
   */
  private async processAnnouncements(priority: 'polite' | 'assertive'): Promise<void> {
    if (this.isProcessingAnnouncements) return;

    this.isProcessingAnnouncements = true;

    while (this.announcementQueue.length > 0) {
      const message = this.announcementQueue.shift()!;
      const liveRegion = this.state.liveRegions.get(priority);

      if (liveRegion) {
        // Clear previous message
        liveRegion.textContent = '';
        
        // Small delay to ensure screen reader notices the change
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set new message
        liveRegion.textContent = message;
        
        // Wait before processing next message
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessingAnnouncements = false;
  }

  /**
   * Set ARIA attributes on element
   */
  setAriaAttributes(element: HTMLElement, attributes: AriaAttributes & AriaRole): void {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    });
  }

  /**
   * Get role-specific ARIA attributes
   */
  getRoleAttributes(role: string): Partial<AriaAttributes> {
    const roleAttributes: Record<string, Partial<AriaAttributes>> = {
      button: {
        'aria-pressed': false,
      },
      checkbox: {
        'aria-checked': false,
      },
      combobox: {
        'aria-expanded': false,
        'aria-haspopup': 'listbox',
        'aria-autocomplete': 'none',
      },
      dialog: {
        'aria-modal': true,
        'aria-labelledby': '',
      },
      listbox: {
        'aria-multiselectable': false,
      },
      menu: {
        'aria-orientation': 'vertical',
      },
      menuitem: {
        'aria-disabled': false,
      },
      progressbar: {
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': 0,
      },
      slider: {
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': 50,
        'aria-orientation': 'horizontal',
      },
      spinbutton: {
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': 0,
      },
      switch: {
        'aria-checked': false,
      },
      tab: {
        'aria-selected': false,
      },
      tabpanel: {
        'aria-labelledby': '',
      },
      textbox: {
        'aria-multiline': false,
        'aria-readonly': false,
        'aria-required': false,
      },
    };

    return roleAttributes[role] || {};
  }

  /**
   * Create accessible form field
   */
  createAccessibleFormField(config: {
    id: string;
    label: string;
    type: string;
    required?: boolean;
    description?: string;
    errorMessage?: string;
    placeholder?: string;
  }): {
    field: AriaAttributes & AriaRole;
    label: AriaAttributes & AriaRole;
    description?: AriaAttributes & AriaRole;
    error?: AriaAttributes & AriaRole;
  } {
    const { id, label, type, required, description, errorMessage, placeholder } = config;

    const fieldAttributes: AriaAttributes & AriaRole = {
      'aria-required': required,
      'aria-invalid': !!errorMessage,
      'aria-placeholder': placeholder,
    };

    // Add describedby relationships
    const describedBy: string[] = [];
    if (description) describedBy.push(`${id}-description`);
    if (errorMessage) describedBy.push(`${id}-error`);
    if (describedBy.length > 0) {
      fieldAttributes['aria-describedby'] = describedBy.join(' ');
    }

    // Add error message reference
    if (errorMessage) {
      fieldAttributes['aria-errormessage'] = `${id}-error`;
    }

    const result: any = {
      field: fieldAttributes,
      label: {
        'aria-label': label,
      },
    };

    if (description) {
      result.description = {
        id: `${id}-description`,
        'aria-live': 'polite',
      };
    }

    if (errorMessage) {
      result.error = {
        id: `${id}-error`,
        role: 'alert',
        'aria-live': 'assertive',
      };
    }

    return result;
  }

  /**
   * Create accessible table
   */
  createAccessibleTable(config: {
    caption: string;
    headers: string[];
    sortable?: boolean;
    selectable?: boolean;
  }): {
    table: AriaAttributes & AriaRole;
    caption: AriaAttributes & AriaRole;
    headers: (AriaAttributes & AriaRole)[];
  } {
    const { caption, headers, sortable, selectable } = config;

    const tableAttributes: AriaAttributes & AriaRole = {
      role: 'table',
      'aria-label': caption,
    };

    if (selectable) {
      tableAttributes['aria-multiselectable'] = true;
    }

    const headerAttributes = headers.map((header, index) => ({
      role: 'columnheader' as const,
      'aria-sort': sortable ? ('none' as const) : undefined,
      'aria-colindex': index + 1,
    }));

    return {
      table: tableAttributes,
      caption: {
        role: 'caption',
      },
      headers: headerAttributes,
    };
  }

  /**
   * Get accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Update accessibility preferences
   */
  updatePreferences(preferences: Partial<AccessibilityState>): void {
    this.state = { ...this.state, ...preferences };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Remove live regions
    this.state.liveRegions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    this.state.liveRegions.clear();
  }
}

// Export singleton instance
export const ariaManager = new AriaManager();

// Export utility functions
export const announce = (message: string, priority?: 'polite' | 'assertive') =>
  ariaManager.announce(message, priority);

export const setAriaAttributes = (element: HTMLElement, attributes: AriaAttributes & AriaRole) =>
  ariaManager.setAriaAttributes(element, attributes);

export const getRoleAttributes = (role: string) =>
  ariaManager.getRoleAttributes(role);

export const createAccessibleFormField = (config: any) =>
  ariaManager.createAccessibleFormField(config);

export const createAccessibleTable = (config: any) =>
  ariaManager.createAccessibleTable(config);
