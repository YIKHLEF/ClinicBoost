import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Filter,
  Search,
  Download,
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export interface Column<T = any> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  visible?: boolean;
  pinned?: 'left' | 'right' | false;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort: (column: string, order: 'asc' | 'desc') => void;
  };
  filtering?: {
    filters: Record<string, any>;
    onFilter: (filters: Record<string, any>) => void;
  };
  selection?: {
    selectedRows: string[];
    onSelectionChange: (selectedRows: string[]) => void;
    getRowId: (row: T) => string;
  };
  virtualization?: {
    enabled: boolean;
    rowHeight: number;
    containerHeight: number;
  };
  onRowClick?: (row: T, index: number) => void;
  onRowDoubleClick?: (row: T, index: number) => void;
  emptyState?: React.ReactNode;
  className?: string;
  rowClassName?: string | ((row: T, index: number) => string);
}

export const AdvancedTable = <T extends Record<string, any>>({
  data,
  columns: initialColumns,
  loading = false,
  pagination,
  sorting,
  filtering,
  selection,
  virtualization,
  onRowClick,
  onRowDoubleClick,
  emptyState,
  className = '',
  rowClassName,
}: TableProps<T>) => {
  const [columns, setColumns] = useState(initialColumns.map(col => ({ ...col, visible: col.visible !== false })));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number; columnId: string } | null>(null);

  // Initialize column widths
  useEffect(() => {
    const initialWidths: Record<string, number> = {};
    columns.forEach(col => {
      if (col.width) {
        initialWidths[col.id] = col.width;
      }
    });
    setColumnWidths(initialWidths);
  }, [columns]);

  // Handle column resizing
  const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[columnId] || 150;
    
    setResizingColumn(columnId);
    resizeRef.current = { startX, startWidth, columnId };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      
      const { startX, startWidth, columnId } = resizeRef.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      
      setColumnWidths(prev => ({
        ...prev,
        [columnId]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Handle column reordering
  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggingColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData('text/plain');

    if (sourceColumnId === targetColumnId) {
      setDraggingColumn(null);
      setDragOverColumn(null);
      return;
    }

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceIndex = newColumns.findIndex(col => col.id === sourceColumnId);
      const targetIndex = newColumns.findIndex(col => col.id === targetColumnId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const [sourceColumn] = newColumns.splice(sourceIndex, 1);
        newColumns.splice(targetIndex, 0, sourceColumn);
      }

      return newColumns;
    });

    setDraggingColumn(null);
    setDragOverColumn(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingColumn(null);
    setDragOverColumn(null);
  }, []);

  // Column visibility management
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const resetColumns = useCallback(() => {
    setColumns(initialColumns.map(col => ({ ...col, visible: col.visible !== false })));
    setColumnWidths({});
  }, [initialColumns]);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible !== false);
  }, [columns]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(row => {
      return visibleColumns.some(col => {
        const value = typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor];

        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, visibleColumns]);

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    if (!sorting) return;
    
    const currentOrder = sorting.sortBy === columnId ? sorting.sortOrder : undefined;
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    sorting.onSort(columnId, newOrder);
  }, [sorting]);

  // Handle selection
  const handleRowSelection = useCallback((row: T, checked: boolean) => {
    if (!selection) return;
    
    const rowId = selection.getRowId(row);
    const newSelection = checked
      ? [...selection.selectedRows, rowId]
      : selection.selectedRows.filter(id => id !== rowId);
    
    selection.onSelectionChange(newSelection);
  }, [selection]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!selection) return;
    
    const newSelection = checked
      ? filteredData.map(row => selection.getRowId(row))
      : [];
    
    selection.onSelectionChange(newSelection);
  }, [selection, filteredData]);

  // Render table header
  const renderHeader = () => (
    <thead className="bg-gray-50 dark:bg-gray-800">
      <tr>
        {selection && (
          <th className="w-12 px-3 py-3">
            <input
              type="checkbox"
              checked={selection.selectedRows.length === filteredData.length && filteredData.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </th>
        )}
        {visibleColumns.map((column) => (
          <th
            key={column.id}
            draggable
            onDragStart={(e) => handleDragStart(e, column.id)}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            onDragEnd={handleDragEnd}
            className={`
              px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative cursor-move
              ${column.headerClassName || ''}
              ${draggingColumn === column.id ? 'opacity-50' : ''}
              ${dragOverColumn === column.id ? 'bg-primary-100 dark:bg-primary-900/20' : ''}
            `}
            style={{ width: columnWidths[column.id] || column.width || 'auto' }}
          >
            <div className="flex items-center space-x-1">
              <GripVertical size={12} className="text-gray-400 mr-1" />

              <span
                className={`${column.sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                {column.header}
              </span>

              {column.sortable && sorting && (
                <div className="flex flex-col">
                  <ChevronUp
                    size={12}
                    className={`${sorting.sortBy === column.id && sorting.sortOrder === 'asc' ? 'text-primary-500' : 'text-gray-400'}`}
                  />
                  <ChevronDown
                    size={12}
                    className={`${sorting.sortBy === column.id && sorting.sortOrder === 'desc' ? 'text-primary-500' : 'text-gray-400'}`}
                  />
                </div>
              )}
            </div>

            {column.resizable !== false && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-500 opacity-0 hover:opacity-100"
                onMouseDown={(e) => handleMouseDown(e, column.id)}
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );

  // Render table row
  const renderRow = useCallback((row: T, index: number, style?: React.CSSProperties) => {
    const isSelected = selection ? selection.selectedRows.includes(selection.getRowId(row)) : false;
    const rowClass = typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName;
    
    return (
      <tr
        key={selection ? selection.getRowId(row) : index}
        style={style}
        className={`
          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-900'}
          hover:bg-gray-50 dark:hover:bg-gray-800 
          ${onRowClick ? 'cursor-pointer' : ''}
          ${rowClass || ''}
        `}
        onClick={() => onRowClick?.(row, index)}
        onDoubleClick={() => onRowDoubleClick?.(row, index)}
      >
        {selection && (
          <td className="w-12 px-3 py-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelection(row, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </td>
        )}
        {visibleColumns.map((column) => {
          const value = typeof column.accessor === 'function'
            ? column.accessor(row)
            : row[column.accessor];

          return (
            <td
              key={column.id}
              className={`px-3 py-4 text-sm text-gray-900 dark:text-gray-100 ${column.className || ''}`}
              style={{ width: columnWidths[column.id] || column.width || 'auto' }}
            >
              {column.render ? column.render(value, row, index) : String(value || '')}
            </td>
          );
        })}
      </tr>
    );
  }, [visibleColumns, columnWidths, selection, onRowClick, onRowDoubleClick, rowClassName, handleRowSelection]);

  // Render virtualized row
  const VirtualizedRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = filteredData[index];
    return renderRow(row, index, style);
  }, [filteredData, renderRow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 shadow rounded-lg ${className}`}>
        {emptyState || (
          <EmptyState
            type={searchTerm ? 'search' : 'general'}
            title={searchTerm ? `No results for "${searchTerm}"` : 'No data found'}
            description={searchTerm ? 'Try adjusting your search terms' : 'Data will appear here when available'}
            onAction={searchTerm ? () => setSearchTerm('') : undefined}
            actionLabel={searchTerm ? 'Clear Search' : undefined}
            size="md"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 shadow rounded-lg ${className}`}>
      {/* Table controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {filtering && (
              <Button variant="outline" size="sm">
                <Filter size={16} className="mr-2" />
                Filters
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowColumnSettings(!showColumnSettings)}
            >
              <Settings size={16} className="mr-2" />
              Columns
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="overflow-auto">
        {virtualization?.enabled ? (
          <div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {renderHeader()}
            </table>
            <List
              height={virtualization.containerHeight}
              itemCount={filteredData.length}
              itemSize={virtualization.rowHeight}
              className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            >
              {VirtualizedRow}
            </List>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {renderHeader()}
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((row, index) => renderRow(row, index))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Column Settings Panel */}
      {showColumnSettings && (
        <div className="absolute top-0 right-0 mt-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Column Settings
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColumnSettings(false)}
              >
                ×
              </Button>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={column.visible !== false}
                      onChange={() => toggleColumnVisibility(column.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {column.header}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {column.visible !== false ? (
                      <Eye size={16} className="text-green-500" />
                    ) : (
                      <EyeOff size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={resetColumns}
                className="w-full"
              >
                <RotateCcw size={16} className="mr-2" />
                Reset to Default
              </Button>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>• Drag column headers to reorder</p>
              <p>• Drag the right edge to resize</p>
              <p>• Use checkboxes to show/hide columns</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
