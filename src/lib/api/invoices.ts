import { supabase } from '../supabase';
import { Database } from '../database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export interface InvoiceWithDetails extends Invoice {
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  treatments?: {
    id: string;
    name: string;
    description: string;
  };
}

export interface InvoiceSearchFilters {
  search?: string;
  status?: Database['public']['Enums']['payment_status'];
  patientId?: string;
  treatmentId?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  dueDateRange?: {
    start: string;
    end: string;
  };
  paymentMethod?: string;
}

export interface InvoiceSearchResult {
  invoices: InvoiceWithDetails[];
  totalCount: number;
}

export const getInvoices = async (clinicId?: string): Promise<InvoiceWithDetails[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        patients (id, first_name, last_name, email),
        treatments (id, name, description)
      `);

    // Note: Invoices are linked to patients, and patients are linked to clinics
    // We need to filter through the patient relationship
    if (clinicId) {
      query = query.eq('patients.clinic_id', clinicId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching invoices:', error);
    throw error;
  }
};

export const getInvoice = async (id: string): Promise<InvoiceWithDetails> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        patients (id, first_name, last_name, email),
        treatments (id, name, description)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching invoice:', error);
    throw error;
  }
};

export const searchInvoices = async (
  filters: InvoiceSearchFilters = {},
  page: number = 1,
  limit: number = 25,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<InvoiceSearchResult> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        patients (id, first_name, last_name, email),
        treatments (id, name, description)
      `, { count: 'exact' });

    // Apply patient filter
    if (filters.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    // Apply treatment filter
    if (filters.treatmentId) {
      query = query.eq('treatment_id', filters.treatmentId);
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply payment method filter
    if (filters.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    // Apply amount range filter
    if (filters.amountRange) {
      query = query
        .gte('amount', filters.amountRange.min)
        .lte('amount', filters.amountRange.max);
    }

    // Apply date range filter
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    // Apply due date range filter
    if (filters.dueDateRange) {
      query = query
        .gte('due_date', filters.dueDateRange.start)
        .lte('due_date', filters.dueDateRange.end);
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
      console.error('Error searching invoices:', error);
      throw new Error(`Failed to search invoices: ${error.message}`);
    }

    return {
      invoices: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('Unexpected error searching invoices:', error);
    throw error;
  }
};

export const createInvoice = async (invoice: InvoiceInsert): Promise<Invoice> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (id: string, invoice: InvoiceUpdate): Promise<Invoice> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...invoice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw new Error(`Failed to update invoice: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  } catch (error) {
    console.error('Unexpected error deleting invoice:', error);
    throw error;
  }
};
