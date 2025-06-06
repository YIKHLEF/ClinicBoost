import { supabase } from '../supabase';
import { Database } from '../database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export interface AppointmentWithDetails extends Appointment {
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  users?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface AppointmentSearchFilters {
  search?: string;
  status?: Database['public']['Enums']['appointment_status'];
  patientId?: string;
  dentistId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  clinicId?: string;
}

export interface AppointmentSearchResult {
  appointments: AppointmentWithDetails[];
  totalCount: number;
}

export const getAppointments = async (clinicId?: string) => {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patients (id, first_name, last_name),
      users (id, first_name, last_name)
    `);

  // Filter by clinic if provided
  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) throw error;
  return data;
};

export const searchAppointments = async (
  filters: AppointmentSearchFilters = {},
  page: number = 1,
  limit: number = 25,
  sortBy: string = 'start_time',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<AppointmentSearchResult> => {
  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients (id, first_name, last_name),
        users (id, first_name, last_name)
      `, { count: 'exact' });

    // Apply clinic filter
    if (filters.clinicId) {
      query = query.eq('clinic_id', filters.clinicId);
    }

    // Apply patient filter
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    // Apply dentist filter
    if (filters.dentistId) {
      query = query.eq('dentist_id', filters.dentistId);
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply date range filter
    if (filters.dateRange) {
      query = query
        .gte('start_time', filters.dateRange.start)
        .lte('start_time', filters.dateRange.end);
    }

    // Apply search filter (search in notes and patient names)
    if (filters.search) {
      query = query.or(`notes.ilike.%${filters.search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching appointments:', error);
      throw new Error(`Failed to search appointments: ${error.message}`);
    }

    return {
      appointments: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('Unexpected error searching appointments:', error);
    throw error;
  }
};

export const getAppointment = async (id: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, first_name, last_name),
      users (id, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createAppointment = async (appointment: AppointmentInsert) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAppointment = async ({ id, ...appointment }: AppointmentUpdate & { id: string }) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointment)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};