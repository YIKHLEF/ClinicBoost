/**
 * Color Contrast and Visual Accessibility System
 * 
 * This module provides comprehensive color and visual accessibility including:
 * - WCAG 2.1 AA/AAA color contrast validation
 * - Automatic contrast adjustment
 * - Color blindness simulation and testing
 * - High contrast mode support
 * - Dynamic theme switching
 * - Visual accessibility preferences
 * - Color palette accessibility analysis
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'A' | 'FAIL';
  passes: {
    normalText: boolean;
    largeText: boolean;
    uiComponents: boolean;
  };
  recommendations?: string[];
}

export interface ColorBlindnessType {
  name: string;
  type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface VisualPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  darkMode: boolean;
  colorBlindnessSimulation: ColorBlindnessType | null;
  customColors: {
    background: string;
    foreground: string;
    accent: string;
  } | null;
}

class ColorContrastManager {
  private preferences: VisualPreferences = {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    darkMode: false,
    colorBlindnessSimulation: null,
    customColors: null,
  };

  private colorBlindnessTypes: ColorBlindnessType[] = [
    {
      name: 'Protanopia',
      type: 'protanopia',
      severity: 'severe',
      description: 'Red-blind (missing L-cones)',
    },
    {
      name: 'Deuteranopia',
      type: 'deuteranopia',
      severity: 'severe',
      description: 'Green-blind (missing M-cones)',
    },
    {
      name: 'Tritanopia',
      type: 'tritanopia',
      severity: 'severe',
      description: 'Blue-blind (missing S-cones)',
    },
    {
      name: 'Achromatopsia',
      type: 'achromatopsia',
      severity: 'severe',
      description: 'Complete color blindness',
    },
  ];

  constructor() {
    this.detectSystemPreferences();
    this.setupEventListeners();
    this.loadUserPreferences();
  }

  /**
   * Detect system accessibility preferences
   */
  private detectSystemPreferences(): void {
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.preferences.highContrast = true;
    }

    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.preferences.reducedMotion = true;
    }

    // Detect dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.preferences.darkMode = true;
    }

    this.applyPreferences();
  }

  /**
   * Setup event listeners for preference changes
   */
  private setupEventListeners(): void {
    // Listen for system preference changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.preferences.highContrast = e.matches;
      this.applyPreferences();
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.preferences.reducedMotion = e.matches;
      this.applyPreferences();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.preferences.darkMode = e.matches;
      this.applyPreferences();
    });
  }

  /**
   * Load user preferences from storage
   */
  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('visual-preferences');
      if (stored) {
        const userPrefs = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...userPrefs };
        this.applyPreferences();
      }
    } catch (error) {
      console.error('Failed to load visual preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  private saveUserPreferences(): void {
    try {
      localStorage.setItem('visual-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save visual preferences:', error);
    }
  }

  /**
   * Apply visual preferences to the document
   */
  private applyPreferences(): void {
    const root = document.documentElement;
    const body = document.body;

    // Apply high contrast mode
    body.classList.toggle('high-contrast', this.preferences.highContrast);

    // Apply reduced motion
    body.classList.toggle('reduced-motion', this.preferences.reducedMotion);

    // Apply large text
    body.classList.toggle('large-text', this.preferences.largeText);

    // Apply dark mode
    body.classList.toggle('dark-mode', this.preferences.darkMode);

    // Apply color blindness simulation
    if (this.preferences.colorBlindnessSimulation) {
      body.classList.add(`colorblind-${this.preferences.colorBlindnessSimulation.type}`);
      this.applyColorBlindnessFilter(this.preferences.colorBlindnessSimulation.type);
    } else {
      this.removeColorBlindnessFilters();
    }

    // Apply custom colors
    if (this.preferences.customColors) {
      root.style.setProperty('--custom-bg', this.preferences.customColors.background);
      root.style.setProperty('--custom-fg', this.preferences.customColors.foreground);
      root.style.setProperty('--custom-accent', this.preferences.customColors.accent);
      body.classList.add('custom-colors');
    } else {
      body.classList.remove('custom-colors');
    }

    // Apply reduced motion CSS
    if (this.preferences.reducedMotion) {
      this.injectReducedMotionCSS();
    }
  }

  /**
   * Apply color blindness filter
   */
  private applyColorBlindnessFilter(type: ColorBlindnessType['type']): void {
    const filters = {
      protanopia: 'url(#protanopia-filter)',
      deuteranopia: 'url(#deuteranopia-filter)',
      tritanopia: 'url(#tritanopia-filter)',
      achromatopsia: 'grayscale(100%)',
    };

    document.documentElement.style.filter = filters[type];
    this.createColorBlindnessFilters();
  }

  /**
   * Create SVG filters for color blindness simulation
   */
  private createColorBlindnessFilters(): void {
    let svg = document.getElementById('colorblind-filters') as SVGElement;
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'colorblind-filters';
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      document.body.appendChild(svg);
    }

    svg.innerHTML = `
      <defs>
        <!-- Protanopia (Red-blind) -->
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567, 0.433, 0,     0, 0
            0.558, 0.442, 0,     0, 0
            0,     0.242, 0.758, 0, 0
            0,     0,     0,     1, 0"/>
        </filter>
        
        <!-- Deuteranopia (Green-blind) -->
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625, 0.375, 0,   0, 0
            0.7,   0.3,   0,   0, 0
            0,     0.3,   0.7, 0, 0
            0,     0,     0,   1, 0"/>
        </filter>
        
        <!-- Tritanopia (Blue-blind) -->
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95, 0.05,  0,     0, 0
            0,    0.433, 0.567, 0, 0
            0,    0.475, 0.525, 0, 0
            0,    0,     0,     1, 0"/>
        </filter>
      </defs>
    `;
  }

  /**
   * Remove color blindness filters
   */
  private removeColorBlindnessFilters(): void {
    document.documentElement.style.filter = '';
    document.body.className = document.body.className.replace(/colorblind-\w+/g, '');
  }

  /**
   * Inject reduced motion CSS
   */
  private injectReducedMotionCSS(): void {
    let style = document.getElementById('reduced-motion-styles');
    
    if (!style) {
      style = document.createElement('style');
      style.id = 'reduced-motion-styles';
      document.head.appendChild(style);
    }

    style.textContent = `
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
  }

  /**
   * Calculate color contrast ratio
   */
  calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private getRelativeLuminance(rgb: ColorRGB): number {
    const { r, g, b } = rgb;

    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): ColorRGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(rgb: ColorRGB): string {
    const toHex = (c: number) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * Evaluate contrast compliance
   */
  evaluateContrast(foreground: string, background: string): ContrastResult {
    const ratio = this.calculateContrastRatio(foreground, background);

    const passes = {
      normalText: ratio >= 4.5,
      largeText: ratio >= 3,
      uiComponents: ratio >= 3,
    };

    let level: ContrastResult['level'];
    if (ratio >= 7) {
      level = 'AAA';
    } else if (ratio >= 4.5) {
      level = 'AA';
    } else if (ratio >= 3) {
      level = 'A';
    } else {
      level = 'FAIL';
    }

    const recommendations: string[] = [];
    if (!passes.normalText) {
      recommendations.push('Increase contrast for normal text (minimum 4.5:1)');
    }
    if (!passes.largeText) {
      recommendations.push('Increase contrast for large text (minimum 3:1)');
    }
    if (!passes.uiComponents) {
      recommendations.push('Increase contrast for UI components (minimum 3:1)');
    }

    return {
      ratio,
      level,
      passes,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Suggest accessible color alternatives
   */
  suggestAccessibleColors(
    baseColor: string,
    targetBackground: string,
    targetRatio: number = 4.5
  ): string[] {
    const suggestions: string[] = [];
    const baseRgb = this.hexToRgb(baseColor);
    const bgRgb = this.hexToRgb(targetBackground);

    if (!baseRgb || !bgRgb) return suggestions;

    // Try adjusting lightness
    const baseHsl = this.rgbToHsl(baseRgb);
    
    for (let lightness = 0; lightness <= 100; lightness += 5) {
      const adjustedHsl = { ...baseHsl, l: lightness };
      const adjustedRgb = this.hslToRgb(adjustedHsl);
      const adjustedHex = this.rgbToHex(adjustedRgb);
      
      const ratio = this.calculateContrastRatio(adjustedHex, targetBackground);
      if (ratio >= targetRatio) {
        suggestions.push(adjustedHex);
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(rgb: ColorRGB): ColorHSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(hsl: ColorHSL): ColorRGB {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /**
   * Analyze color palette accessibility
   */
  analyzeColorPalette(colors: string[]): {
    combinations: Array<{
      foreground: string;
      background: string;
      contrast: ContrastResult;
    }>;
    summary: {
      totalCombinations: number;
      passingCombinations: number;
      failingCombinations: number;
      averageRatio: number;
    };
  } {
    const combinations: any[] = [];

    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        if (i !== j) {
          const contrast = this.evaluateContrast(colors[i], colors[j]);
          combinations.push({
            foreground: colors[i],
            background: colors[j],
            contrast,
          });
        }
      }
    }

    const passingCombinations = combinations.filter(c => c.contrast.level !== 'FAIL').length;
    const averageRatio = combinations.reduce((sum, c) => sum + c.contrast.ratio, 0) / combinations.length;

    return {
      combinations,
      summary: {
        totalCombinations: combinations.length,
        passingCombinations,
        failingCombinations: combinations.length - passingCombinations,
        averageRatio,
      },
    };
  }

  /**
   * Update visual preferences
   */
  updatePreferences(newPreferences: Partial<VisualPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.applyPreferences();
    this.saveUserPreferences();
  }

  /**
   * Get current preferences
   */
  getPreferences(): VisualPreferences {
    return { ...this.preferences };
  }

  /**
   * Get available color blindness types
   */
  getColorBlindnessTypes(): ColorBlindnessType[] {
    return [...this.colorBlindnessTypes];
  }

  /**
   * Test color accessibility for color blind users
   */
  testColorBlindnessAccessibility(colors: string[]): {
    type: ColorBlindnessType;
    issues: string[];
    recommendations: string[];
  }[] {
    const results: any[] = [];

    this.colorBlindnessTypes.forEach(type => {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Simulate color blindness and check for issues
      // This is a simplified implementation
      colors.forEach((color, index) => {
        const simulatedColor = this.simulateColorBlindness(color, type.type);
        if (simulatedColor === color) {
          // Color appears the same - potential issue
          issues.push(`Color ${color} may not be distinguishable for ${type.name}`);
          recommendations.push(`Consider using patterns, textures, or labels in addition to color`);
        }
      });

      results.push({
        type,
        issues,
        recommendations,
      });
    });

    return results;
  }

  /**
   * Simulate color blindness (simplified)
   */
  private simulateColorBlindness(color: string, type: ColorBlindnessType['type']): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;

    // Simplified color blindness simulation
    let simulatedRgb: ColorRGB;

    switch (type) {
      case 'protanopia':
        simulatedRgb = {
          r: rgb.g * 0.567 + rgb.b * 0.433,
          g: rgb.g * 0.558 + rgb.b * 0.442,
          b: rgb.g * 0.242 + rgb.b * 0.758,
        };
        break;
      case 'deuteranopia':
        simulatedRgb = {
          r: rgb.r * 0.625 + rgb.g * 0.375,
          g: rgb.r * 0.7 + rgb.g * 0.3,
          b: rgb.g * 0.3 + rgb.b * 0.7,
        };
        break;
      case 'tritanopia':
        simulatedRgb = {
          r: rgb.r * 0.95 + rgb.g * 0.05,
          g: rgb.g * 0.433 + rgb.b * 0.567,
          b: rgb.g * 0.475 + rgb.b * 0.525,
        };
        break;
      case 'achromatopsia':
        const gray = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114;
        simulatedRgb = { r: gray, g: gray, b: gray };
        break;
      default:
        return color;
    }

    return this.rgbToHex(simulatedRgb);
  }

  /**
   * Generate accessible color scheme
   */
  generateAccessibleColorScheme(baseColor: string): {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
  } {
    const baseRgb = this.hexToRgb(baseColor);
    if (!baseRgb) throw new Error('Invalid base color');

    const baseHsl = this.rgbToHsl(baseRgb);

    return {
      primary: baseColor,
      secondary: this.rgbToHex(this.hslToRgb({ ...baseHsl, l: Math.max(20, baseHsl.l - 20) })),
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
    };
  }
}

// Export singleton instance
export const colorContrastManager = new ColorContrastManager();

// Export utility functions
export const calculateContrastRatio = (color1: string, color2: string) =>
  colorContrastManager.calculateContrastRatio(color1, color2);

export const evaluateContrast = (foreground: string, background: string) =>
  colorContrastManager.evaluateContrast(foreground, background);

export const suggestAccessibleColors = (baseColor: string, targetBackground: string, targetRatio?: number) =>
  colorContrastManager.suggestAccessibleColors(baseColor, targetBackground, targetRatio);

export const analyzeColorPalette = (colors: string[]) =>
  colorContrastManager.analyzeColorPalette(colors);

export const updateVisualPreferences = (preferences: Partial<VisualPreferences>) =>
  colorContrastManager.updatePreferences(preferences);

export const getVisualPreferences = () =>
  colorContrastManager.getPreferences();
