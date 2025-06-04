/**
 * Advanced Virtualization System
 * 
 * This module provides comprehensive virtualization for large datasets including:
 * - Virtual scrolling for lists and tables
 * - Dynamic height calculation
 * - Horizontal and vertical virtualization
 * - Infinite scrolling
 * - Performance monitoring
 */

export interface VirtualizationConfig {
  itemHeight: number | 'dynamic';
  containerHeight: number;
  overscan: number;
  scrollingDelay: number;
  enableHorizontal: boolean;
  enableInfiniteScroll: boolean;
  threshold: number;
  estimatedItemSize: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface VirtualRange {
  start: number;
  end: number;
  overscanStart: number;
  overscanEnd: number;
}

export interface ScrollState {
  scrollTop: number;
  scrollLeft: number;
  isScrolling: boolean;
  scrollDirection: 'forward' | 'backward';
  scrollUpdateWasRequested: boolean;
}

class VirtualScroller {
  private config: VirtualizationConfig;
  private itemSizes: Map<number, number> = new Map();
  private scrollElement: HTMLElement | null = null;
  private totalSize = 0;
  private scrollState: ScrollState = {
    scrollTop: 0,
    scrollLeft: 0,
    isScrolling: false,
    scrollDirection: 'forward',
    scrollUpdateWasRequested: false,
  };
  private scrollTimeoutId: number | null = null;
  private observers: Set<(range: VirtualRange) => void> = new Set();
  private resizeObserver: ResizeObserver | null = null;

  constructor(config: Partial<VirtualizationConfig> = {}) {
    this.config = {
      itemHeight: 50,
      containerHeight: 400,
      overscan: 5,
      scrollingDelay: 150,
      enableHorizontal: false,
      enableInfiniteScroll: false,
      threshold: 0.8,
      estimatedItemSize: 50,
      ...config,
    };

    this.initializeResizeObserver();
  }

  /**
   * Initialize resize observer for dynamic sizing
   */
  private initializeResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          const size = this.config.enableHorizontal 
            ? entry.contentRect.width 
            : entry.contentRect.height;
          
          this.setItemSize(index, size);
        }
      });
    }
  }

  /**
   * Set scroll element
   */
  setScrollElement(element: HTMLElement): void {
    if (this.scrollElement) {
      this.scrollElement.removeEventListener('scroll', this.handleScroll);
    }

    this.scrollElement = element;
    
    if (element) {
      element.addEventListener('scroll', this.handleScroll, { passive: true });
    }
  }

  /**
   * Handle scroll events
   */
  private handleScroll = (event: Event): void => {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;

    const scrollDirection = scrollTop > this.scrollState.scrollTop ? 'forward' : 'backward';

    this.scrollState = {
      ...this.scrollState,
      scrollTop,
      scrollLeft,
      isScrolling: true,
      scrollDirection,
      scrollUpdateWasRequested: false,
    };

    this.notifyObservers();

    // Clear existing timeout
    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }

    // Set scrolling to false after delay
    this.scrollTimeoutId = window.setTimeout(() => {
      this.scrollState = {
        ...this.scrollState,
        isScrolling: false,
      };
      this.notifyObservers();
    }, this.config.scrollingDelay);
  };

  /**
   * Calculate virtual range
   */
  calculateRange(itemCount: number): VirtualRange {
    const { scrollTop } = this.scrollState;
    const { containerHeight, overscan } = this.config;

    let start = 0;
    let end = itemCount - 1;

    if (this.config.itemHeight === 'dynamic') {
      start = this.findStartIndex(scrollTop);
      end = this.findEndIndex(start, scrollTop + containerHeight);
    } else {
      const itemHeight = this.config.itemHeight as number;
      start = Math.floor(scrollTop / itemHeight);
      end = Math.min(
        itemCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      );
    }

    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(itemCount - 1, end + overscan);

    return {
      start,
      end,
      overscanStart,
      overscanEnd,
    };
  }

  /**
   * Find start index for dynamic heights
   */
  private findStartIndex(scrollTop: number): number {
    let totalHeight = 0;
    let index = 0;

    while (totalHeight < scrollTop && index < this.itemSizes.size) {
      totalHeight += this.getItemSize(index);
      index++;
    }

    return Math.max(0, index - 1);
  }

  /**
   * Find end index for dynamic heights
   */
  private findEndIndex(startIndex: number, scrollBottom: number): number {
    let totalHeight = this.getOffsetForIndex(startIndex);
    let index = startIndex;

    while (totalHeight < scrollBottom && index < this.itemSizes.size) {
      totalHeight += this.getItemSize(index);
      index++;
    }

    return index;
  }

  /**
   * Get item size
   */
  getItemSize(index: number): number {
    if (this.config.itemHeight !== 'dynamic') {
      return this.config.itemHeight as number;
    }

    return this.itemSizes.get(index) || this.config.estimatedItemSize;
  }

  /**
   * Set item size
   */
  setItemSize(index: number, size: number): void {
    const previousSize = this.itemSizes.get(index);
    
    if (previousSize !== size) {
      this.itemSizes.set(index, size);
      this.updateTotalSize();
      this.notifyObservers();
    }
  }

  /**
   * Get offset for index
   */
  getOffsetForIndex(index: number): number {
    if (this.config.itemHeight !== 'dynamic') {
      return index * (this.config.itemHeight as number);
    }

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.getItemSize(i);
    }
    return offset;
  }

  /**
   * Update total size
   */
  private updateTotalSize(): void {
    if (this.config.itemHeight !== 'dynamic') {
      return;
    }

    let total = 0;
    for (const size of this.itemSizes.values()) {
      total += size;
    }
    this.totalSize = total;
  }

  /**
   * Get total size
   */
  getTotalSize(itemCount: number): number {
    if (this.config.itemHeight !== 'dynamic') {
      return itemCount * (this.config.itemHeight as number);
    }

    return this.totalSize || itemCount * this.config.estimatedItemSize;
  }

  /**
   * Scroll to index
   */
  scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): void {
    if (!this.scrollElement) return;

    const offset = this.getOffsetForIndex(index);
    const itemSize = this.getItemSize(index);
    const containerHeight = this.config.containerHeight;

    let scrollTop = offset;

    switch (align) {
      case 'center':
        scrollTop = offset - (containerHeight - itemSize) / 2;
        break;
      case 'end':
        scrollTop = offset - containerHeight + itemSize;
        break;
    }

    this.scrollState = {
      ...this.scrollState,
      scrollUpdateWasRequested: true,
    };

    this.scrollElement.scrollTop = Math.max(0, scrollTop);
  }

  /**
   * Scroll to offset
   */
  scrollToOffset(offset: number): void {
    if (!this.scrollElement) return;

    this.scrollState = {
      ...this.scrollState,
      scrollUpdateWasRequested: true,
    };

    this.scrollElement.scrollTop = offset;
  }

  /**
   * Subscribe to range changes
   */
  subscribe(callback: (range: VirtualRange) => void): () => void {
    this.observers.add(callback);
    
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify observers
   */
  private notifyObservers(): void {
    // This would be called with the current item count
    // For now, we'll skip the notification as we don't have the count
  }

  /**
   * Notify observers with item count
   */
  notifyWithItemCount(itemCount: number): void {
    const range = this.calculateRange(itemCount);
    this.observers.forEach(callback => callback(range));
  }

  /**
   * Observe item for dynamic sizing
   */
  observeItem(element: HTMLElement, index: number): void {
    if (this.resizeObserver && this.config.itemHeight === 'dynamic') {
      element.setAttribute('data-index', index.toString());
      this.resizeObserver.observe(element);
    }
  }

  /**
   * Unobserve item
   */
  unobserveItem(element: HTMLElement): void {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(element);
    }
  }

  /**
   * Get scroll state
   */
  getScrollState(): ScrollState {
    return { ...this.scrollState };
  }

  /**
   * Check if should load more (for infinite scroll)
   */
  shouldLoadMore(itemCount: number): boolean {
    if (!this.config.enableInfiniteScroll) return false;

    const { scrollTop } = this.scrollState;
    const totalSize = this.getTotalSize(itemCount);
    const containerHeight = this.config.containerHeight;
    const threshold = this.config.threshold;

    const scrollProgress = (scrollTop + containerHeight) / totalSize;
    return scrollProgress >= threshold;
  }

  /**
   * Reset virtualization state
   */
  reset(): void {
    this.itemSizes.clear();
    this.totalSize = 0;
    this.scrollState = {
      scrollTop: 0,
      scrollLeft: 0,
      isScrolling: false,
      scrollDirection: 'forward',
      scrollUpdateWasRequested: false,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VirtualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    itemCount: number;
    totalSize: number;
    averageItemSize: number;
    scrollPosition: number;
  } {
    const itemCount = this.itemSizes.size;
    const averageItemSize = itemCount > 0 ? this.totalSize / itemCount : this.config.estimatedItemSize;

    return {
      itemCount,
      totalSize: this.totalSize,
      averageItemSize,
      scrollPosition: this.scrollState.scrollTop,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.scrollElement) {
      this.scrollElement.removeEventListener('scroll', this.handleScroll);
    }

    if (this.scrollTimeoutId) {
      clearTimeout(this.scrollTimeoutId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.observers.clear();
    this.itemSizes.clear();
  }
}

// Export utilities
export const createVirtualScroller = (config?: Partial<VirtualizationConfig>) => 
  new VirtualScroller(config);

export const calculateVisibleRange = (
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  itemCount: number,
  overscan: number = 5
): VirtualRange => {
  const start = Math.floor(scrollTop / itemHeight);
  const end = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );

  return {
    start,
    end,
    overscanStart: Math.max(0, start - overscan),
    overscanEnd: Math.min(itemCount - 1, end + overscan),
  };
};

export const getItemOffset = (index: number, itemHeight: number): number => {
  return index * itemHeight;
};

export const getScrollOffset = (
  index: number,
  itemHeight: number,
  containerHeight: number,
  align: 'start' | 'center' | 'end' = 'start'
): number => {
  const offset = getItemOffset(index, itemHeight);

  switch (align) {
    case 'center':
      return offset - (containerHeight - itemHeight) / 2;
    case 'end':
      return offset - containerHeight + itemHeight;
    default:
      return offset;
  }
};
