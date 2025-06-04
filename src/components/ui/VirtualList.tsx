import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createVirtualScroller, type VirtualizationConfig, type VirtualRange } from '../../lib/virtualization';
import { memo } from '../../lib/react-memoization';

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | 'dynamic';
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end';
  enableInfiniteScroll?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
  estimatedItemSize?: number;
  threshold?: number;
}

const VirtualList = memo(<T extends any>(props: VirtualListProps<T>) => {
  const {
    items,
    height,
    itemHeight,
    renderItem,
    overscan = 5,
    className = '',
    style,
    onScroll,
    onItemsRendered,
    scrollToIndex,
    scrollToAlignment = 'start',
    enableInfiniteScroll = false,
    onLoadMore,
    loading = false,
    estimatedItemSize = 50,
    threshold = 0.8,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<VirtualRange>({ start: 0, end: 0, overscanStart: 0, overscanEnd: 0 });
  const [isScrolling, setIsScrolling] = useState(false);

  // Create virtual scroller
  const virtualScroller = useMemo(() => {
    const config: Partial<VirtualizationConfig> = {
      itemHeight,
      containerHeight: height,
      overscan,
      enableInfiniteScroll,
      threshold,
      estimatedItemSize,
    };

    return createVirtualScroller(config);
  }, [itemHeight, height, overscan, enableInfiniteScroll, threshold, estimatedItemSize]);

  // Setup scroll element
  useEffect(() => {
    if (containerRef.current) {
      virtualScroller.setScrollElement(containerRef.current);
    }

    return () => {
      virtualScroller.destroy();
    };
  }, [virtualScroller]);

  // Subscribe to range changes
  useEffect(() => {
    const unsubscribe = virtualScroller.subscribe((newRange) => {
      setRange(newRange);
      onItemsRendered?.(newRange.start, newRange.end);

      const scrollState = virtualScroller.getScrollState();
      setIsScrolling(scrollState.isScrolling);
      onScroll?.(scrollState.scrollTop, scrollState.scrollLeft);

      // Check for infinite scroll
      if (enableInfiniteScroll && !loading && onLoadMore) {
        if (virtualScroller.shouldLoadMore(items.length)) {
          onLoadMore();
        }
      }
    });

    // Initial calculation
    virtualScroller.notifyWithItemCount(items.length);

    return unsubscribe;
  }, [virtualScroller, items.length, onItemsRendered, onScroll, enableInfiniteScroll, loading, onLoadMore]);

  // Handle scroll to index
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      virtualScroller.scrollToIndex(scrollToIndex, scrollToAlignment);
    }
  }, [scrollToIndex, scrollToAlignment, virtualScroller, items.length]);

  // Calculate total size
  const totalSize = virtualScroller.getTotalSize(items.length);

  // Get visible items
  const visibleItems = useMemo(() => {
    const result: Array<{
      item: T;
      index: number;
      style: React.CSSProperties;
    }> = [];

    for (let i = range.overscanStart; i <= range.overscanEnd && i < items.length; i++) {
      const item = items[i];
      const offset = virtualScroller.getOffsetForIndex(i);
      const size = virtualScroller.getItemSize(i);

      const style: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: itemHeight === 'dynamic' ? undefined : size,
        transform: `translateY(${offset}px)`,
      };

      result.push({ item, index: i, style });
    }

    return result;
  }, [items, range, virtualScroller, itemHeight]);

  // Item renderer with size observation
  const renderVirtualItem = useCallback((
    item: T,
    index: number,
    style: React.CSSProperties
  ) => {
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (itemRef.current && itemHeight === 'dynamic') {
        virtualScroller.observeItem(itemRef.current, index);
        
        return () => {
          if (itemRef.current) {
            virtualScroller.unobserveItem(itemRef.current);
          }
        };
      }
    }, [index]);

    return (
      <div
        ref={itemRef}
        key={index}
        style={style}
        data-index={index}
      >
        {renderItem(item, index, style)}
      </div>
    );
  }, [renderItem, itemHeight, virtualScroller]);

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className} ${isScrolling ? 'scrolling' : ''}`}
      style={{
        height,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      {/* Virtual container */}
      <div
        style={{
          height: totalSize,
          position: 'relative',
        }}
      >
        {/* Visible items */}
        {visibleItems.map(({ item, index, style }) =>
          renderVirtualItem(item, index, style)
        )}

        {/* Loading indicator for infinite scroll */}
        {enableInfiniteScroll && loading && (
          <div
            style={{
              position: 'absolute',
              top: totalSize,
              left: 0,
              right: 0,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        )}
      </div>
    </div>
  );
});

VirtualList.displayName = 'VirtualList';

export default VirtualList;

// Virtual Grid Component
export interface VirtualGridProps<T> {
  items: T[];
  height: number;
  width: number;
  itemHeight: number;
  itemWidth: number;
  columnCount: number;
  renderItem: (item: T, rowIndex: number, columnIndex: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

export const VirtualGrid = memo(<T extends any>(props: VirtualGridProps<T>) => {
  const {
    items,
    height,
    width,
    itemHeight,
    itemWidth,
    columnCount,
    renderItem,
    overscan = 5,
    className = '',
    style,
    onScroll,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollTop: 0, scrollLeft: 0 });

  const rowCount = Math.ceil(items.length / columnCount);
  const totalHeight = rowCount * itemHeight;
  const totalWidth = columnCount * itemWidth;

  // Calculate visible range
  const visibleRowStart = Math.floor(scrollState.scrollTop / itemHeight);
  const visibleRowEnd = Math.min(
    rowCount - 1,
    Math.ceil((scrollState.scrollTop + height) / itemHeight)
  );

  const overscanRowStart = Math.max(0, visibleRowStart - overscan);
  const overscanRowEnd = Math.min(rowCount - 1, visibleRowEnd + overscan);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    setScrollState({ scrollTop, scrollLeft });
    onScroll?.(scrollTop, scrollLeft);
  }, [onScroll]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let rowIndex = overscanRowStart; rowIndex <= overscanRowEnd; rowIndex++) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        const itemIndex = rowIndex * columnCount + columnIndex;
        
        if (itemIndex >= items.length) break;

        const item = items[itemIndex];
        const style: React.CSSProperties = {
          position: 'absolute',
          top: rowIndex * itemHeight,
          left: columnIndex * itemWidth,
          width: itemWidth,
          height: itemHeight,
        };

        result.push(
          <div key={itemIndex} style={style}>
            {renderItem(item, rowIndex, columnIndex, style)}
          </div>
        );
      }
    }

    return result;
  }, [items, overscanRowStart, overscanRowEnd, columnCount, itemHeight, itemWidth, renderItem]);

  return (
    <div
      ref={containerRef}
      className={`virtual-grid ${className}`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          width: totalWidth,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

// Virtual Table Component
export interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width: number;
    render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  }>;
  height: number;
  rowHeight: number;
  headerHeight?: number;
  overscan?: number;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
}

export const VirtualTable = memo(<T extends Record<string, any>>(props: VirtualTableProps<T>) => {
  const {
    data,
    columns,
    height,
    rowHeight,
    headerHeight = 40,
    overscan = 5,
    className = '',
    onRowClick,
  } = props;

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  const renderRow = useCallback((
    row: T,
    index: number,
    style: React.CSSProperties
  ) => (
    <div
      style={{
        ...style,
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        cursor: onRowClick ? 'pointer' : 'default',
      }}
      onClick={() => onRowClick?.(row, index)}
    >
      {columns.map((column) => (
        <div
          key={String(column.key)}
          style={{
            width: column.width,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {column.render
            ? column.render(row[column.key], row, index)
            : String(row[column.key] || '')
          }
        </div>
      ))}
    </div>
  ), [columns, onRowClick]);

  return (
    <div className={`virtual-table ${className}`}>
      {/* Header */}
      <div
        style={{
          height: headerHeight,
          display: 'flex',
          backgroundColor: '#f9fafb',
          borderBottom: '2px solid #e5e7eb',
          fontWeight: 600,
        }}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            style={{
              width: column.width,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid #e5e7eb',
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual List */}
      <VirtualList
        items={data}
        height={height - headerHeight}
        itemHeight={rowHeight}
        renderItem={renderRow}
        overscan={overscan}
      />
    </div>
  );
});

VirtualTable.displayName = 'VirtualTable';
