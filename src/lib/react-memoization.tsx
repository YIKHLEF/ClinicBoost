import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { memoize, createSelector, type AdvancedMemoizer } from './memoization';

/**
 * React-specific memoization utilities for optimal performance
 */

// Enhanced memo with deep comparison
export const deepMemo = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  const defaultAreEqual = (prevProps: P, nextProps: P): boolean => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  };

  return memo(Component, areEqual || defaultAreEqual);
};

// Memo with custom comparison function
export const memoWithComparison = <P extends object>(
  Component: React.ComponentType<P>,
  compareKeys: (keyof P)[]
) => {
  const areEqual = (prevProps: P, nextProps: P): boolean => {
    return compareKeys.every(key => prevProps[key] === nextProps[key]);
  };

  return memo(Component, areEqual);
};

// Stable callback hook with memoization
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T => {
  const callbackRef = useRef(callback);
  const stableCallback = useRef<T>();

  useEffect(() => {
    callbackRef.current = callback;
  });

  if (!stableCallback.current) {
    stableCallback.current = ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T;
  }

  return stableCallback.current;
};

// Memoized selector hook
export const useMemoizedSelector = <State, Selected>(
  selector: (state: State) => Selected,
  state: State,
  deps: React.DependencyList = []
): Selected => {
  const memoizedSelector = useMemo(
    () => memoize(selector),
    deps
  );

  return memoizedSelector(state);
};

// Complex computation memoization
export const useComputedValue = <T, Args extends any[]>(
  computeFn: (...args: Args) => T,
  args: Args,
  deps: React.DependencyList = []
): T => {
  const memoizedCompute = useMemo(
    () => memoize(computeFn),
    deps
  );

  return memoizedCompute(...args);
};

// Async data fetching with memoization
export const useMemoizedAsyncData = <T, Args extends any[]>(
  fetchFn: (...args: Args) => Promise<T>,
  args: Args,
  deps: React.DependencyList = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const memoizedFetch = useMemo(
    () => memoize(fetchFn),
    deps
  );

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await memoizedFetch(...args);
        
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [memoizedFetch, ...args]);

  return { data, loading, error };
};

// Memoized event handlers
export const useMemoizedHandlers = <T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  deps: React.DependencyList = []
): T => {
  return useMemo(() => {
    const memoizedHandlers = {} as T;
    
    for (const [key, handler] of Object.entries(handlers)) {
      memoizedHandlers[key as keyof T] = memoize(handler);
    }
    
    return memoizedHandlers;
  }, deps);
};

// Optimized list rendering with memoization
export const MemoizedList = memo(<T extends { id: string | number }>(props: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string | number;
  className?: string;
}) => {
  const { items, renderItem, keyExtractor = (item) => item.id, className } = props;

  const memoizedRenderItem = useMemo(
    () => memoize(renderItem),
    [renderItem]
  );

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor(item)}>
          {memoizedRenderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
});

MemoizedList.displayName = 'MemoizedList';

// Memoized form field component
export const MemoizedFormField = memo(<T extends string | number>(props: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) => {
  const { name, value, onChange, type = 'text', placeholder, className, disabled } = props;

  const handleChange = useStableCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) as T : e.target.value as T;
    onChange(newValue);
  }, [onChange, type]);

  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
});

MemoizedFormField.displayName = 'MemoizedFormField';

// Memoized table component
export const MemoizedTable = memo(<T extends Record<string, any>>(props: {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: any, row: T) => React.ReactNode;
  }>;
  className?: string;
  onRowClick?: (row: T) => void;
}) => {
  const { data, columns, className, onRowClick } = props;

  const memoizedRenderCell = useMemo(
    () => memoize((column: typeof columns[0], row: T) => {
      const value = row[column.key];
      return column.render ? column.render(value, row) : String(value);
    }),
    [columns]
  );

  const memoizedHandleRowClick = useMemo(
    () => onRowClick ? memoize(onRowClick) : undefined,
    [onRowClick]
  );

  return (
    <table className={className}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr
            key={index}
            onClick={memoizedHandleRowClick ? () => memoizedHandleRowClick(row) : undefined}
            className={memoizedHandleRowClick ? 'cursor-pointer' : undefined}
          >
            {columns.map((column) => (
              <td key={String(column.key)}>
                {memoizedRenderCell(column, row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

MemoizedTable.displayName = 'MemoizedTable';

// Higher-order component for automatic memoization
export const withMemoization = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    compareKeys?: (keyof P)[];
    deep?: boolean;
  }
) => {
  if (options?.compareKeys) {
    return memoWithComparison(Component, options.compareKeys);
  }
  
  if (options?.deep) {
    return deepMemo(Component);
  }
  
  return memo(Component);
};

// Context with memoization
export const createMemoizedContext = <T,>(defaultValue: T) => {
  const Context = React.createContext<T>(defaultValue);

  const Provider: React.FC<{ value: T; children: React.ReactNode }> = memo(
    ({ value, children }) => {
      const memoizedValue = useMemo(() => value, [JSON.stringify(value)]);
      
      return (
        <Context.Provider value={memoizedValue}>
          {children}
        </Context.Provider>
      );
    }
  );

  Provider.displayName = 'MemoizedProvider';

  const useContext = () => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error('useContext must be used within a Provider');
    }
    return context;
  };

  return { Provider, useContext };
};

// Memoized reducer hook
export const useMemoizedReducer = <State, Action>(
  reducer: (state: State, action: Action) => State,
  initialState: State
) => {
  const memoizedReducer = useMemo(
    () => memoize(reducer),
    [reducer]
  );

  return React.useReducer(memoizedReducer, initialState);
};

// Performance monitoring hook
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
};

// Memoization debugging hook
export const useMemoizationDebug = (value: any, name: string) => {
  const previousValue = useRef(value);
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    
    if (previousValue.current !== value) {
      console.log(`${name} changed:`, {
        from: previousValue.current,
        to: value,
        renderCount: renderCount.current,
      });
      previousValue.current = value;
    }
  });
};

// Batch updates for better performance
export const useBatchedUpdates = () => {
  const updates = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updateFn: () => void) => {
    updates.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      React.unstable_batchedUpdates(() => {
        updates.current.forEach(fn => fn());
        updates.current = [];
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
};

// Optimized children rendering
export const MemoizedChildren = memo(({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
});

MemoizedChildren.displayName = 'MemoizedChildren';
