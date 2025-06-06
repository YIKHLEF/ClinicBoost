import { supabase } from '../supabase';
import { Database } from '../database.types';
import { searchPatients, PatientSearchFilters } from '../api/patients';
import { searchAppointments, AppointmentSearchFilters } from '../api/appointments';
import { searchInvoices, InvoiceSearchFilters } from '../api/invoices';

export type SearchEntityType = 'patient' | 'appointment' | 'invoice' | 'treatment' | 'user';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface GlobalSearchFilters {
  query?: string;
  types?: SearchEntityType[];
  clinicId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

export interface GlobalSearchResult {
  results: SearchResult[];
  totalCount: number;
  resultsByType: Record<SearchEntityType, SearchResult[]>;
  facets: {
    types: Array<{ type: SearchEntityType; count: number }>;
    statuses: Array<{ status: string; count: number }>;
    dateRanges: Array<{ range: string; count: number }>;
  };
}

class SearchService {
  /**
   * Perform global search across all entities
   */
  async globalSearch(filters: GlobalSearchFilters): Promise<GlobalSearchResult> {
    const {
      query = '',
      types = ['patient', 'appointment', 'invoice', 'treatment'],
      clinicId,
      dateRange,
      limit = 50,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = filters;

    const results: SearchResult[] = [];
    const resultsByType: Record<SearchEntityType, SearchResult[]> = {
      patient: [],
      appointment: [],
      invoice: [],
      treatment: [],
      user: []
    };

    // Search patients
    if (types.includes('patient')) {
      const patientFilters: PatientSearchFilters = {
        search: query,
        clinicId,
        dateRange
      };
      
      const patientResults = await searchPatients(patientFilters, 1, limit);
      const patientSearchResults = patientResults.patients.map(patient => ({
        id: patient.id,
        type: 'patient' as SearchEntityType,
        title: `${patient.first_name} ${patient.last_name}`,
        subtitle: patient.phone,
        description: `${patient.status} • ${patient.insurance_provider || 'No insurance'}`,
        url: `/patients/${patient.id}`,
        metadata: {
          status: patient.status,
          riskLevel: patient.risk_level,
          city: patient.city,
          insuranceProvider: patient.insurance_provider
        },
        createdAt: patient.created_at,
        updatedAt: patient.updated_at
      }));

      results.push(...patientSearchResults);
      resultsByType.patient = patientSearchResults;
    }

    // Search appointments
    if (types.includes('appointment')) {
      const appointmentFilters: AppointmentSearchFilters = {
        search: query,
        clinicId,
        dateRange
      };
      
      const appointmentResults = await searchAppointments(appointmentFilters, 1, limit);
      const appointmentSearchResults = appointmentResults.appointments.map(appointment => ({
        id: appointment.id,
        type: 'appointment' as SearchEntityType,
        title: `${appointment.patients?.first_name} ${appointment.patients?.last_name}`,
        subtitle: new Date(appointment.start_time).toLocaleDateString(),
        description: `${appointment.status} • Dr. ${appointment.users?.first_name} ${appointment.users?.last_name}`,
        url: `/appointments/${appointment.id}`,
        metadata: {
          status: appointment.status,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          patientId: appointment.patient_id,
          dentistId: appointment.dentist_id
        },
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      }));

      results.push(...appointmentSearchResults);
      resultsByType.appointment = appointmentSearchResults;
    }

    // Search invoices
    if (types.includes('invoice')) {
      const invoiceFilters = {
        search: query,
        dateRange
      };
      
      const invoiceResults = await searchInvoices(invoiceFilters, 1, limit);
      const invoiceSearchResults = invoiceResults.invoices.map(invoice => ({
        id: invoice.id,
        type: 'invoice' as SearchEntityType,
        title: `Invoice #${invoice.id.slice(-8)}`,
        subtitle: `${invoice.patients?.first_name} ${invoice.patients?.last_name}`,
        description: `$${invoice.amount} • ${invoice.status}`,
        url: `/invoices/${invoice.id}`,
        metadata: {
          status: invoice.status,
          amount: invoice.amount,
          dueDate: invoice.due_date,
          patientId: invoice.patient_id,
          treatmentId: invoice.treatment_id
        },
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }));

      results.push(...invoiceSearchResults);
      resultsByType.invoice = invoiceSearchResults;
    }

    // Search treatments
    if (types.includes('treatment')) {
      const treatmentResults = await this.searchTreatments(query, clinicId, dateRange, limit);
      results.push(...treatmentResults);
      resultsByType.treatment = treatmentResults;
    }

    // Search users
    if (types.includes('user')) {
      const userResults = await this.searchUsers(query, clinicId, limit);
      results.push(...userResults);
      resultsByType.user = userResults;
    }

    // Sort results
    const sortedResults = this.sortResults(results, sortBy, sortOrder);

    // Generate facets
    const facets = this.generateFacets(results);

    return {
      results: sortedResults,
      totalCount: results.length,
      resultsByType,
      facets
    };
  }

  /**
   * Search treatments
   */
  private async searchTreatments(
    query: string,
    clinicId?: string,
    dateRange?: { start: string; end: string },
    limit: number = 25
  ): Promise<SearchResult[]> {
    try {
      let supabaseQuery = supabase
        .from('treatments')
        .select(`
          *,
          patients (id, first_name, last_name, clinic_id)
        `);

      if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (clinicId) {
        supabaseQuery = supabaseQuery.eq('patients.clinic_id', clinicId);
      }

      if (dateRange) {
        supabaseQuery = supabaseQuery
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end);
      }

      supabaseQuery = supabaseQuery.limit(limit);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return (data || []).map(treatment => ({
        id: treatment.id,
        type: 'treatment' as SearchEntityType,
        title: treatment.name,
        subtitle: `${treatment.patients?.first_name} ${treatment.patients?.last_name}`,
        description: `$${treatment.cost} • ${treatment.status}`,
        url: `/treatments/${treatment.id}`,
        metadata: {
          status: treatment.status,
          cost: treatment.cost,
          patientId: treatment.patient_id,
          startDate: treatment.start_date,
          completionDate: treatment.completion_date
        },
        createdAt: treatment.created_at,
        updatedAt: treatment.updated_at
      }));
    } catch (error) {
      console.error('Error searching treatments:', error);
      return [];
    }
  }

  /**
   * Search users
   */
  private async searchUsers(
    query: string,
    clinicId?: string,
    limit: number = 25
  ): Promise<SearchResult[]> {
    try {
      let supabaseQuery = supabase
        .from('users')
        .select(`
          *,
          clinic_memberships (clinic_id, role, is_active)
        `);

      if (query) {
        supabaseQuery = supabaseQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
      }

      if (clinicId) {
        supabaseQuery = supabaseQuery.eq('clinic_memberships.clinic_id', clinicId);
      }

      supabaseQuery = supabaseQuery.limit(limit);

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return (data || []).map(user => ({
        id: user.id,
        type: 'user' as SearchEntityType,
        title: `${user.first_name} ${user.last_name}`,
        subtitle: user.role,
        description: user.phone || '',
        url: `/users/${user.id}`,
        metadata: {
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatar_url
        },
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[],
    sortBy: 'relevance' | 'date' | 'alphabetical',
    sortOrder: 'asc' | 'desc'
  ): SearchResult[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'alphabetical':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Generate search facets
   */
  private generateFacets(results: SearchResult[]) {
    const types = new Map<SearchEntityType, number>();
    const statuses = new Map<string, number>();
    const dateRanges = new Map<string, number>();

    results.forEach(result => {
      // Count by type
      types.set(result.type, (types.get(result.type) || 0) + 1);

      // Count by status
      if (result.metadata?.status) {
        statuses.set(result.metadata.status, (statuses.get(result.metadata.status) || 0) + 1);
      }

      // Count by date range (simplified)
      const date = new Date(result.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      let range = 'Older';
      if (daysDiff <= 7) range = 'Last week';
      else if (daysDiff <= 30) range = 'Last month';
      else if (daysDiff <= 90) range = 'Last 3 months';
      
      dateRanges.set(range, (dateRanges.get(range) || 0) + 1);
    });

    return {
      types: Array.from(types.entries()).map(([type, count]) => ({ type, count })),
      statuses: Array.from(statuses.entries()).map(([status, count]) => ({ status, count })),
      dateRanges: Array.from(dateRanges.entries()).map(([range, count]) => ({ range, count }))
    };
  }
}

export const searchService = new SearchService();
export default searchService;
