import { supabase } from '../supabase';
import { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export interface PatientSearchFilters {
  search?: string;
  status?: string;
  riskLevel?: string;
  insuranceProvider?: string;
  city?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  clinicId?: string;
}

export interface PatientSearchResult {
  patients: Patient[];
  totalCount: number;
}

export const getPatients = async (clinicId?: string): Promise<Patient[]> => {
  try {
    let query = supabase
      .from('patients')
      .select('*');

    // Filter by clinic if provided
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching patients:', error);
    throw error;
  }
};

export const searchPatients = async (
  filters: PatientSearchFilters = {},
  page: number = 1,
  limit: number = 25,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PatientSearchResult> => {
  try {
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    // Apply clinic filter
    if (filters.clinicId) {
      query = query.eq('clinic_id', filters.clinicId);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply risk level filter
    if (filters.riskLevel) {
      query = query.eq('risk_level', filters.riskLevel);
    }

    // Apply insurance provider filter
    if (filters.insuranceProvider) {
      query = query.ilike('insurance_provider', `%${filters.insuranceProvider}%`);
    }

    // Apply city filter
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    // Apply date range filter
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error searching patients:', error);
      throw new Error(`Failed to search patients: ${error.message}`);
    }

    return {
      patients: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('Unexpected error searching patients:', error);
    throw error;
  }
};

export const getPatient = async (id: string): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching patient:', error);
    throw error;
  }
};

export const createPatient = async (patient: PatientInsert): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        ...patient,
        status: patient.status || 'active',
        risk_level: patient.risk_level || 'low',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating patient:', error);
    throw error;
  }
};

export const updatePatient = async (id: string, patient: PatientUpdate): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update({
        ...patient,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating patient:', error);
    throw error;
  }
};

export const deletePatient = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      throw new Error(`Failed to delete patient: ${error.message}`);
    }
  } catch (error) {
    console.error('Unexpected error deleting patient:', error);
    throw error;
  }
};