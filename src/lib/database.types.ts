export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      consent_records: {
        Row: {
          id: string
          user_id: string | null
          patient_id: string | null
          consent_type: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at: string | null
          withdrawn_at: string | null
          ip_address: string | null
          user_agent: string | null
          consent_text: string | null
          version: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          consent_type: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status?: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at?: string | null
          withdrawn_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          consent_text?: string | null
          version?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          consent_type?: 'cookies' | 'analytics' | 'marketing' | 'data_processing' | 'third_party_sharing'
          status?: 'granted' | 'denied' | 'pending' | 'withdrawn'
          granted_at?: string | null
          withdrawn_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          consent_text?: string | null
          version?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      data_subject_requests: {
        Row: {
          id: string
          request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email: string
          requester_name: string | null
          patient_id: string | null
          user_id: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description: string | null
          verification_token: string | null
          verified_at: string | null
          processed_by: string | null
          processed_at: string | null
          response_data: Json | null
          notes: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email: string
          requester_name?: string | null
          patient_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description?: string | null
          verification_token?: string | null
          verified_at?: string | null
          processed_by?: string | null
          processed_at?: string | null
          response_data?: Json | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_type?: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
          requester_email?: string
          requester_name?: string | null
          patient_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'rejected'
          description?: string | null
          verification_token?: string | null
          verified_at?: string | null
          processed_by?: string | null
          processed_at?: string | null
          response_data?: Json | null
          notes?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      compliance_audit_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          action: string
          resource_type: string
          resource_id: string
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          location: Json | null
          risk_level: string | null
          compliance_flags: string[] | null
          retention_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          action: string
          resource_type: string
          resource_id: string
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_level?: string | null
          compliance_flags?: string[] | null
          retention_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          location?: Json | null
          risk_level?: string | null
          compliance_flags?: string[] | null
          retention_date?: string | null
          created_at?: string
        }
      }
      data_retention_policies: {
        Row: {
          id: string
          name: string
          description: string | null
          table_name: string
          retention_period_days: number
          action: 'archive' | 'anonymize' | 'delete'
          conditions: Json
          is_active: boolean | null
          legal_basis: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          table_name: string
          retention_period_days: number
          action?: 'archive' | 'anonymize' | 'delete'
          conditions?: Json
          is_active?: boolean | null
          legal_basis?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          table_name?: string
          retention_period_days?: number
          action?: 'archive' | 'anonymize' | 'delete'
          conditions?: Json
          is_active?: boolean | null
          legal_basis?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      privacy_settings: {
        Row: {
          id: string
          user_id: string | null
          patient_id: string | null
          data_processing_consent: boolean | null
          marketing_consent: boolean | null
          analytics_consent: boolean | null
          third_party_sharing_consent: boolean | null
          profile_visibility: string | null
          data_export_format: string | null
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          data_processing_consent?: boolean | null
          marketing_consent?: boolean | null
          analytics_consent?: boolean | null
          third_party_sharing_consent?: boolean | null
          profile_visibility?: string | null
          data_export_format?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          patient_id?: string | null
          data_processing_consent?: boolean | null
          marketing_consent?: boolean | null
          analytics_consent?: boolean | null
          third_party_sharing_consent?: boolean | null
          profile_visibility?: string | null
          data_export_format?: string | null
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          name: string
          type: 'general' | 'orthodontics' | 'oral_surgery' | 'pediatric' | 'cosmetic' | 'periodontics' | 'endodontics'
          description: string | null
          address: string
          city: string
          postal_code: string | null
          country: string
          phone: string
          email: string
          website: string | null
          logo_url: string | null
          license_number: string | null
          tax_id: string | null
          settings: Json
          working_hours: Json
          timezone: string
          is_active: boolean
          owner_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: 'general' | 'orthodontics' | 'oral_surgery' | 'pediatric' | 'cosmetic' | 'periodontics' | 'endodontics'
          description?: string | null
          address: string
          city: string
          postal_code?: string | null
          country?: string
          phone: string
          email: string
          website?: string | null
          logo_url?: string | null
          license_number?: string | null
          tax_id?: string | null
          settings?: Json
          working_hours?: Json
          timezone?: string
          is_active?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'general' | 'orthodontics' | 'oral_surgery' | 'pediatric' | 'cosmetic' | 'periodontics' | 'endodontics'
          description?: string | null
          address?: string
          city?: string
          postal_code?: string | null
          country?: string
          phone?: string
          email?: string
          website?: string | null
          logo_url?: string | null
          license_number?: string | null
          tax_id?: string | null
          settings?: Json
          working_hours?: Json
          timezone?: string
          is_active?: boolean
          owner_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      clinic_memberships: {
        Row: {
          id: string
          user_id: string | null
          clinic_id: string | null
          role: 'admin' | 'dentist' | 'staff' | 'billing'
          permissions: Json
          is_active: boolean
          joined_at: string
          left_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          clinic_id?: string | null
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          permissions?: Json
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          clinic_id?: string | null
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          permissions?: Json
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      users: {
        Row: {
          id: string
          role: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          default_clinic_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          default_clinic_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'dentist' | 'staff' | 'billing'
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          default_clinic_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clinic_resources: {
        Row: {
          id: string
          clinic_id: string | null
          name: string
          type: 'equipment' | 'room' | 'staff' | 'material' | 'service'
          description: string | null
          specifications: Json
          location: string | null
          capacity: number | null
          cost_per_hour: number | null
          cost_per_use: number | null
          availability_schedule: Json
          maintenance_schedule: Json
          is_available: boolean
          is_shareable: boolean
          sharing_terms: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          clinic_id?: string | null
          name: string
          type: 'equipment' | 'room' | 'staff' | 'material' | 'service'
          description?: string | null
          specifications?: Json
          location?: string | null
          capacity?: number | null
          cost_per_hour?: number | null
          cost_per_use?: number | null
          availability_schedule?: Json
          maintenance_schedule?: Json
          is_available?: boolean
          is_shareable?: boolean
          sharing_terms?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string | null
          name?: string
          type?: 'equipment' | 'room' | 'staff' | 'material' | 'service'
          description?: string | null
          specifications?: Json
          location?: string | null
          capacity?: number | null
          cost_per_hour?: number | null
          cost_per_use?: number | null
          availability_schedule?: Json
          maintenance_schedule?: Json
          is_available?: boolean
          is_shareable?: boolean
          sharing_terms?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      resource_sharing: {
        Row: {
          id: string
          resource_id: string | null
          requesting_clinic_id: string | null
          providing_clinic_id: string | null
          requested_by: string | null
          approved_by: string | null
          start_time: string
          end_time: string
          status: 'available' | 'requested' | 'approved' | 'in_use' | 'returned' | 'declined'
          cost: number | null
          terms: string | null
          notes: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          returned_at: string | null
        }
        Insert: {
          id?: string
          resource_id?: string | null
          requesting_clinic_id?: string | null
          providing_clinic_id?: string | null
          requested_by?: string | null
          approved_by?: string | null
          start_time: string
          end_time: string
          status?: 'available' | 'requested' | 'approved' | 'in_use' | 'returned' | 'declined'
          cost?: number | null
          terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          returned_at?: string | null
        }
        Update: {
          id?: string
          resource_id?: string | null
          requesting_clinic_id?: string | null
          providing_clinic_id?: string | null
          requested_by?: string | null
          approved_by?: string | null
          start_time?: string
          end_time?: string
          status?: 'available' | 'requested' | 'approved' | 'in_use' | 'returned' | 'declined'
          cost?: number | null
          terms?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          returned_at?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          clinic_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string
          date_of_birth: string | null
          gender: string | null
          address: string | null
          city: string | null
          insurance_provider: string | null
          insurance_number: string | null
          medical_history: Json
          notes: string | null
          status: string
          risk_level: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          clinic_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone: string
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          city?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          medical_history?: Json
          notes?: string | null
          status?: string
          risk_level?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string
          date_of_birth?: string | null
          gender?: string | null
          address?: string | null
          city?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          medical_history?: Json
          notes?: string | null
          status?: string
          risk_level?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string | null
          patient_id: string
          dentist_id: string | null
          start_time: string
          end_time: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id: string | null
          notes: string | null
          reminder_sent: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          clinic_id?: string | null
          patient_id: string
          dentist_id?: string | null
          start_time: string
          end_time: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id?: string | null
          notes?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string | null
          patient_id?: string
          dentist_id?: string | null
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          treatment_id?: string | null
          notes?: string | null
          reminder_sent?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      treatments: {
        Row: {
          id: string
          patient_id: string
          name: string
          description: string | null
          cost: number
          status: string
          start_date: string | null
          completion_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          name: string
          description?: string | null
          cost: number
          status?: string
          start_date?: string | null
          completion_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          name?: string
          description?: string | null
          cost?: number
          status?: string
          start_date?: string | null
          completion_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          patient_id: string
          treatment_id: string | null
          amount: number
          status: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date: string
          payment_method: string | null
          stripe_payment_intent_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          treatment_id?: string | null
          amount: number
          status?: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date: string
          payment_method?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          treatment_id?: string | null
          amount?: number
          status?: 'pending' | 'partial' | 'completed' | 'refunded'
          due_date?: string
          payment_method?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          type: string
          status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date: string | null
          end_date: string | null
          target_criteria: Json
          message_template: Json
          metrics: Json
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: string
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          target_criteria?: Json
          message_template: Json
          metrics?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: string
          status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
          start_date?: string | null
          end_date?: string | null
          target_criteria?: Json
          message_template?: Json
          metrics?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'dentist' | 'staff' | 'billing'
      appointment_status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
      payment_status: 'pending' | 'partial' | 'completed' | 'refunded'
      campaign_status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'
      clinic_type: 'general' | 'orthodontics' | 'oral_surgery' | 'pediatric' | 'cosmetic' | 'periodontics' | 'endodontics'
      resource_type: 'equipment' | 'room' | 'staff' | 'material' | 'service'
      sharing_status: 'available' | 'requested' | 'approved' | 'in_use' | 'returned' | 'declined'
    }
  }
}