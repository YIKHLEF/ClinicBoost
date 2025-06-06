import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isDemoMode) {
  console.log('Running in demo mode - using mock data');
} else if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Using mock data mode.');
}

// Create a mock client for demo mode that doesn't make real API calls
const createMockClient = () => {
  // Create a chainable query builder mock
  const createQueryBuilder = () => {
    const queryBuilder = {
      select: (columns?: string) => queryBuilder,
      insert: (data: any) => queryBuilder,
      update: (data: any) => queryBuilder,
      delete: () => queryBuilder,
      upsert: (data: any) => queryBuilder,
      eq: (column: string, value: any) => queryBuilder,
      neq: (column: string, value: any) => queryBuilder,
      gt: (column: string, value: any) => queryBuilder,
      gte: (column: string, value: any) => queryBuilder,
      lt: (column: string, value: any) => queryBuilder,
      lte: (column: string, value: any) => queryBuilder,
      like: (column: string, pattern: string) => queryBuilder,
      ilike: (column: string, pattern: string) => queryBuilder,
      is: (column: string, value: any) => queryBuilder,
      in: (column: string, values: any[]) => queryBuilder,
      contains: (column: string, value: any) => queryBuilder,
      containedBy: (column: string, value: any) => queryBuilder,
      rangeGt: (column: string, value: any) => queryBuilder,
      rangeGte: (column: string, value: any) => queryBuilder,
      rangeLt: (column: string, value: any) => queryBuilder,
      rangeLte: (column: string, value: any) => queryBuilder,
      rangeAdjacent: (column: string, value: any) => queryBuilder,
      overlaps: (column: string, value: any) => queryBuilder,
      textSearch: (column: string, query: string) => queryBuilder,
      match: (query: Record<string, any>) => queryBuilder,
      not: (column: string, operator: string, value: any) => queryBuilder,
      or: (filters: string) => queryBuilder,
      filter: (column: string, operator: string, value: any) => queryBuilder,
      order: (column: string, options?: { ascending?: boolean }) => queryBuilder,
      limit: (count: number) => queryBuilder,
      range: (from: number, to: number) => queryBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      csv: () => Promise.resolve({ data: '', error: null }),
      geojson: () => Promise.resolve({ data: null, error: null }),
      explain: () => Promise.resolve({ data: null, error: null }),
      rollback: () => Promise.resolve({ data: null, error: null }),
      returns: () => queryBuilder,
      then: (resolve: any, reject?: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject),
      catch: (reject: any) => Promise.resolve({ data: [], error: null, count: 0 }).catch(reject),
    };
    return queryBuilder;
  };

  const mockClient = {
    from: (table: string) => createQueryBuilder(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    channel: (name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    rpc: (fn: string, params?: any) => Promise.resolve({ data: null, error: null }),
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
        createSignedUrls: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
  return mockClient as any;
};

export const supabase = isDemoMode || !supabaseUrl || !supabaseAnonKey
  ? createMockClient()
  : createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );

// Real-time subscription helpers
export const subscribeToTable = <T = any>(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  if (isDemoMode) {
    // Return a no-op unsubscribe function for demo mode
    return () => {};
  }

  const channel = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Connection status helper
export const getConnectionStatus = async (): Promise<boolean> => {
  if (isDemoMode) {
    return true; // Always return true in demo mode
  }

  try {
    const { error } = await supabase.from('treatments').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};

// Export demo mode flag for other modules
export { isDemoMode };