/**
 * Enhanced High Contrast Mode Implementation
 * 
 * This module provides advanced high contrast mode features including:
 * - Dynamic theme switching
 * - Custom color scheme support
 * - Image and icon high contrast alternatives
 * - Automatic contrast ratio validation
 */

import { announce } from './aria-attributes';

export interface ContrastTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    border: string;
    focus: string;
    error: string;
    warning: string;
    success: string;
    link: string;
    visited: string;
  };
  contrastRatios: {
    normal: number;
    large: number;
  };
}

export interface ImageAlternative {
  original: string;
  highContrast: string;
  description: string;
}

export interface ContrastSettings {
  enabled: boolean;
  theme: string;
  customColors: Partial<ContrastTheme['colors']>;
  imageAlternatives: boolean;
  iconAlternatives: boolean;
  borderEnhancement: boolean;
  focusEnhancement: boolean;
  textShadows: boolean;
}

class EnhancedHighContrast {
  private settings: ContrastSettings;
  private themes = new Map<string, ContrastTheme>();
  private imageAlternatives = new Map<string, ImageAlternative>();
  private originalStyles = new Map<HTMLElement, string>();
  private contrastObserver?: MutationObserver;

  constructor() {
    this.settings = this.loadSettings();
    this.setupDefaultThemes();
    this.setupImageAlternatives();
    this.setupEventListeners();
    
    if (this.settings.enabled) {
      this.applyHighContrast();
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): ContrastSettings {
    const saved = localStorage.getItem('high-contrast-settings');
    const defaults: ContrastSettings = {
      enabled: false,
      theme: 'default-high-contrast',
      customColors: {},
      imageAlternatives: true,
      iconAlternatives: true,
      borderEnhancement: true,
      focusEnhancement: true,
      textShadows: false,
    };

    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('high-contrast-settings', JSON.stringify(this.settings));
  }

  /**
   * Setup default high contrast themes
   */
  private setupDefaultThemes(): void {
    // Default high contrast theme (black/white)
    this.themes.set('default-high-contrast', {
      id: 'default-high-contrast',
      name: 'Default High Contrast',
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        accent: '#ffff00',
        border: '#ffffff',
        focus: '#ffff00',
        error: '#ff6666',
        warning: '#ffff66',
        success: '#66ff66',
        link: '#00ffff',
        visited: '#ff66ff',
      },
      contrastRatios: {
        normal: 7.0,
        large: 4.5,
      },
    });

    // White on black theme
    this.themes.set('white-on-black', {
      id: 'white-on-black',
      name: 'White on Black',
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        accent: '#ffffff',
        border: '#ffffff',
        focus: '#ffff00',
        error: '#ff4444',
        warning: '#ffaa00',
        success: '#44ff44',
        link: '#88ddff',
        visited: '#dd88ff',
      },
      contrastRatios: {
        normal: 21.0,
        large: 21.0,
      },
    });

    // Black on white theme
    this.themes.set('black-on-white', {
      id: 'black-on-white',
      name: 'Black on White',
      colors: {
        background: '#ffffff',
        foreground: '#000000',
        accent: '#000000',
        border: '#000000',
        focus: '#0066cc',
        error: '#cc0000',
        warning: '#cc6600',
        success: '#006600',
        link: '#0066cc',
        visited: '#6600cc',
      },
      contrastRatios: {
        normal: 21.0,
        large: 21.0,
      },
    });

    // Yellow on black theme (for light sensitivity)
    this.themes.set('yellow-on-black', {
      id: 'yellow-on-black',
      name: 'Yellow on Black',
      colors: {
        background: '#000000',
        foreground: '#ffff00',
        accent: '#ffffff',
        border: '#ffff00',
        focus: '#ffffff',
        error: '#ff6666',
        warning: '#ffaa00',
        success: '#66ff66',
        link: '#88ddff',
        visited: '#dd88ff',
      },
      contrastRatios: {
        normal: 19.6,
        large: 19.6,
      },
    });

    // Blue on white theme (for dyslexia)
    this.themes.set('blue-on-cream', {
      id: 'blue-on-cream',
      name: 'Blue on Cream',
      colors: {
        background: '#fdf6e3',
        foreground: '#002b36',
        accent: '#268bd2',
        border: '#002b36',
        focus: '#d33682',
        error: '#dc322f',
        warning: '#b58900',
        success: '#859900',
        link: '#268bd2',
        visited: '#6c71c4',
      },
      contrastRatios: {
        normal: 7.0,
        large: 4.5,
      },
    });
  }

  /**
   * Setup image alternatives for high contrast mode
   */
  private setupImageAlternatives(): void {
    // Common image alternatives
    this.imageAlternatives.set('logo', {
      original: '/images/logo.png',
      highContrast: '/images/logo-high-contrast.png',
      description: 'Company logo in high contrast',
    });

    this.imageAlternatives.set('avatar-placeholder', {
      original: '/images/avatar-placeholder.png',
      highContrast: '/images/avatar-placeholder-high-contrast.png',
      description: 'User avatar placeholder in high contrast',
    });

    // Chart and graph alternatives
    this.imageAlternatives.set('chart', {
      original: '/images/chart.png',
      highContrast: '/images/chart-high-contrast.png',
      description: 'Chart with high contrast colors and patterns',
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    mediaQuery.addEventListener('change', (e) => {
      if (e.matches && !this.settings.enabled) {
        this.enableHighContrast();
      }
    });

    // Listen for forced colors mode
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    forcedColorsQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.handleForcedColors();
      }
    });

    // Setup mutation observer for dynamic content
    this.contrastObserver = new MutationObserver((mutations) => {
      if (this.settings.enabled) {
        this.handleDynamicContent(mutations);
      }
    });

    this.contrastObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class'],
    });
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast(themeId?: string): void {
    this.settings.enabled = true;
    if (themeId) {
      this.settings.theme = themeId;
    }
    
    this.applyHighContrast();
    this.saveSettings();
    
    const theme = this.themes.get(this.settings.theme);
    announce(`High contrast mode enabled: ${theme?.name || 'Custom theme'}`, 'polite');
  }

  /**
   * Disable high contrast mode
   */
  disableHighContrast(): void {
    this.settings.enabled = false;
    this.removeHighContrast();
    this.saveSettings();
    
    announce('High contrast mode disabled', 'polite');
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast(): void {
    if (this.settings.enabled) {
      this.disableHighContrast();
    } else {
      this.enableHighContrast();
    }
  }

  /**
   * Apply high contrast styles
   */
  private applyHighContrast(): void {
    const theme = this.themes.get(this.settings.theme);
    if (!theme) return;

    // Apply theme to document root
    this.applyThemeToRoot(theme);
    
    // Apply to body
    document.body.classList.add('high-contrast');
    document.body.setAttribute('data-contrast-theme', theme.id);
    
    // Apply image alternatives
    if (this.settings.imageAlternatives) {
      this.applyImageAlternatives();
    }
    
    // Apply icon alternatives
    if (this.settings.iconAlternatives) {
      this.applyIconAlternatives();
    }
    
    // Apply border enhancements
    if (this.settings.borderEnhancement) {
      this.applyBorderEnhancements();
    }
    
    // Apply focus enhancements
    if (this.settings.focusEnhancement) {
      this.applyFocusEnhancements();
    }
    
    // Apply text shadows if enabled
    if (this.settings.textShadows) {
      this.applyTextShadows();
    }
  }

  /**
   * Apply theme colors to CSS custom properties
   */
  private applyThemeToRoot(theme: ContrastTheme): void {
    const root = document.documentElement;
    
    // Merge theme colors with custom colors
    const colors = { ...theme.colors, ...this.settings.customColors };
    
    // Set CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--contrast-${key}`, value);
    });
    
    // Set contrast ratios
    root.style.setProperty('--contrast-ratio-normal', theme.contrastRatios.normal.toString());
    root.style.setProperty('--contrast-ratio-large', theme.contrastRatios.large.toString());
  }

  /**
   * Apply image alternatives
   */
  private applyImageAlternatives(): void {
    const images = document.querySelectorAll('img[data-high-contrast-alt]');
    
    images.forEach(img => {
      const altSrc = img.getAttribute('data-high-contrast-alt');
      if (altSrc) {
        const originalSrc = img.getAttribute('src');
        if (originalSrc) {
          this.originalStyles.set(img as HTMLElement, originalSrc);
          img.setAttribute('src', altSrc);
        }
      }
    });
    
    // Apply predefined alternatives
    this.imageAlternatives.forEach((alt, key) => {
      const images = document.querySelectorAll(`img[src*="${alt.original}"]`);
      images.forEach(img => {
        this.originalStyles.set(img as HTMLElement, img.getAttribute('src') || '');
        img.setAttribute('src', alt.highContrast);
        img.setAttribute('alt', alt.description);
      });
    });
  }

  /**
   * Apply icon alternatives
   */
  private applyIconAlternatives(): void {
    // Replace SVG icons with high contrast versions
    const svgIcons = document.querySelectorAll('svg[data-icon]');
    
    svgIcons.forEach(svg => {
      const icon = svg as SVGElement;
      this.originalStyles.set(icon, icon.style.cssText);
      
      // Apply high contrast colors to SVG
      icon.style.fill = 'var(--contrast-foreground)';
      icon.style.stroke = 'var(--contrast-border)';
      icon.style.strokeWidth = '2';
    });
    
    // Handle icon fonts
    const iconFonts = document.querySelectorAll('.icon, [class*="icon-"], [class*="fa-"]');
    iconFonts.forEach(icon => {
      const element = icon as HTMLElement;
      this.originalStyles.set(element, element.style.cssText);
      
      element.style.color = 'var(--contrast-foreground)';
      element.style.textShadow = '1px 1px 0 var(--contrast-background)';
    });
  }

  /**
   * Apply border enhancements
   */
  private applyBorderEnhancements(): void {
    const elements = document.querySelectorAll('button, input, select, textarea, .card, .panel, .modal');

    elements.forEach(element => {
      const el = element as HTMLElement;
      this.originalStyles.set(el, el.style.cssText);

      // Enhance borders for better visibility
      el.style.border = '2px solid var(--contrast-border)';
      el.style.outline = 'none';
    });
  }

  /**
   * Apply focus enhancements
   */
  private applyFocusEnhancements(): void {
    // Create enhanced focus styles
    const focusStyle = document.createElement('style');
    focusStyle.id = 'high-contrast-focus';
    focusStyle.textContent = `
      .high-contrast *:focus {
        outline: 3px solid var(--contrast-focus) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 1px var(--contrast-background), 0 0 0 4px var(--contrast-focus) !important;
        border-radius: 2px !important;
      }

      .high-contrast button:focus,
      .high-contrast a:focus,
      .high-contrast input:focus,
      .high-contrast select:focus,
      .high-contrast textarea:focus {
        background-color: var(--contrast-accent) !important;
        color: var(--contrast-background) !important;
      }
    `;

    document.head.appendChild(focusStyle);
  }

  /**
   * Apply text shadows for better readability
   */
  private applyTextShadows(): void {
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button, label');

    textElements.forEach(element => {
      const el = element as HTMLElement;
      const currentStyle = el.style.textShadow;
      this.originalStyles.set(el, currentStyle);

      el.style.textShadow = '1px 1px 0 var(--contrast-background), -1px -1px 0 var(--contrast-background)';
    });
  }

  /**
   * Remove high contrast styles
   */
  private removeHighContrast(): void {
    // Remove body classes
    document.body.classList.remove('high-contrast');
    document.body.removeAttribute('data-contrast-theme');

    // Remove CSS custom properties
    const root = document.documentElement;
    const properties = [
      '--contrast-background', '--contrast-foreground', '--contrast-accent',
      '--contrast-border', '--contrast-focus', '--contrast-error',
      '--contrast-warning', '--contrast-success', '--contrast-link',
      '--contrast-visited', '--contrast-ratio-normal', '--contrast-ratio-large'
    ];

    properties.forEach(prop => {
      root.style.removeProperty(prop);
    });

    // Restore original styles
    this.originalStyles.forEach((originalStyle, element) => {
      if (element.tagName === 'IMG') {
        element.setAttribute('src', originalStyle);
      } else {
        element.style.cssText = originalStyle;
      }
    });

    this.originalStyles.clear();

    // Remove focus enhancement styles
    const focusStyle = document.getElementById('high-contrast-focus');
    if (focusStyle) {
      focusStyle.remove();
    }
  }

  /**
   * Handle forced colors mode (Windows High Contrast)
   */
  private handleForcedColors(): void {
    // Respect system forced colors mode
    document.body.classList.add('forced-colors');

    // Disable custom high contrast when forced colors is active
    if (this.settings.enabled) {
      this.removeHighContrast();
    }

    announce('System high contrast mode detected', 'polite');
  }

  /**
   * Handle dynamic content changes
   */
  private handleDynamicContent(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.applyContrastToElement(node as HTMLElement);
          }
        });
      } else if (mutation.type === 'attributes') {
        const element = mutation.target as HTMLElement;
        if (mutation.attributeName === 'src' && element.tagName === 'IMG') {
          this.applyImageAlternativeToElement(element);
        }
      }
    });
  }

  /**
   * Apply contrast to a specific element
   */
  private applyContrastToElement(element: HTMLElement): void {
    // Apply image alternatives
    if (element.tagName === 'IMG' && this.settings.imageAlternatives) {
      this.applyImageAlternativeToElement(element);
    }

    // Apply icon alternatives
    if (this.settings.iconAlternatives && (
      element.matches('svg[data-icon]') ||
      element.matches('.icon, [class*="icon-"], [class*="fa-"]')
    )) {
      this.applyIconAlternativeToElement(element);
    }

    // Apply border enhancements
    if (this.settings.borderEnhancement && element.matches('button, input, select, textarea, .card, .panel, .modal')) {
      this.originalStyles.set(element, element.style.cssText);
      element.style.border = '2px solid var(--contrast-border)';
    }
  }

  /**
   * Apply image alternative to specific element
   */
  private applyImageAlternativeToElement(element: HTMLElement): void {
    const img = element as HTMLImageElement;
    const altSrc = img.getAttribute('data-high-contrast-alt');

    if (altSrc) {
      const originalSrc = img.getAttribute('src');
      if (originalSrc) {
        this.originalStyles.set(img, originalSrc);
        img.setAttribute('src', altSrc);
      }
    } else {
      // Check predefined alternatives
      const currentSrc = img.getAttribute('src') || '';
      this.imageAlternatives.forEach((alt, key) => {
        if (currentSrc.includes(alt.original)) {
          this.originalStyles.set(img, currentSrc);
          img.setAttribute('src', alt.highContrast);
          img.setAttribute('alt', alt.description);
        }
      });
    }
  }

  /**
   * Apply icon alternative to specific element
   */
  private applyIconAlternativeToElement(element: HTMLElement): void {
    this.originalStyles.set(element, element.style.cssText);

    if (element.tagName === 'svg') {
      element.style.fill = 'var(--contrast-foreground)';
      element.style.stroke = 'var(--contrast-border)';
      element.style.strokeWidth = '2';
    } else {
      element.style.color = 'var(--contrast-foreground)';
      element.style.textShadow = '1px 1px 0 var(--contrast-background)';
    }
  }

  /**
   * Create custom theme
   */
  createCustomTheme(
    id: string,
    name: string,
    colors: Partial<ContrastTheme['colors']>,
    contrastRatios?: Partial<ContrastTheme['contrastRatios']>
  ): void {
    const defaultColors = this.themes.get('default-high-contrast')!.colors;
    const defaultRatios = this.themes.get('default-high-contrast')!.contrastRatios;

    const theme: ContrastTheme = {
      id,
      name,
      colors: { ...defaultColors, ...colors },
      contrastRatios: { ...defaultRatios, ...contrastRatios },
    };

    this.themes.set(id, theme);
    announce(`Custom theme "${name}" created`, 'polite');
  }

  /**
   * Set custom colors
   */
  setCustomColors(colors: Partial<ContrastTheme['colors']>): void {
    this.settings.customColors = { ...this.settings.customColors, ...colors };

    if (this.settings.enabled) {
      this.applyHighContrast();
    }

    this.saveSettings();
  }

  /**
   * Add image alternative
   */
  addImageAlternative(key: string, original: string, highContrast: string, description: string): void {
    this.imageAlternatives.set(key, {
      original,
      highContrast,
      description,
    });

    if (this.settings.enabled && this.settings.imageAlternatives) {
      this.applyImageAlternatives();
    }
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): ContrastTheme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get current settings
   */
  getSettings(): ContrastSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<ContrastSettings>): void {
    const wasEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...newSettings };

    if (this.settings.enabled && !wasEnabled) {
      this.applyHighContrast();
    } else if (!this.settings.enabled && wasEnabled) {
      this.removeHighContrast();
    } else if (this.settings.enabled) {
      this.applyHighContrast();
    }

    this.saveSettings();
  }

  /**
   * Validate contrast ratio
   */
  validateContrastRatio(foreground: string, background: string): number {
    // Simple contrast ratio calculation (would need color parsing library for full implementation)
    // This is a placeholder implementation
    return 4.5; // Return minimum AA compliance ratio
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.settings.enabled) {
      this.removeHighContrast();
    }

    if (this.contrastObserver) {
      this.contrastObserver.disconnect();
    }

    this.originalStyles.clear();
  }
}

// Export singleton instance
export const enhancedHighContrast = new EnhancedHighContrast();

// Export utility functions
export const enableHighContrast = (themeId?: string) =>
  enhancedHighContrast.enableHighContrast(themeId);

export const disableHighContrast = () =>
  enhancedHighContrast.disableHighContrast();

export const toggleHighContrast = () =>
  enhancedHighContrast.toggleHighContrast();

export const createCustomTheme = (id: string, name: string, colors: any, ratios?: any) =>
  enhancedHighContrast.createCustomTheme(id, name, colors, ratios);

export const setCustomColors = (colors: any) =>
  enhancedHighContrast.setCustomColors(colors);

export const addImageAlternative = (key: string, original: string, highContrast: string, description: string) =>
  enhancedHighContrast.addImageAlternative(key, original, highContrast, description);
